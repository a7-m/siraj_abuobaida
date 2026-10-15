/**
 * Teacher Reports & Academic Analytics Module
 * منصة السراج – مدرسة أبو عبيدة بن الجراح
 * Handles period filtering, KPI calculations from Supabase live data,
 * interactive Chart.js visualizations, top 10 students, top 3 sections,
 * and high-fidelity print, PDF & CSV export.
 */

import { initTeacherAdmin, escapeHtml, formatDate } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

// Global state
let currentTeacher = null;
let allRawData = {
  competitionAttempts: [],
  studentProgress: [],
  researchSubmissions: [],
  contentPages: [],
  profiles: [],
  schoolSections: [],
  questionsCount: 0
};

let normalizedRecords = [];
let filteredRecords = [];

// Filter state
let activePreset = '30days';
let startDate = null;
let endDate = null;
let selectedActivity = 'all';
let selectedGrade = 'all';
let selectedSection = 'all';

// Audit log state
let logSearchTerm = '';
let auditCurrentPage = 1;
const auditPageSize = 10;

// Chart instances
let chartTimelineInstance = null;
let chartDonutInstance = null;
let chartComparisonInstance = null;
let chartGradesInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const adminData = await initTeacherAdmin('reports');
    currentTeacher = adminData.profile;

    // Update teacher names in print header
    const printTeacherEl = document.getElementById('print-teacher-name');
    if (printTeacherEl) {
      printTeacherEl.textContent = currentTeacher?.full_name || 'المعلم';
    }

    setupEvents();
    initDatePresets();
    await fetchAllPlatformData();
    applyFiltersAndRender();

  } catch (err) {
    console.error('Reports module initialization error:', err);
    showErrorState('فشل تهيئة وحدة التقارير: ' + err.message);
  }
});

/**
 * Bind UI controls and events
 */
function setupEvents() {
  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePreset = btn.getAttribute('data-preset');
      applyPresetDates(activePreset);
      applyFiltersAndRender();
    });
  });

  // Date inputs
  const startDateInput = document.getElementById('filter-start-date');
  const endDateInput = document.getElementById('filter-end-date');

  if (startDateInput) {
    startDateInput.addEventListener('change', (e) => {
      startDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
      clearActivePresetHighlight();
      applyFiltersAndRender();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener('change', (e) => {
      endDate = e.target.value ? new Date(e.target.value + 'T23:59:59') : null;
      clearActivePresetHighlight();
      applyFiltersAndRender();
    });
  }

  // Select dropdowns
  const activitySelect = document.getElementById('filter-activity');
  if (activitySelect) {
    activitySelect.addEventListener('change', (e) => {
      selectedActivity = e.target.value;
      applyFiltersAndRender();
    });
  }

  const gradeSelect = document.getElementById('filter-grade');
  if (gradeSelect) {
    gradeSelect.addEventListener('change', (e) => {
      selectedGrade = e.target.value;
      populateSectionDropdown();
      applyFiltersAndRender();
    });
  }

  const sectionSelect = document.getElementById('filter-section');
  if (sectionSelect) {
    sectionSelect.addEventListener('change', (e) => {
      selectedSection = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Reset filters button
  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetFilters();
      Toast.info('تمت إعادة ضبط فلاتر التقرير');
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh-report');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'جاري التحديث...';
      await fetchAllPlatformData();
      applyFiltersAndRender();
      Toast.success('تم تحديث بيانات التقرير بنجاح');
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 تحديث';
    });
  }

  // Print button
  const printBtn = document.getElementById('btn-print-report');
  if (printBtn) {
    printBtn.addEventListener('click', handlePrintReport);
  }

  // Save PDF button
  const pdfBtn = document.getElementById('btn-save-pdf');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', handleSavePdf);
  }

  // Export CSV button
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportFullReportCSV);
  }

  // Audit log search & pagination
  const logSearchInput = document.getElementById('filter-log-search');
  if (logSearchInput) {
    logSearchInput.addEventListener('input', (e) => {
      logSearchTerm = e.target.value.trim().toLowerCase();
      auditCurrentPage = 1;
      renderAuditLogTable();
    });
  }

  const prevBtn = document.getElementById('btn-audit-prev');
  const nextBtn = document.getElementById('btn-audit-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (auditCurrentPage > 1) {
        auditCurrentPage--;
        renderAuditLogTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      auditCurrentPage++;
      renderAuditLogTable();
    });
  }

  const retryBtn = document.getElementById('btn-retry-loading');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      hideErrorState();
      await fetchAllPlatformData();
      applyFiltersAndRender();
    });
  }
}

/**
 * Configure preset date ranges
 */
function initDatePresets() {
  applyPresetDates('30days');
}

function clearActivePresetHighlight() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
}

function applyPresetDates(preset) {
  const now = new Date();
  const startDateInput = document.getElementById('filter-start-date');
  const endDateInput = document.getElementById('filter-end-date');

  let s = new Date(now);
  let e = new Date(now);

  if (preset === '7days') {
    s.setDate(now.getDate() - 7);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
  } else if (preset === '30days') {
    s.setDate(now.getDate() - 30);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
  } else if (preset === 'this-month') {
    s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
  } else if (preset === 'all') {
    s = new Date('2024-01-01T00:00:00');
    e = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
  }

  startDate = s;
  endDate = e;

  if (startDateInput && preset !== 'all') {
    startDateInput.value = formatInputDate(startDate);
  } else if (startDateInput && preset === 'all') {
    startDateInput.value = '';
  }

  if (endDateInput && preset !== 'all') {
    endDateInput.value = formatInputDate(endDate);
  } else if (endDateInput && preset === 'all') {
    endDateInput.value = '';
  }
}

function formatInputDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resetFilters() {
  activePreset = '30days';
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-preset') === '30days');
  });

  applyPresetDates('30days');

  selectedActivity = 'all';
  selectedGrade = 'all';
  selectedSection = 'all';
  logSearchTerm = '';
  auditCurrentPage = 1;

  const activitySelect = document.getElementById('filter-activity');
  const gradeSelect = document.getElementById('filter-grade');
  const sectionSelect = document.getElementById('filter-section');
  const searchInput = document.getElementById('filter-log-search');

  if (activitySelect) activitySelect.value = 'all';
  if (gradeSelect) gradeSelect.value = 'all';
  if (sectionSelect) sectionSelect.value = 'all';
  if (searchInput) searchInput.value = '';

  populateSectionDropdown();
  applyFiltersAndRender();
}

/**
 * Fetch all platform datasets from Supabase
 */
async function fetchAllPlatformData() {
  showLoadingState();

  try {
    const [
      compRes,
      progRes,
      resSubRes,
      contentRes,
      profilesRes,
      sectionsRes,
      questionsRes
    ] = await Promise.all([
      // 1. Competition attempts
      supabase
        .from('competition_attempts')
        .select(`
          id, student_id, competition_id, status, total_score, started_at, submitted_at,
          guest_name, guest_grade, guest_section, guest_school_type, guest_school_name,
          competitions ( id, title ),
          profiles ( id, full_name, grade, section, school_name, school_type, email )
        `)
        .order('submitted_at', { ascending: false, nullsFirst: false }),

      // 2. Reading challenges progress
      supabase
        .from('student_progress')
        .select(`
          id, student_id, challenge_level_id, status, score, completed_at,
          guest_name, guest_grade, guest_section, guest_school_type, guest_school_name,
          challenge_levels ( id, title, level_number, challenges ( id, title ) ),
          profiles ( id, full_name, grade, section, school_name, school_type, email )
        `)
        .order('completed_at', { ascending: false, nullsFirst: false }),

      // 3. Research submissions
      supabase
        .from('research_submissions')
        .select(`
          id, student_id, title, summary, field, status, submitted_at,
          guest_name, guest_grade, guest_section, guest_email,
          profiles ( id, full_name, grade, section, school_name, school_type, email ),
          research_evaluations ( id, total_score, evaluated_at )
        `)
        .order('submitted_at', { ascending: false, nullsFirst: false }),

      // 4. Content pages
      supabase
        .from('content_pages')
        .select('id, slug, title, status, created_at, updated_at')
        .order('created_at', { ascending: false }),

      // 5. Profiles (students)
      supabase
        .from('profiles')
        .select('id, full_name, grade, section, role, created_at, points')
        .eq('role', 'student'),

      // 6. School sections
      supabase
        .from('school_sections')
        .select('id, grade, section_name, is_active, sort_order')
        .order('sort_order', { ascending: true }),

      // 7. Questions count
      supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
    ]);

    if (compRes.error) throw new Error('فشل جلب محاولات المسابقات: ' + compRes.error.message);
    if (progRes.error) throw new Error('فشل جلب تقدم القراءة: ' + progRes.error.message);
    if (resSubRes.error) throw new Error('فشل جلب الأبحاث العلمية: ' + resSubRes.error.message);

    allRawData.competitionAttempts = compRes.data || [];
    allRawData.studentProgress = progRes.data || [];
    allRawData.researchSubmissions = resSubRes.data || [];
    allRawData.contentPages = contentRes.data || [];
    allRawData.profiles = profilesRes.data || [];
    allRawData.schoolSections = sectionsRes.data || [];
    allRawData.questionsCount = questionsRes.count || 0;

    // Normalize all records into a single unified timeline
    normalizeAllRecords();

    // Populate Section dropdown
    populateSectionDropdown();

    hideLoadingState();

  } catch (err) {
    console.error('Error fetching platform data:', err);
    showErrorState(err.message);
  }
}

/**
 * Normalize attempts, progress and research into unified records
 */
function normalizeAllRecords() {
  normalizedRecords = [];

  // Competitions
  allRawData.competitionAttempts.forEach(ca => {
    const isGuest = !ca.student_id;
    const name = ca.profiles?.full_name || ca.guest_name || 'طالب زائر';
    const grade = ca.profiles?.grade || ca.guest_grade || '';
    const section = ca.profiles?.section || ca.guest_section || '';
    const dateRaw = ca.submitted_at || ca.started_at;
    const date = dateRaw ? new Date(dateRaw) : new Date();
    const isCompleted = ca.status === 'submitted';

    normalizedRecords.push({
      id: ca.id,
      activityType: 'competition',
      activityTypeLabel: 'مسابقة السراج',
      activityTitle: ca.competitions?.title || 'مسابقة السراج',
      participantName: name,
      participantType: isGuest ? 'زائر' : 'مسجل',
      isGuest,
      studentId: ca.student_id,
      grade,
      section,
      date,
      dateFormatted: formatDate(dateRaw),
      status: ca.status,
      statusLabel: isCompleted ? 'مكتملة' : 'قيد المحاولة',
      score: typeof ca.total_score === 'number' ? ca.total_score : 0,
      isCompleted
    });
  });

  // Reading challenges
  allRawData.studentProgress.forEach(sp => {
    const isGuest = !sp.student_id;
    const name = sp.profiles?.full_name || sp.guest_name || 'طالب زائر';
    const grade = sp.profiles?.grade || sp.guest_grade || '';
    const section = sp.profiles?.section || sp.guest_section || '';
    const dateRaw = sp.completed_at;
    const date = dateRaw ? new Date(dateRaw) : new Date();
    const isCompleted = sp.status === 'completed';

    const challengeTitle = sp.challenge_levels?.challenges?.title || 'طوّر نفسك';
    const levelTitle = sp.challenge_levels?.title ? `${challengeTitle} (${sp.challenge_levels.title})` : challengeTitle;

    normalizedRecords.push({
      id: sp.id,
      activityType: 'reading',
      activityTypeLabel: 'تحدي القراءة',
      activityTitle: levelTitle,
      participantName: name,
      participantType: isGuest ? 'زائر' : 'مسجل',
      isGuest,
      studentId: sp.student_id,
      grade,
      section,
      date,
      dateFormatted: formatDate(dateRaw),
      status: sp.status,
      statusLabel: isCompleted ? 'مكتمل' : 'قيد التقدم',
      score: typeof sp.score === 'number' ? sp.score : 0,
      isCompleted
    });
  });

  // Research submissions
  allRawData.researchSubmissions.forEach(rs => {
    const isGuest = !rs.student_id;
    const name = rs.profiles?.full_name || rs.guest_name || 'طالب زائر';
    const grade = rs.profiles?.grade || rs.guest_grade || '';
    const section = rs.profiles?.section || rs.guest_section || '';
    const dateRaw = rs.submitted_at;
    const date = dateRaw ? new Date(dateRaw) : new Date();

    const evaluation = rs.research_evaluations?.[0];
    const isEvaluated = rs.status === 'evaluated' || (evaluation && typeof evaluation.total_score === 'number');
    const score = evaluation?.total_score ?? null;

    let statusLabel = 'تم التسليم';
    if (rs.status === 'under_review') statusLabel = 'قيد التحكيم';
    if (isEvaluated) statusLabel = 'تم التقييم';

    normalizedRecords.push({
      id: rs.id,
      activityType: 'research',
      activityTypeLabel: 'البحث العلمي',
      activityTitle: rs.title || 'بحث علمي',
      participantName: name,
      participantType: isGuest ? 'زائر' : 'مسجل',
      isGuest,
      studentId: rs.student_id,
      grade,
      section,
      date,
      dateFormatted: formatDate(dateRaw),
      status: rs.status,
      statusLabel,
      score,
      isCompleted: isEvaluated
    });
  });

  // Sort by date descending
  normalizedRecords.sort((a, b) => b.date - a.date);
}

/**
 * Populate dynamic sections in filter dropdown
 */
function populateSectionDropdown() {
  const sectionSelect = document.getElementById('filter-section');
  if (!sectionSelect) return;

  const currentVal = sectionSelect.value;
  sectionSelect.innerHTML = '<option value="all">كافة الشعب</option>';

  // Collect unique sections from school_sections and normalized records
  const sectionSet = new Set();

  allRawData.schoolSections.forEach(s => {
    if (selectedGrade === 'all' || s.grade === selectedGrade || normalizeGrade(s.grade) === normalizeGrade(selectedGrade)) {
      if (s.section_name) sectionSet.add(s.section_name);
    }
  });

  normalizedRecords.forEach(r => {
    if (r.section && (selectedGrade === 'all' || r.grade === selectedGrade || normalizeGrade(r.grade) === normalizeGrade(selectedGrade))) {
      sectionSet.add(r.section);
    }
  });

  Array.from(sectionSet).sort().forEach(sec => {
    const opt = document.createElement('option');
    opt.value = sec;
    opt.textContent = `شعبة ${sec}`;
    if (sec === currentVal) opt.selected = true;
    sectionSelect.appendChild(opt);
  });
}

function normalizeGrade(g) {
  if (!g) return '';
  const str = String(g).trim();
  if (str.includes('10') || str.includes('عاشر')) return '10';
  if (str.includes('11') || str.includes('حادي')) return '11';
  if (str.includes('12') || str.includes('ثاني')) return '12';
  return str;
}

/**
 * Filter and compute all report metrics
 */
function applyFiltersAndRender() {
  filteredRecords = normalizedRecords.filter(r => {
    // 1. Date filter
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;

    // 2. Activity filter
    if (selectedActivity !== 'all' && r.activityType !== selectedActivity) return false;

    // 3. Grade filter
    if (selectedGrade !== 'all') {
      if (normalizeGrade(r.grade) !== normalizeGrade(selectedGrade)) return false;
    }

    // 4. Section filter
    if (selectedSection !== 'all') {
      if (r.section !== selectedSection) return false;
    }

    return true;
  });

  // Calculate metrics
  const metrics = calculateMetrics(filteredRecords);

  // Update UI components
  renderSummaryBar(metrics);
  renderDomainMetricCards(metrics);
  renderCharts(filteredRecords, metrics);
  renderTopSectionsPodium(metrics.sectionsRanked);
  renderTopStudentsTable(metrics.studentsRanked);
  renderAuditLogTable();
  updatePrintHeaderInfo();
}

/**
 * Compute detailed analytics matching requirements
 */
function calculateMetrics(records) {
  // Participants
  const totalParticipations = records.length;
  const uniqueStudentsMap = new Map();
  let registeredCount = 0;
  let guestCount = 0;

  records.forEach(r => {
    const key = r.studentId ? `reg_${r.studentId}` : `guest_${r.participantName}_${r.grade}_${r.section}`;
    if (!uniqueStudentsMap.has(key)) {
      uniqueStudentsMap.set(key, r);
      if (r.isGuest) guestCount++;
      else registeredCount++;
    }
  });

  const uniqueStudents = uniqueStudentsMap.size;

  // Reading challenges
  const readingRecords = records.filter(r => r.activityType === 'reading');
  const readingParticipations = readingRecords.length;
  const readingAchievements = readingRecords.filter(r => r.isCompleted).length;
  const readingCompletionRate = readingParticipations > 0
    ? ((readingAchievements / readingParticipations) * 100).toFixed(1)
    : '0';
  const readingAvgScore = readingParticipations > 0
    ? (readingRecords.reduce((acc, r) => acc + (r.score || 0), 0) / readingParticipations).toFixed(1)
    : '0';

  // Competitions
  const compRecords = records.filter(r => r.activityType === 'competition');
  const compUniqueMap = new Set();
  compRecords.forEach(r => {
    compUniqueMap.add(r.studentId || r.participantName);
  });
  const compParticipants = compUniqueMap.size;
  const compAttempts = compRecords.length;
  const compCompleted = compRecords.filter(r => r.isCompleted).length;
  const compCompletionRate = compAttempts > 0
    ? ((compCompleted / compAttempts) * 100).toFixed(1)
    : '0';
  const compAvgScore = compAttempts > 0
    ? (compRecords.reduce((acc, r) => acc + (r.score || 0), 0) / compAttempts).toFixed(1)
    : '0';

  // Scientific Research
  const researchRecords = records.filter(r => r.activityType === 'research');
  const researchSubmitted = researchRecords.length;
  const researchEvaluatedRecords = researchRecords.filter(r => r.isCompleted && typeof r.score === 'number');
  const researchEvaluated = researchEvaluatedRecords.length;
  const researchPending = researchRecords.filter(r => !r.isCompleted).length;
  const researchAvgScore = researchEvaluated > 0
    ? (researchEvaluatedRecords.reduce((acc, r) => acc + r.score, 0) / researchEvaluated).toFixed(1)
    : null;

  // Educational Content
  const contentPublished = allRawData.contentPages.filter(p => p.status === 'published').length;
  const contentAddedPeriod = allRawData.contentPages.filter(p => {
    const pDate = new Date(p.created_at);
    if (startDate && pDate < startDate) return false;
    if (endDate && pDate > endDate) return false;
    return true;
  }).length;

  // Rank Top 10 Students (Competitions & Reading scores)
  const studentStatsMap = new Map();

  records.forEach(r => {
    const key = r.studentId ? `st_${r.studentId}` : `gst_${r.participantName}_${r.grade}_${r.section}`;
    if (!studentStatsMap.has(key)) {
      studentStatsMap.set(key, {
        name: r.participantName,
        isGuest: r.isGuest,
        grade: r.grade,
        section: r.section,
        compCount: 0,
        compScore: 0,
        readingCount: 0,
        readingScore: 0,
        readingCompletedCount: 0,
        researchScore: 0,
        totalScore: 0,
        totalActivities: 0
      });
    }

    const st = studentStatsMap.get(key);
    st.totalActivities++;

    if (r.activityType === 'competition') {
      st.compCount++;
      st.compScore += (r.score || 0);
      st.totalScore += (r.score || 0);
    } else if (r.activityType === 'reading') {
      st.readingCount++;
      if (r.isCompleted) st.readingCompletedCount++;
      st.readingScore += (r.score || 0);
      st.totalScore += (r.score || 0);
    } else if (r.activityType === 'research') {
      if (typeof r.score === 'number') {
        st.researchScore += r.score;
        st.totalScore += r.score;
      }
    }
  });

  const studentsRanked = Array.from(studentStatsMap.values())
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.totalActivities - a.totalActivities;
    })
    .slice(0, 10);

  // Rank Top Sections
  const sectionStatsMap = new Map();

  records.forEach(r => {
    const secName = r.section ? String(r.section).trim() : '';
    const gradeName = r.grade ? String(r.grade).trim() : '';
    if (!secName) return;

    const secKey = `${gradeName} – شعبة ${secName}`;

    if (!sectionStatsMap.has(secKey)) {
      sectionStatsMap.set(secKey, {
        key: secKey,
        grade: gradeName,
        section: secName,
        participations: 0,
        completedCount: 0,
        totalScore: 0,
        studentsSet: new Set()
      });
    }

    const sec = sectionStatsMap.get(secKey);
    sec.participations++;
    if (r.isCompleted) sec.completedCount++;
    sec.totalScore += (r.score || 0);
    sec.studentsSet.add(r.studentId || r.participantName);
  });

  const sectionsRanked = Array.from(sectionStatsMap.values()).map(s => {
    const avgScore = s.participations > 0 ? (s.totalScore / s.participations).toFixed(1) : 0;
    const completionRate = s.participations > 0 ? ((s.completedCount / s.participations) * 100).toFixed(0) : 0;
    return {
      ...s,
      studentCount: s.studentsSet.size,
      avgScore: parseFloat(avgScore),
      completionRate: parseInt(completionRate, 10),
      rankScore: parseFloat(avgScore) * 10 + s.participations * 2
    };
  }).sort((a, b) => b.rankScore - a.rankScore);

  return {
    totalParticipations,
    uniqueStudents,
    registeredCount,
    guestCount,
    readingParticipations,
    readingAchievements,
    readingCompletionRate,
    readingAvgScore,
    compParticipants,
    compAttempts,
    compCompleted,
    compCompletionRate,
    compAvgScore,
    researchSubmitted,
    researchEvaluated,
    researchPending,
    researchAvgScore,
    contentPublished,
    contentAddedPeriod,
    sectionsCount: allRawData.schoolSections.length,
    questionsCount: allRawData.questionsCount,
    studentsRanked,
    sectionsRanked
  };
}

/**
 * Render the Summary Bar
 */
function renderSummaryBar(metrics) {
  const periodTextEl = document.getElementById('summary-period-text');
  const recordsCountEl = document.getElementById('summary-records-count');
  const studentsCountEl = document.getElementById('summary-students-count');

  if (periodTextEl) {
    if (activePreset === '7days') periodTextEl.textContent = 'آخر 7 أيام';
    else if (activePreset === '30days') periodTextEl.textContent = 'آخر 30 يومًا';
    else if (activePreset === 'this-month') periodTextEl.textContent = 'الشهر الحالي';
    else if (activePreset === 'all') periodTextEl.textContent = 'جميع الفترات (سجل شامل)';
    else if (startDate && endDate) {
      periodTextEl.textContent = `من ${formatInputDate(startDate)} إلى ${formatInputDate(endDate)}`;
    }
  }

  if (recordsCountEl) {
    recordsCountEl.textContent = `${metrics.totalParticipations.toLocaleString('ar-OM')} سجل ومشاركة`;
  }

  if (studentsCountEl) {
    studentsCountEl.textContent = `${metrics.uniqueStudents.toLocaleString('ar-OM')} طالب فريد`;
  }

  const updatedEl = document.getElementById('report-last-updated');
  if (updatedEl) {
    const timeStr = new Date().toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' });
    updatedEl.textContent = `آخر استعلام: اليوم الساعة ${timeStr}`;
  }
}

/**
 * Render the 5 Domain Metric Cards
 */
function renderDomainMetricCards(metrics) {
  // Participants
  setElText('rep-total-participations', metrics.totalParticipations);
  setElText('rep-unique-students', metrics.uniqueStudents);
  setElText('rep-registered-students', metrics.registeredCount);
  setElText('rep-guest-participants', metrics.guestCount);

  const regSub = document.getElementById('rep-registered-sub');
  if (regSub) {
    regSub.textContent = `من أصل ${allRawData.profiles.length} طالب مسجل`;
  }

  // Reading challenges
  setElText('rep-reading-participations', metrics.readingParticipations);
  setElText('rep-reading-achievements', metrics.readingAchievements);
  setElText('rep-reading-completion-rate', `${metrics.readingCompletionRate}%`);
  setElText('rep-reading-avg-score', metrics.readingAvgScore);

  // Competitions
  setElText('rep-comp-participants', metrics.compParticipants);
  setElText('rep-comp-attempts', metrics.compAttempts);
  setElText('rep-comp-completion-rate', `${metrics.compCompletionRate}%`);
  setElText('rep-comp-avg-score', metrics.compAvgScore);

  // Scientific Research
  setElText('rep-research-submitted', metrics.researchSubmitted);
  setElText('rep-research-evaluated', metrics.researchEvaluated);
  setElText('rep-research-pending', metrics.researchPending);

  const resAvgEl = document.getElementById('rep-research-avg-score');
  const resNoteEl = document.getElementById('rep-research-avg-note');
  if (resAvgEl) {
    if (metrics.researchAvgScore !== null) {
      resAvgEl.textContent = metrics.researchAvgScore;
      if (resNoteEl) resNoteEl.textContent = 'متوسط الدرجات المرصودة';
    } else {
      resAvgEl.textContent = 'قيد التحكيم';
      resAvgEl.style.fontSize = '1.15rem';
      if (resNoteEl) resNoteEl.textContent = 'لم ترصد درجات بعد';
    }
  }

  // Content & platform
  setElText('rep-content-published', metrics.contentPublished);
  setElText('rep-content-period', metrics.contentAddedPeriod);
  setElText('rep-sections-count', metrics.sectionsCount);
  setElText('rep-questions-count', metrics.questionsCount);
}

function setElText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof val === 'number' ? val.toLocaleString('ar-OM') : val;
}

/**
 * Render Interactive Charts using Chart.js
 */
function renderCharts(records, metrics) {
  if (typeof window.Chart === 'undefined') {
    console.warn('Chart.js library is not loaded');
    return;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#ffffff' : '#0e1711';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // ── Chart 1: Timeline of participations ──
  const canvasTimeline = document.getElementById('chart-timeline');
  if (canvasTimeline) {
    const dateCounts = {};
    records.forEach(r => {
      const dKey = formatInputDate(r.date);
      dateCounts[dKey] = (dateCounts[dKey] || 0) + 1;
    });

    // Sort dates
    const sortedDates = Object.keys(dateCounts).sort();
    const timelineLabels = sortedDates.length > 0 ? sortedDates : ['لا توجد مشاركات'];
    const timelineData = sortedDates.length > 0 ? sortedDates.map(d => dateCounts[d]) : [0];

    if (chartTimelineInstance) chartTimelineInstance.destroy();

    chartTimelineInstance = new window.Chart(canvasTimeline, {
      type: 'line',
      data: {
        labels: timelineLabels,
        datasets: [{
          label: 'عدد المشاركات',
          data: timelineData,
          borderColor: '#127547',
          backgroundColor: 'rgba(18, 117, 71, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#127547',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            rtl: true,
            titleFont: { family: 'Cairo' },
            bodyFont: { family: 'Cairo' }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Cairo', size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, precision: 0, font: { family: 'Cairo', size: 11 } }
          }
        }
      }
    });
  }

  // ── Chart 2: Activity Breakdown Donut ──
  const canvasDonut = document.getElementById('chart-activity-donut');
  if (canvasDonut) {
    const compCount = records.filter(r => r.activityType === 'competition').length;
    const readingCount = records.filter(r => r.activityType === 'reading').length;
    const researchCount = records.filter(r => r.activityType === 'research').length;

    if (chartDonutInstance) chartDonutInstance.destroy();

    chartDonutInstance = new window.Chart(canvasDonut, {
      type: 'doughnut',
      data: {
        labels: ['مسابقات السراج', 'تحديات القراءة', 'البحث العلمي'],
        datasets: [{
          data: [compCount, readingCount, researchCount],
          backgroundColor: ['#7c3aed', '#059669', '#d97706'],
          borderWidth: 2,
          borderColor: isDark ? '#171c19' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            rtl: true,
            labels: {
              color: textColor,
              font: { family: 'Cairo', size: 12 },
              padding: 16
            }
          },
          tooltip: {
            rtl: true,
            titleFont: { family: 'Cairo' },
            bodyFont: { family: 'Cairo' }
          }
        },
        cutout: '65%'
      }
    });
  }

  // ── Chart 3: Comparative Bar (Attempts, Completion Rate, Avg Score) ──
  const canvasComp = document.getElementById('chart-comparison-bars');
  if (canvasComp) {
    if (chartComparisonInstance) chartComparisonInstance.destroy();

    chartComparisonInstance = new window.Chart(canvasComp, {
      type: 'bar',
      data: {
        labels: ['المسابقات', 'تحديات القراءة', 'البحث العلمي'],
        datasets: [
          {
            label: 'إجمالي المحاولات',
            data: [metrics.compAttempts, metrics.readingParticipations, metrics.researchSubmitted],
            backgroundColor: '#2563eb'
          },
          {
            label: 'نسبة الإكمال (%)',
            data: [
              parseFloat(metrics.compCompletionRate) || 0,
              parseFloat(metrics.readingCompletionRate) || 0,
              metrics.researchSubmitted > 0 ? (metrics.researchEvaluated / metrics.researchSubmitted * 100) : 0
            ],
            backgroundColor: '#10b981'
          },
          {
            label: 'متوسط الدرجات',
            data: [
              parseFloat(metrics.compAvgScore) || 0,
              parseFloat(metrics.readingAvgScore) || 0,
              parseFloat(metrics.researchAvgScore) || 0
            ],
            backgroundColor: '#f59e0b'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            rtl: true,
            labels: { color: textColor, font: { family: 'Cairo', size: 11 } }
          },
          tooltip: { rtl: true, titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Cairo', size: 12, weight: 'bold' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Cairo', size: 11 } }
          }
        }
      }
    });
  }

  // ── Chart 4: Grade and Section Breakdown ──
  const canvasGrades = document.getElementById('chart-grade-bars');
  if (canvasGrades) {
    const gradeCounts = { 'العاشر': 0, 'الحادي عشر': 0, 'الثاني عشر': 0, 'أخرى': 0 };

    records.forEach(r => {
      const gNorm = normalizeGrade(r.grade);
      if (gNorm === '10') gradeCounts['العاشر']++;
      else if (gNorm === '11') gradeCounts['الحادي عشر']++;
      else if (gNorm === '12') gradeCounts['الثاني عشر']++;
      else gradeCounts['أخرى']++;
    });

    if (chartGradesInstance) chartGradesInstance.destroy();

    chartGradesInstance = new window.Chart(canvasGrades, {
      type: 'bar',
      data: {
        labels: ['الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر', 'أخرى / زوار'],
        datasets: [{
          label: 'مشاركات الصفوف',
          data: [gradeCounts['العاشر'], gradeCounts['الحادي عشر'], gradeCounts['الثاني عشر'], gradeCounts['أخرى']],
          backgroundColor: ['#127547', '#2563eb', '#7c3aed', '#d97706'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { rtl: true, titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Cairo', size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, precision: 0, font: { family: 'Cairo', size: 11 } }
          }
        }
      }
    });
  }
}

/**
 * Render the Top 3 Sections Podium
 */
function renderTopSectionsPodium(rankedSections) {
  const container = document.getElementById('top-sections-podium');
  if (!container) return;

  if (!rankedSections || rankedSections.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); padding: 2rem;">
        لا توجد بيانات تفاعل كافية لتصنيف الشُعب في الفترة المحددة.
      </div>
    `;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const titles = ['المركز الأول (الذهبي)', 'المركز الثاني (الفضي)', 'المركز الثالث (البرونزي)'];

  container.innerHTML = rankedSections.slice(0, 3).map((sec, i) => `
    <div class="podium-card rank-${i + 1}">
      <div class="podium-badge">${medals[i]}</div>
      <div style="font-size: 0.82rem; color: var(--color-text-muted); font-weight: 700; margin-bottom: 0.25rem;">
        ${titles[i]}
      </div>
      <h4 class="podium-title">${escapeHtml(sec.key)}</h4>
      <div class="podium-stats">
        <div>
          <div class="podium-stat-val">${sec.participations}</div>
          <div class="podium-stat-lbl">مشاركة</div>
        </div>
        <div>
          <div class="podium-stat-val">${sec.studentCount}</div>
          <div class="podium-stat-lbl">طالب متفاعل</div>
        </div>
        <div>
          <div class="podium-stat-val">${sec.avgScore}</div>
          <div class="podium-stat-lbl">متوسط الدرجات</div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Render Top 10 Students Leaderboard
 */
function renderTopStudentsTable(rankedStudents) {
  const tbody = document.getElementById('top-students-table-body');
  if (!tbody) return;

  if (!rankedStudents || rankedStudents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">
          لا توجد نتائج مسجلة للطلاب في الفترة المحددة.
        </td>
      </tr>
    `;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const medalClasses = ['gold', 'silver', 'bronze'];

  tbody.innerHTML = rankedStudents.map((st, i) => {
    const isMedal = i < 3;
    const badgeClass = isMedal ? medalClasses[i] : 'other';
    const rankLabel = isMedal ? medals[i] : `${i + 1}`;
    const gradeText = st.grade ? `${escapeHtml(st.grade)} ${st.section ? `(${st.section})` : ''}` : '-';

    return `
      <tr>
        <td style="text-align: center;">
          <span class="rank-badge ${badgeClass}">${rankLabel}</span>
        </td>
        <td>
          <strong style="color: var(--color-text); font-size: 0.95rem;">${escapeHtml(st.name)}</strong>
        </td>
        <td style="color: var(--color-text-muted); font-size: 0.88rem;">${gradeText}</td>
        <td>
          <span class="badge ${st.isGuest ? 'badge-draft' : 'badge-published'}">
            ${st.isGuest ? 'مشارك زائر' : 'طالب مسجل'}
          </span>
        </td>
        <td style="text-align: center; font-weight: 600;">${st.compCount}</td>
        <td style="text-align: center; font-weight: 600; color: #059669;">${st.readingCompletedCount}</td>
        <td style="text-align: center;">
          <strong style="font-size: 1.1rem; color: var(--color-primary);">${st.totalScore}</strong> نقطة
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Auditable Log Table with search and pagination
 */
function renderAuditLogTable() {
  const tbody = document.getElementById('audit-log-table-body');
  const infoEl = document.getElementById('audit-page-info');
  const prevBtn = document.getElementById('btn-audit-prev');
  const nextBtn = document.getElementById('btn-audit-next');

  if (!tbody) return;

  let list = filteredRecords;
  if (logSearchTerm) {
    list = list.filter(r =>
      r.participantName.toLowerCase().includes(logSearchTerm) ||
      r.activityTitle.toLowerCase().includes(logSearchTerm) ||
      r.grade.toLowerCase().includes(logSearchTerm) ||
      r.section.toLowerCase().includes(logSearchTerm)
    );
  }

  const total = list.length;
  const totalPages = Math.ceil(total / auditPageSize) || 1;

  if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
  if (auditCurrentPage < 1) auditCurrentPage = 1;

  const startIdx = (auditCurrentPage - 1) * auditPageSize;
  const pageItems = list.slice(startIdx, startIdx + auditPageSize);

  if (infoEl) {
    infoEl.textContent = `عرض ${total > 0 ? startIdx + 1 : 0} إلى ${Math.min(startIdx + auditPageSize, total)} من إجمالي ${total} سجل`;
  }

  if (prevBtn) prevBtn.disabled = auditCurrentPage <= 1;
  if (nextBtn) nextBtn.disabled = auditCurrentPage >= totalPages;

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          لا توجد سجلات مطابقة لمعايير البحث.
        </td>
      </tr>
    `;
    return;
  }

  const typeBadges = {
    competition: { label: 'مسابقة', cls: 'badge-published' },
    reading: { label: 'قراءة', cls: 'badge-act-reading' },
    research: { label: 'بحث علمي', cls: 'badge-act-research' }
  };

  tbody.innerHTML = pageItems.map(item => {
    const b = typeBadges[item.activityType] || { label: item.activityType, cls: 'badge-draft' };
    const scoreText = item.score !== null ? `${item.score}` : '--';
    const gradeSection = item.grade ? `${escapeHtml(item.grade)} / ${escapeHtml(item.section || '-')}` : '-';

    return `
      <tr>
        <td style="font-size: 0.82rem; color: var(--color-text-muted);">${item.dateFormatted}</td>
        <td>
          <strong style="color: var(--color-text);">${escapeHtml(item.participantName)}</strong>
        </td>
        <td>
          <span class="badge ${item.isGuest ? 'badge-draft' : 'badge-published'}" style="font-size: 0.72rem;">
            ${item.participantType}
          </span>
        </td>
        <td style="font-size: 0.85rem;">${gradeSection}</td>
        <td>
          <span class="badge ${b.cls}" style="font-size: 0.75rem;">${b.label}</span>
        </td>
        <td style="font-size: 0.88rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(item.activityTitle)}
        </td>
        <td style="text-align: center;">
          <span class="badge ${item.isCompleted ? 'badge-published' : 'badge-draft'}" style="font-size: 0.72rem;">
            ${item.statusLabel}
          </span>
        </td>
        <td style="text-align: center; font-weight: 700; color: var(--color-primary);">
          ${scoreText}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Update metadata in print header
 */
function updatePrintHeaderInfo() {
  const rangeEl = document.getElementById('print-date-range');
  const genEl = document.getElementById('print-generation-date');
  const actEl = document.getElementById('print-activity-type');

  if (rangeEl) {
    if (activePreset === '7days') rangeEl.textContent = 'آخر 7 أيام';
    else if (activePreset === '30days') rangeEl.textContent = 'آخر 30 يومًا';
    else if (activePreset === 'this-month') rangeEl.textContent = 'الشهر الحالي';
    else if (activePreset === 'all') rangeEl.textContent = 'جميع الفترات المتاحة';
    else if (startDate && endDate) {
      rangeEl.textContent = `من ${formatInputDate(startDate)} إلى ${formatInputDate(endDate)}`;
    }
  }

  if (genEl) {
    const now = new Date();
    genEl.textContent = `${now.toLocaleDateString('ar-OM')} الساعة ${now.toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (actEl) {
    const actMap = {
      all: 'كافة الأنشطة',
      competition: 'مسابقات السراج فقط',
      reading: 'تحديات القراءة فقط',
      research: 'البحث العلمي فقط'
    };
    actEl.textContent = actMap[selectedActivity] || 'كافة الأنشطة';
  }
}

/**
 * Print Report Trigger
 */
function handlePrintReport() {
  updatePrintHeaderInfo();
  window.print();
}

/**
 * Save as PDF Trigger
 */
function handleSavePdf() {
  updatePrintHeaderInfo();
  Toast.info('يرجى اختيار «حفظ بتنسيق PDF» أو «Save as PDF» في وجهة الطابعة.');
  setTimeout(() => {
    window.print();
  }, 400);
}

/**
 * Export Comprehensive Report as UTF-8 CSV with Arabic BOM
 */
function exportFullReportCSV() {
  const metrics = calculateMetrics(filteredRecords);

  const now = new Date();
  const dateStr = formatInputDate(now);
  const teacherName = currentTeacher?.full_name || 'معلم معتمد';

  let periodDesc = 'آخر 30 يوما';
  if (activePreset === '7days') periodDesc = 'آخر 7 أيام';
  else if (activePreset === 'this-month') periodDesc = 'الشهر الحالي';
  else if (activePreset === 'all') periodDesc = 'جميع الفترات';
  else if (startDate && endDate) periodDesc = `${formatInputDate(startDate)} إلى ${formatInputDate(endDate)}`;

  let csv = '\uFEFF'; // UTF-8 BOM

  // Header Section
  csv += 'سلطنة عمان - وزارة التربية والتعليم\r\n';
  csv += 'مدرسة أبو عبيدة بن الجراح للتعليم ما بعد الأساسي (10 - 12)\r\n';
  csv += 'منصة السراج التعليمية - التقرير الإحصائي والتحليلي للأداء الأكاديمي\r\n';
  csv += `تاريخ ووقت إصدار التقرير:,${now.toLocaleString('ar-OM')}\r\n`;
  csv += `المعلم المسؤول:,${csvEscape(teacherName)}\r\n`;
  csv += `فترة التقرير:,${csvEscape(periodDesc)}\r\n`;
  csv += `نوع النشاط المفلتر:,${csvEscape(selectedActivity)}\r\n`;
  csv += `الصف المفلتر:,${csvEscape(selectedGrade)}\r\n`;
  csv += `الشعبة المفلترة:,${csvEscape(selectedSection)}\r\n\r\n`;

  // General KPIs Table
  csv += '=== أولاً: المؤشرات العامة للمنصة ===\r\n';
  csv += 'المؤشر,القيمة,الوصف\r\n';
  csv += `إجمالي المشاركات والمحاولات,${metrics.totalParticipations},مشاركات مسجلة خلال الفترة\r\n`;
  csv += `الطلاب الفعليون الفريدون,${metrics.uniqueStudents},طالب فريد تفاعل مع الأنشطة\r\n`;
  csv += `الطلاب المسجلون,${metrics.registeredCount},طالب بحساب مدرسي رسمي\r\n`;
  csv += `المشاركون الزوار,${metrics.guestCount},مشارك عبر نموذج الزائر\r\n`;
  csv += `مشاركات تحديات القراءة,${metrics.readingParticipations},محاولة بالمستويات القرائية\r\n`;
  csv += `إنجازات القراءة المكتملة,${metrics.readingAchievements},مستوى قرائي تم اجتيازه\r\n`;
  csv += `نسبة إكمال القراءة,${metrics.readingCompletionRate}%,نسبة الإنجاز للتحديات\r\n`;
  csv += `متوسط درجات القراءة,${metrics.readingAvgScore},متوسط درجات أسئلة القراءة\r\n`;
  csv += `مشاركو مسابقات السراج,${metrics.compParticipants},طالب وزائر بالمسابقات\r\n`;
  csv += `إجمالي محاولات المسابقات,${metrics.compAttempts},محاولة في مسابقات السراج\r\n`;
  csv += `نسبة إكمال المسابقات,${metrics.compCompletionRate}%,نسبة المحاولات المسلمة\r\n`;
  csv += `متوسط درجات المسابقات,${metrics.compAvgScore},متوسط درجات المحاولات\r\n`;
  csv += `الأبحاث العلمية المقدمة,${metrics.researchSubmitted},بحث مرفوع بالمنصة\r\n`;
  csv += `الأبحاث المقيمة,${metrics.researchEvaluated},أبحاث تم رصد درجاتها\r\n`;
  csv += `الأبحاث قيد التحكيم,${metrics.researchPending},أبحاث منتظرة للتحكيم\r\n`;
  csv += `متوسط تقييم الأبحاث,${metrics.researchAvgScore !== null ? metrics.researchAvgScore : 'لا توجد أبحاث مقيمة بعد'},من 100 درجة\r\n`;
  csv += `الصفحات والمقالات المنشورة,${metrics.contentPublished},محتوى تعليمي معتمد\r\n`;
  csv += `صفحات أضيفت بالفترة,${metrics.contentAddedPeriod},صفحات جديدة خلال الفترة المحددة\r\n\r\n`;

  // Top 10 Students Table
  csv += '=== ثانياً: قائمة أوائل الطلاب (لوحة الشرف) ===\r\n';
  csv += 'الترتيب,اسم الطالب,نوع الحساب,الصف,الشعبة,محاولات المسابقات,إنجازات القراءة,مجموع النقاط والدرجات\r\n';
  metrics.studentsRanked.forEach((st, idx) => {
    csv += `${idx + 1},${csvEscape(st.name)},${st.isGuest ? 'زائر' : 'مسجل'},${csvEscape(st.grade)},${csvEscape(st.section)},${st.compCount},${st.readingCompletedCount},${st.totalScore}\r\n`;
  });
  csv += '\r\n';

  // Top Sections Table
  csv += '=== ثالثاً: ترتيب أفضل الشُعب المدرسية ===\r\n';
  csv += 'الترتيب,الصف والشعبة,عدد المشاركات,الطلاب المتفاعلون,متوسط الدرجات,نسبة الإكمال (%)\r\n';
  metrics.sectionsRanked.forEach((sec, idx) => {
    csv += `${idx + 1},${csvEscape(sec.key)},${sec.participations},${sec.studentCount},${sec.avgScore},${sec.completionRate}%\r\n`;
  });
  csv += '\r\n';

  // Detailed Records Log
  csv += '=== رابعاً: سجل العمليات والمشاركات المشمولة في التقرير ===\r\n';
  csv += 'المعرف,التاريخ,اسم المشارك,نوع المشارك,الصف,الشعبة,نوع النشاط,عنوان النشاط,الحالة,الدرجة\r\n';
  filteredRecords.forEach(r => {
    csv += `${r.id},${formatInputDate(r.date)},${csvEscape(r.participantName)},${r.participantType},${csvEscape(r.grade)},${csvEscape(r.section)},${csvEscape(r.activityTypeLabel)},${csvEscape(r.activityTitle)},${csvEscape(r.statusLabel)},${r.score !== null ? r.score : ''}\r\n`;
  });

  // Trigger Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير_سراج_مدرسة_أبو_عبيدة_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  Toast.success('تم تصدير كشف التقرير بصيغة CSV بنجاح');
}

function csvEscape(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * UI State Helpers
 */
function showLoadingState() {
  const loading = document.getElementById('report-loading');
  const body = document.getElementById('report-body');
  if (loading) loading.style.display = 'block';
  if (body) body.style.opacity = '0.4';
}

function hideLoadingState() {
  const loading = document.getElementById('report-loading');
  const body = document.getElementById('report-body');
  if (loading) loading.style.display = 'none';
  if (body) body.style.opacity = '1';
}

function showErrorState(msg) {
  hideLoadingState();
  const errorEl = document.getElementById('report-error');
  const msgEl = document.getElementById('report-error-msg');
  if (errorEl) errorEl.style.display = 'block';
  if (msgEl) msgEl.textContent = msg;
}

function hideErrorState() {
  const errorEl = document.getElementById('report-error');
  if (errorEl) errorEl.style.display = 'none';
}
