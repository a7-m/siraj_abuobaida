/**
 * Teacher Dashboard Home & Metrics Hub
 * منصة السراج – مدرسة أبو عبيدة
 */

import { initTeacherAdmin, escapeHtml, formatDate } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('dashboard');
    await loadAllDashboardMetrics();
    await loadRecentData();

    const refreshBtn = document.getElementById('btn-refresh-stats');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'جاري التحديث...';
        await loadAllDashboardMetrics();
        await loadRecentData();
        Toast.success('تم تحديث الإحصائيات بنجاح');
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 تحديث الإحصائيات';
      });
    }
  } catch (err) {
    console.error('Teacher dashboard init error:', err);
  }
});

async function loadAllDashboardMetrics() {
  try {
    // 1. Competitions count
    const { count: compCount } = await supabase
      .from('competitions')
      .select('*', { count: 'exact', head: true });
    setStat('stat-competitions', compCount ?? 0);

    // 2. Challenges count
    const { count: chalCount } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true });
    setStat('stat-challenges', chalCount ?? 0);

    // 3. Questions in question bank
    const { count: qCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    setStat('stat-questions', qCount ?? 0);

    // 4. Research submissions
    const { count: resCount } = await supabase
      .from('research_submissions')
      .select('*', { count: 'exact', head: true });
    setStat('stat-research', resCount ?? 0);

    // 5. Registered students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');
    setStat('stat-students', studentCount ?? 0);

    // 6. Total competition attempts
    const { count: attemptCount } = await supabase
      .from('competition_attempts')
      .select('*', { count: 'exact', head: true });
    setStat('stat-attempts', attemptCount ?? 0);

    // 7. Content pages count
    const { count: pagesCount } = await supabase
      .from('content_pages')
      .select('*', { count: 'exact', head: true });
    setStat('stat-pages', pagesCount ?? 0);

    // 8. School sections count
    const { count: secCount } = await supabase
      .from('school_sections')
      .select('*', { count: 'exact', head: true });
    setStat('stat-sections', secCount ?? 0);

  } catch (err) {
    console.error('Error loading dashboard metrics:', err);
    Toast.error('تعذر جلب بعض الإحصائيات من الخادم');
  }
}

function setStat(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value.toLocaleString('ar-OM');
}

async function loadRecentData() {
  // Load recent competitions
  const compContainer = document.getElementById('recent-comps-list');
  if (compContainer) {
    try {
      const { data: comps, error } = await supabase
        .from('competitions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      if (!comps || comps.length === 0) {
        compContainer.innerHTML = '<div style="color: var(--color-text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem;">لا توجد مسابقات حالياً.</div>';
      } else {
        compContainer.innerHTML = comps.map(c => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-light);">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-text);">${escapeHtml(c.title)}</div>
              <div style="font-size: 0.8rem; color: var(--color-text-muted);">${formatDate(c.created_at)}</div>
            </div>
            <span class="badge ${c.status === 'active' ? 'badge-published' : 'badge-draft'}">
              ${c.status === 'active' ? 'نشطة' : (c.status === 'draft' ? 'مسودة' : 'منتهية')}
            </span>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Recent competitions error:', e);
      compContainer.innerHTML = '<div style="color: #ef4444; font-size: 0.85rem;">تعذر تحميل المسابقات الحديثة</div>';
    }
  }

  // Load recent research submissions
  const resContainer = document.getElementById('recent-research-list');
  if (resContainer) {
    try {
      const { data: research, error } = await supabase
        .from('research_submissions')
        .select('id, title, field, status, submitted_at, guest_name, profiles(full_name)')
        .order('submitted_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      if (!research || research.length === 0) {
        resContainer.innerHTML = '<div style="color: var(--color-text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem;">لا توجد أبحاث مقدمة بعد.</div>';
      } else {
        resContainer.innerHTML = research.map(r => {
          const studentName = r.profiles?.full_name || r.guest_name || 'طالب زائر';
          const statusLabels = {
            submitted: 'تم التسليم',
            under_review: 'قيد التحكيم',
            evaluated: 'تم التقييم'
          };
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-light);">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-text);">${escapeHtml(r.title)}</div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted);">بواسطة: ${escapeHtml(studentName)} • ${formatDate(r.submitted_at)}</div>
              </div>
              <span class="research-status-badge status-${r.status}">
                ${statusLabels[r.status] || r.status}
              </span>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.warn('Recent research error:', e);
      resContainer.innerHTML = '<div style="color: #ef4444; font-size: 0.85rem;">تعذر تحميل الأبحاث الحديثة</div>';
    }
  }
}
