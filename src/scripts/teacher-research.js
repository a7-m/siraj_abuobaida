/**
 * Teacher Scientific Research Module
 * منصة السراج – مدرسة أبو عبيدة
 * Complete management of research submissions, file downloads, and scientific evaluation rubric.
 */

import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, formatDate, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let currentTeacher = null;
let allSubmissions = [];
let activeSubmission = null;
let activeEvaluation = null;

// Pagination and filter state
let currentPage = 1;
const pageSize = 10;
let searchQuery = '';
let statusFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const adminData = await initTeacherAdmin('research');
    currentTeacher = adminData.user;

    setupEvents();
    await loadSubmissions();
  } catch (err) {
    console.error('Research module init error:', err);
  }
});

function setupEvents() {
  const searchInput = document.getElementById('res-search');
  const filterSelect = document.getElementById('res-filter-status');
  const btnCloseModal = document.getElementById('btn-close-eval-modal');
  const btnCancelEval = document.getElementById('btn-cancel-eval');
  const btnSaveEval = document.getElementById('btn-save-eval');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderTable();
    }, 250));
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeEvalModal);
  if (btnCancelEval) btnCancelEval.addEventListener('click', closeEvalModal);
  if (btnSaveEval) btnSaveEval.addEventListener('click', saveEvaluation);

  // Auto score calculator
  ['score-crit-1', 'score-crit-2', 'score-crit-3', 'score-crit-4'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) inp.addEventListener('input', calculateTotalScore);
  });
}

async function loadSubmissions() {
  const tbody = document.getElementById('research-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">جاري تحميل الأبحاث العلمية...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('research_submissions')
      .select(`
        *,
        profiles:student_id ( id, full_name, role, grade, section ),
        research_evaluations ( id, total_score, criteria_scores, notes, evaluated_at, teacher_id )
      `)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    allSubmissions = data || [];
    renderTable();
  } catch (err) {
    console.error('Error fetching research submissions:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل الأبحاث: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('research-table-body');
  if (!tbody) return;

  const filtered = allSubmissions.filter(sub => {
    const studentName = sub.profiles?.full_name || sub.guest_name || '';
    const matchesSearch = !searchQuery || 
      (sub.title && sub.title.toLowerCase().includes(searchQuery)) ||
      studentName.toLowerCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="td-empty-state">
            <div class="td-empty-icon">🔬</div>
            <div class="td-empty-title">لا توجد أبحاث علمية مطابقة</div>
            <div class="td-empty-desc">لم يتم تسليم أي أبحاث علمية تطابق معايير البحث الحالية.</div>
          </div>
        </td>
      </tr>
    `;
    renderPagination({
      containerId: 'research-pagination',
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize,
      onPageChange: () => {}
    });
    return;
  }

  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  const statusMap = {
    submitted: { label: 'بانتظار التحكيم', class: 'badge-draft' },
    under_review: { label: 'قيد التحكيم', class: 'badge-archived' },
    evaluated: { label: 'تم التحكيم', class: 'badge-published' }
  };

  tbody.innerHTML = pageItems.map(sub => {
    const studentName = sub.profiles?.full_name || sub.guest_name || 'طالب مجهول';
    const gradeSection = sub.profiles ? `${sub.profiles.grade || ''} / ${sub.profiles.section || ''}` : `${sub.guest_grade || ''} / ${sub.guest_section || ''}`;
    const evaluation = (sub.research_evaluations && sub.research_evaluations.length > 0) ? sub.research_evaluations[0] : null;
    const st = statusMap[sub.status] || { label: sub.status, class: 'badge-draft' };

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--color-text); line-height: 1.4;">
            ${escapeHtml(sub.title)}
          </div>
          <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.2rem;">
            مجال البحث: <strong style="color: var(--color-primary);">${escapeHtml(sub.field || 'عام')}</strong>
          </div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(studentName)}</div>
          <div style="font-size: 0.8rem; color: var(--color-text-muted);">${escapeHtml(gradeSection.trim() !== '/' ? gradeSection : 'زائر')}</div>
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--color-text);">${formatDate(sub.submitted_at)}</div>
        </td>
        <td>
          <span class="badge ${st.class}">
            ${st.label}
          </span>
        </td>
        <td>
          ${evaluation ? `
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary);">
              ${evaluation.total_score} <small style="font-size: 0.75rem;">/ 100</small>
            </div>
          ` : `
            <span style="color: var(--color-text-muted); font-size: 0.85rem;">لم يُرصد</span>
          `}
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-eval-res" data-id="${sub.id}">
              ${evaluation ? '✏️ تعديل التحكيم' : '⚖️ تحكيم البحث'}
            </button>
            ${sub.file_url ? `
              <a href="${escapeHtml(sub.file_url)}" target="_blank" class="btn btn-outline btn-sm" title="تحميل / فتح الملف">
                📄 الملف
              </a>
            ` : ''}
            <button class="btn btn-outline-danger btn-sm btn-delete-res" data-id="${sub.id}" title="حذف">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const evalButtons = tbody.querySelectorAll('.btn-eval-res');
  const deleteButtons = tbody.querySelectorAll('.btn-delete-res');
  
  console.log(`[teacher-research] Binding ${evalButtons.length} eval buttons and ${deleteButtons.length} delete buttons`);
  
  evalButtons.forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const subId = b.dataset.id || b.getAttribute('data-id');
      console.log(`[teacher-research] Eval button clicked for submission: ${subId}`);
      const sub = allSubmissions.find(s => s.id === subId);
      if (sub) {
        openEvalModal(sub);
      } else {
        console.error(`[teacher-research] Submission not found: ${subId}`);
      }
    });
  });

  deleteButtons.forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const subId = b.dataset.id || b.getAttribute('data-id');
      console.log(`[teacher-research] Delete button clicked for submission: ${subId}`);
      const sub = allSubmissions.find(s => s.id === subId);
      if (sub) {
        confirmDeleteSubmission(sub);
      } else {
        console.error(`[teacher-research] Submission not found: ${subId}`);
      }
    });
  });

  renderPagination({
    containerId: 'research-pagination',
    currentPage,
    totalPages,
    totalItems: filtered.length,
    pageSize,
    onPageChange: (newPage) => {
      currentPage = newPage;
      renderTable();
    }
  });
}

function openEvalModal(submission) {
  activeSubmission = submission;
  activeEvaluation = (submission.research_evaluations && submission.research_evaluations.length > 0)
    ? submission.research_evaluations[0]
    : null;

  const modal = document.getElementById('eval-modal');
  const titleEl = document.getElementById('eval-res-title');
  const authorEl = document.getElementById('eval-res-author');
  const fieldEl = document.getElementById('eval-res-field');
  const gradeEl = document.getElementById('eval-res-grade');
  const dateEl = document.getElementById('eval-res-date');
  const summaryEl = document.getElementById('eval-res-summary');
  const linkBox = document.getElementById('eval-file-link-box');

  const studentName = submission.profiles?.full_name || submission.guest_name || 'طالب مجهول';
  const gradeSection = submission.profiles 
    ? `${submission.profiles.grade || ''} / ${submission.profiles.section || ''}` 
    : `${submission.guest_grade || ''} / ${submission.guest_section || ''}`;

  titleEl.textContent = submission.title || 'بحث بدون عنوان';
  authorEl.textContent = studentName;
  fieldEl.textContent = submission.field || 'عام';
  gradeEl.textContent = gradeSection.trim() !== '/' ? gradeSection : 'زائر المنصة';
  dateEl.textContent = formatDate(submission.submitted_at);
  summaryEl.textContent = submission.summary ? `ملخص البحث: ${submission.summary}` : 'لا يوجد ملخص مكتوب لهذا البحث.';

  if (submission.file_url) {
    linkBox.innerHTML = `
      <a href="${escapeHtml(submission.file_url)}" target="_blank" class="btn btn-outline btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        📥 تحميل أو استعراض مستند البحث المرفوع
      </a>
    `;
  } else {
    linkBox.innerHTML = `<span style="font-size: 0.8rem; color: #ef4444;">لم يتم إرفاق ملف للبحث</span>`;
  }

  // Populate rubric scores
  const scores = activeEvaluation?.criteria_scores || {};
  document.getElementById('score-crit-1').value = scores.crit1 ?? 20;
  document.getElementById('score-crit-2').value = scores.crit2 ?? 20;
  document.getElementById('score-crit-3').value = scores.crit3 ?? 20;
  document.getElementById('score-crit-4').value = scores.crit4 ?? 20;
  document.getElementById('eval-status').value = submission.status === 'under_review' ? 'under_review' : 'evaluated';
  document.getElementById('eval-notes').value = activeEvaluation?.notes || '';

  calculateTotalScore();
  modal.classList.add('active');
}

function closeEvalModal() {
  document.getElementById('eval-modal').classList.remove('active');
  activeSubmission = null;
  activeEvaluation = null;
}

function calculateTotalScore() {
  const s1 = Math.min(25, Math.max(0, parseInt(document.getElementById('score-crit-1').value, 10) || 0));
  const s2 = Math.min(25, Math.max(0, parseInt(document.getElementById('score-crit-2').value, 10) || 0));
  const s3 = Math.min(25, Math.max(0, parseInt(document.getElementById('score-crit-3').value, 10) || 0));
  const s4 = Math.min(25, Math.max(0, parseInt(document.getElementById('score-crit-4').value, 10) || 0));

  const total = s1 + s2 + s3 + s4;
  document.getElementById('eval-total-score').textContent = total;
  return { s1, s2, s3, s4, total };
}

async function saveEvaluation() {
  if (!activeSubmission) return;

  const { s1, s2, s3, s4, total } = calculateTotalScore();
  const status = document.getElementById('eval-status').value;
  const notes = document.getElementById('eval-notes').value.trim();

  const saveBtn = document.getElementById('btn-save-eval');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  try {
    const evalPayload = {
      submission_id: activeSubmission.id,
      teacher_id: currentTeacher?.id || null,
      criteria_scores: { crit1: s1, crit2: s2, crit3: s3, crit4: s4 },
      total_score: total,
      notes,
      evaluated_at: new Date().toISOString()
    };

    if (activeEvaluation?.id) {
      const { data: updatedEval, error: evalErr } = await supabase
        .from('research_evaluations')
        .update(evalPayload)
        .eq('id', activeEvaluation.id)
        .select()
        .single();

      if (evalErr) throw evalErr;
      activeEvaluation = updatedEval;
    } else {
      const { data: newEval, error: evalErr } = await supabase
        .from('research_evaluations')
        .insert([evalPayload])
        .select()
        .single();

      if (evalErr) throw evalErr;
      activeEvaluation = newEval;
    }

    // Update submission status
    const { error: subErr } = await supabase
      .from('research_submissions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeSubmission.id);

    if (subErr) throw subErr;

    // Update in-memory data
    activeSubmission.status = status;
    activeSubmission.research_evaluations = [activeEvaluation];
    const idx = allSubmissions.findIndex(s => s.id === activeSubmission.id);
    if (idx !== -1) {
      allSubmissions[idx] = { ...activeSubmission };
    }

    Toast.success('تم حفظ تقييم وتحكيم البحث العلمي بنجاح');
    closeEvalModal();
    renderTable();
  } catch (err) {
    console.error('Save evaluation error:', err);
    Toast.error('تعذر حفظ التقييم: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 حفظ التقييم والدرجة';
  }
}

function confirmDeleteSubmission(submission) {
  showConfirmModal({
    title: 'حذف البحث العلمي',
    message: `هل أنت متأكد من حذف بحث «${submission.title}»؟ سيتم حذف جميع تقييماته نهائياً.`,
    confirmText: 'نعم، حذف البحث',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from('research_submissions')
          .delete()
          .eq('id', submission.id);

        if (error) throw error;

        allSubmissions = allSubmissions.filter(s => s.id !== submission.id);
        Toast.success('تم حذف البحث بنجاح');
        renderTable();
      } catch (err) {
        console.error('Delete submission error:', err);
        Toast.error('تعذر حذف البحث: ' + err.message);
      }
    }
  });
}
