/**
 * Teacher Analytics & Reports Module
 * منصة السراج – مدرسة أبو عبيدة
 * Comprehensive academic reporting, leaderboards, and CSV exports for Excel.
 */

import { initTeacherAdmin, escapeHtml, formatDate } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let competitionAttemptsData = [];
let researchEvaluationsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('analytics');
    setupEvents();
    await loadAnalytics();
  } catch (err) {
    console.error('Analytics module init error:', err);
  }
});

function setupEvents() {
  const btnExportComp = document.getElementById('btn-export-competitions');
  const btnExportRes = document.getElementById('btn-export-research');

  if (btnExportComp) btnExportComp.addEventListener('click', exportCompetitionsCSV);
  if (btnExportRes) btnExportRes.addEventListener('click', exportResearchCSV);
}

async function loadAnalytics() {
  try {
    // 1. Fetch KPI counts
    const [attRes, progRes, evalRes, profilesRes] = await Promise.all([
      // Competition attempts
      supabase
        .from('competition_attempts')
        .select(`
          id, score, started_at, completed_at, status,
          competitions:competition_id ( title ),
          profiles:student_id ( full_name, grade, section )
        `)
        .order('completed_at', { ascending: false }),

      // Reading progress
      supabase
        .from('student_progress')
        .select('id, is_completed, score')
        .eq('is_completed', true),

      // Research evaluations
      supabase
        .from('research_evaluations')
        .select(`
          id, total_score, criteria_scores, notes, evaluated_at,
          research_submissions:submission_id (
            title, field, guest_name, guest_grade, guest_section,
            profiles:student_id ( full_name, grade, section )
          )
        `),

      // Student profiles for leaderboard & grade distribution
      supabase
        .from('profiles')
        .select('id, full_name, role, grade, section, points, total_points')
        .order('points', { ascending: false })
    ]);

    competitionAttemptsData = attRes.data || [];
    researchEvaluationsData = evalRes.data || [];
    const completedProgress = progRes.data || [];
    const allProfiles = profilesRes.data || [];

    // Render KPIs
    const totalAttempts = competitionAttemptsData.length;
    const avgCompScore = totalAttempts > 0
      ? (competitionAttemptsData.reduce((acc, a) => acc + (a.score || 0), 0) / totalAttempts).toFixed(1)
      : '0';

    const totalCompletedLevels = completedProgress.length;

    const totalEvaluatedRes = researchEvaluationsData.length;
    const avgResScore = totalEvaluatedRes > 0
      ? (researchEvaluationsData.reduce((acc, e) => acc + (e.total_score || 0), 0) / totalEvaluatedRes).toFixed(1)
      : '0';

    const studentProfiles = allProfiles.filter(p => p.role !== 'teacher' && p.role !== 'admin');
    const activeStudentCount = studentProfiles.length;

    document.getElementById('an-total-attempts').textContent = totalAttempts;
    document.getElementById('an-avg-comp-score').textContent = `متوسط درجات المحاولات: ${avgCompScore}`;

    document.getElementById('an-completed-levels').textContent = totalCompletedLevels;

    document.getElementById('an-evaluated-res').textContent = totalEvaluatedRes;
    document.getElementById('an-avg-res-score').textContent = `متوسط درجات الأبحاث: ${avgResScore} / 100`;

    document.getElementById('an-active-students').textContent = activeStudentCount;

    // Render Leaderboard
    renderLeaderboard(studentProfiles.slice(0, 10));

    // Render Grade Distribution
    renderGradeDistribution(studentProfiles);

    // Render Recent Results
    renderRecentResults(competitionAttemptsData.slice(0, 10));

  } catch (err) {
    console.error('Error fetching analytics data:', err);
    Toast.error('تعذر تحميل بعض البيانات التحليلية: ' + err.message);
  }
}

function renderLeaderboard(topStudents) {
  const tbody = document.getElementById('an-leaderboard-body');
  if (!tbody) return;

  if (topStudents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--color-text-muted);">لا توجد بيانات طلاب بعد.</td></tr>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  tbody.innerHTML = topStudents.map((st, i) => {
    const rank = i < 3 ? medals[i] : `${i + 1}`;
    const gradeText = st.grade ? `الصف ${escapeHtml(String(st.grade))} ${st.section ? `(${st.section})` : ''}` : '-';

    return `
      <tr>
        <td>
          <span style="font-size: 1.1rem; margin-left: 0.5rem; display: inline-block; width: 24px; text-align: center;">${rank}</span>
          <strong style="color: var(--color-text);">${escapeHtml(st.full_name || 'طالب مجهول')}</strong>
        </td>
        <td style="color: var(--color-text-muted); font-size: 0.88rem;">${gradeText}</td>
        <td>
          <strong style="color: var(--color-primary); font-size: 1rem;">${st.points || st.total_points || 0}</strong> نقطة
        </td>
      </tr>
    `;
  }).join('');
}

function renderGradeDistribution(students) {
  const container = document.getElementById('an-grade-bars');
  if (!container) return;

  const counts = { '10': 0, '11': 0, '12': 0, 'other': 0 };

  students.forEach(st => {
    const g = String(st.grade || '');
    if (g.includes('10') || g.includes('عاشر')) counts['10']++;
    else if (g.includes('11') || g.includes('حادي')) counts['11']++;
    else if (g.includes('12') || g.includes('ثاني')) counts['12']++;
    else counts['other']++;
  });

  const total = students.length || 1;

  const gradesMeta = [
    { label: 'الصف العاشر', count: counts['10'], color: '#4f46e5' },
    { label: 'الصف الحادي عشر', count: counts['11'], color: '#06b6d4' },
    { label: 'الصف الثاني عشر', count: counts['12'], color: '#10b981' },
    { label: 'صفوف أو زوار آخرون', count: counts['other'], color: '#9ca3af' }
  ];

  container.innerHTML = gradesMeta.map(item => {
    const pct = Math.round((item.count / total) * 100);
    return `
      <div>
        <div class="flex justify-between" style="font-size: 0.88rem; margin-bottom: 0.35rem;">
          <span style="font-weight: 600;">${item.label}</span>
          <span><strong>${item.count}</strong> طالب (${pct}%)</span>
        </div>
        <div style="background: var(--color-bg-alt); height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: ${item.color}; width: ${pct}%; height: 100%; border-radius: 4px; transition: width 0.6s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentResults(recentAttempts) {
  const tbody = document.getElementById('an-recent-results-body');
  if (!tbody) return;

  if (recentAttempts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">لا توجد نتائج مسابقات بعد.</td></tr>';
    return;
  }

  tbody.innerHTML = recentAttempts.map(a => {
    const compTitle = a.competitions?.title || 'مسابقة عامة';
    const stName = a.profiles?.full_name || 'طالب مجهول';
    const grade = a.profiles?.grade ? `الصف ${a.profiles.grade}` : '-';

    return `
      <tr>
        <td><strong>${escapeHtml(compTitle)}</strong></td>
        <td>${escapeHtml(stName)}</td>
        <td style="color: var(--color-text-muted);">${escapeHtml(grade)}</td>
        <td>
          <strong style="color: var(--color-primary); font-size: 1rem;">${a.score || 0}</strong> نقطة
        </td>
        <td style="font-size: 0.85rem; color: var(--color-text-muted);">
          ${formatDate(a.completed_at || a.started_at)}
        </td>
      </tr>
    `;
  }).join('');
}

function exportCompetitionsCSV() {
  if (competitionAttemptsData.length === 0) {
    Toast.warning('لا توجد بيانات مسابقات لتصديرها');
    return;
  }

  const headers = ['اسم المسابقة', 'اسم الطالب', 'الصف', 'الشعبة', 'الدرجة', 'الحالة', 'تاريخ الإنجاز'];
  const rows = competitionAttemptsData.map(a => [
    `"${(a.competitions?.title || '').replace(/"/g, '""')}"`,
    `"${(a.profiles?.full_name || '').replace(/"/g, '""')}"`,
    `"${(a.profiles?.grade || '').replace(/"/g, '""')}"`,
    `"${(a.profiles?.section || '').replace(/"/g, '""')}"`,
    a.score || 0,
    `"${(a.status || '').replace(/"/g, '""')}"`,
    `"${formatDate(a.completed_at || a.started_at)}"`
  ]);

  downloadCSV('نتائج_مسابقات_سراج.csv', headers, rows);
}

function exportResearchCSV() {
  if (researchEvaluationsData.length === 0) {
    Toast.warning('لا توجد أبحاث علمية محكمة لتصديرها');
    return;
  }

  const headers = ['عنوان البحث', 'المجال', 'الباحث', 'الصف', 'الشعبة', 'الدرجة الكلية (100)', 'ملاحظات المحكم', 'تاريخ التحكيم'];
  const rows = researchEvaluationsData.map(e => {
    const sub = e.research_submissions || {};
    const stName = sub.profiles?.full_name || sub.guest_name || '';
    const grade = sub.profiles?.grade || sub.guest_grade || '';
    const section = sub.profiles?.section || sub.guest_section || '';

    return [
      `"${(sub.title || '').replace(/"/g, '""')}"`,
      `"${(sub.field || '').replace(/"/g, '""')}"`,
      `"${stName.replace(/"/g, '""')}"`,
      `"${grade.replace(/"/g, '""')}"`,
      `"${section.replace(/"/g, '""')}"`,
      e.total_score || 0,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${formatDate(e.evaluated_at)}"`
    ];
  });

  downloadCSV('كشف_تحكيم_أبحاث_سراج.csv', headers, rows);
}

function downloadCSV(filename, headers, rows) {
  // UTF-8 BOM (\uFEFF) to ensure Arabic characters display properly in MS Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  Toast.success(`تم تصدير ملف «${filename}» بنجاح`);
}
