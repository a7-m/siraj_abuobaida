/**
 * Teacher Users & Students Management Module
 * منصة السراج – مدرسة أبو عبيدة
 * Manage profiles, roles, grades, points, and academic activity history.
 */

import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, formatDate, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let allProfiles = [];
let editingUser = null;

// Pagination and filter state
let currentPage = 1;
const pageSize = 12;
let searchQuery = '';
let roleFilter = 'all';
let gradeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('users');
    setupEvents();
    await loadProfiles();
  } catch (err) {
    console.error('Users module init error:', err);
  }
});

function setupEvents() {
  const searchInput = document.getElementById('usr-search');
  const roleSelect = document.getElementById('usr-filter-role');
  const gradeSelect = document.getElementById('usr-filter-grade');

  const btnCloseEdit = document.getElementById('btn-close-edit-user');
  const btnCancelEdit = document.getElementById('btn-cancel-edit-user');
  const btnSaveEdit = document.getElementById('btn-save-edit-user');

  const btnCloseActivity = document.getElementById('btn-close-activity-modal');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderTable();
    }, 250));
  }

  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      roleFilter = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  if (gradeSelect) {
    gradeSelect.addEventListener('change', (e) => {
      gradeFilter = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);
  if (btnSaveEdit) btnSaveEdit.addEventListener('click', saveUserProfile);

  if (btnCloseActivity) btnCloseActivity.addEventListener('click', closeActivityModal);
}

async function loadProfiles() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">جاري تحميل سجل المستخدمين...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allProfiles = data || [];
    renderTable();
  } catch (err) {
    console.error('Error fetching profiles:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل المستخدمين: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  const filtered = allProfiles.filter(u => {
    const nameMatch = !searchQuery || (u.full_name && u.full_name.toLowerCase().includes(searchQuery));
    const roleMatch = roleFilter === 'all' || u.role === roleFilter;
    const gradeMatch = gradeFilter === 'all' || (u.grade && String(u.grade).includes(gradeFilter));
    return nameMatch && roleMatch && gradeMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="td-empty-state">
            <div class="td-empty-icon">👥</div>
            <div class="td-empty-title">لا يوجد مستخدمون مطابقون</div>
            <div class="td-empty-desc">لم يتم العثور على أي حساب يطابق معايير البحث المحددة.</div>
          </div>
        </td>
      </tr>
    `;
    renderPagination({
      containerId: 'users-pagination',
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

  tbody.innerHTML = pageItems.map(u => {
    const isTeacher = u.role === 'teacher' || u.role === 'admin';
    const roleBadge = isTeacher
      ? '<span class="badge" style="background: rgba(79, 70, 229, 0.15); color: var(--color-primary); border: 1px solid var(--color-primary);">👨‍🏫 معلم</span>'
      : '<span class="badge badge-published">🎓 طالب</span>';

    const gradeText = u.grade ? `الصف ${escapeHtml(String(u.grade))} ${u.section ? `- شعبة ${escapeHtml(String(u.section))}` : ''}` : '-';

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-bg-alt); display: flex; align-items: center; justify-content: center; font-weight: 700; border: 1px solid var(--color-border); color: var(--color-primary);">
              ${(u.full_name || '؟').charAt(0)}
            </div>
            <div>
              <div style="font-weight: 700; color: var(--color-text);">${escapeHtml(u.full_name || 'بدون اسم')}</div>
              <div style="font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace;">ID: ${u.id.substring(0, 8)}...</div>
            </div>
          </div>
        </td>
        <td>${roleBadge}</td>
        <td>
          <span style="font-size: 0.9rem;">${gradeText}</span>
        </td>
        <td>
          <strong style="color: var(--color-primary); font-size: 1rem;">${u.points || u.total_points || 0}</strong> نقطة
        </td>
        <td>
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">${formatDate(u.created_at)}</span>
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-edit-usr" data-id="${u.id}">✏️ تعديل</button>
            <button class="btn btn-outline btn-sm btn-view-act" data-id="${u.id}" title="سجل الأنشطة والنتائج">📊 السجل</button>
            <button class="btn btn-outline-danger btn-sm btn-delete-usr" data-id="${u.id}" data-name="${escapeHtml(u.full_name || 'المستخدم')}" title="حذف الحساب">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const editButtons = tbody.querySelectorAll('.btn-edit-usr');
  const viewButtons = tbody.querySelectorAll('.btn-view-act');
  const deleteButtons = tbody.querySelectorAll('.btn-delete-usr');
  
  console.log(`[teacher-users] Binding ${editButtons.length} edit, ${viewButtons.length} view, ${deleteButtons.length} delete buttons`);
  
  editButtons.forEach(b => {
    b.addEventListener('click', () => {
      const u = allProfiles.find(item => item.id === b.dataset.id);
      if (u) openEditModal(u);
    });
  });

  viewButtons.forEach(b => {
    b.addEventListener('click', () => {
      const u = allProfiles.find(item => item.id === b.dataset.id);
      if (u) openActivityModal(u);
    });
  });

  deleteButtons.forEach(b => {
    b.addEventListener('click', () => {
      const u = allProfiles.find(item => item.id === b.dataset.id);
      if (u) confirmDeleteUser(u);
    });
  });

  renderPagination({
    containerId: 'users-pagination',
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

function openEditModal(user) {
  editingUser = user;
  const modal = document.getElementById('edit-user-modal');
  document.getElementById('edit-user-title').textContent = `تعديل حساب: ${user.full_name || ''}`;
  document.getElementById('eu-name').value = user.full_name || '';
  document.getElementById('eu-role').value = user.role || 'student';
  document.getElementById('eu-grade').value = user.grade || '';
  document.getElementById('eu-section').value = user.section || '';
  document.getElementById('eu-points').value = user.points || user.total_points || 0;

  modal.classList.add('active');
}

function closeEditModal() {
  document.getElementById('edit-user-modal').classList.remove('active');
  editingUser = null;
}

async function saveUserProfile() {
  if (!editingUser) return;

  const full_name = document.getElementById('eu-name').value.trim();
  const role = document.getElementById('eu-role').value;
  const grade = document.getElementById('eu-grade').value.trim() || null;
  const section = document.getElementById('eu-section').value.trim() || null;
  const points = parseInt(document.getElementById('eu-points').value, 10) || 0;

  if (!full_name) {
    Toast.warning('يرجى إدخال اسم المستخدم');
    return;
  }

  const saveBtn = document.getElementById('btn-save-edit-user');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  try {
    const payload = {
      full_name,
      role,
      grade,
      section,
      points,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editingUser.id)
      .select()
      .single();

    if (error) throw error;

    const idx = allProfiles.findIndex(u => u.id === editingUser.id);
    if (idx !== -1) allProfiles[idx] = data;

    Toast.success('تم تحديث بيانات المستخدم بنجاح');
    closeEditModal();
    renderTable();
  } catch (err) {
    console.error('Save profile error:', err);
    Toast.error('تعذر تحديث المستخدم: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 حفظ التعديلات';
  }
}

async function openActivityModal(user) {
  const modal = document.getElementById('user-activity-modal');
  document.getElementById('ua-student-name').textContent = user.full_name || 'طالب مجهول';
  document.getElementById('ua-student-info').textContent = `الصف: ${user.grade || '-'} | الشعبة: ${user.section || '-'} | الدور: ${user.role === 'teacher' ? 'معلم' : 'طالب'}`;

  const compList = document.getElementById('ua-competitions-list');
  const progList = document.getElementById('ua-progress-list');

  compList.innerHTML = '<div style="padding: 1rem; color: var(--color-text-muted);">جاري تحميل محاولات المسابقات...</div>';
  progList.innerHTML = '<div style="padding: 1rem; color: var(--color-text-muted);">جاري تحميل إنجازات القراءة...</div>';

  modal.classList.add('active');

  try {
    // 1. Fetch competition attempts
    const { data: attempts, error: attErr } = await supabase
      .from('competition_attempts')
      .select(`
        id, score, started_at, completed_at, status,
        competitions:competition_id ( title )
      `)
      .eq('student_id', user.id)
      .order('started_at', { ascending: false });

    if (attErr) throw attErr;

    if (!attempts || attempts.length === 0) {
      compList.innerHTML = '<div style="padding: 0.75rem; color: var(--color-text-muted); font-size: 0.88rem;">لا توجد مشاركات في المسابقات لهذا الطالب حتى الآن.</div>';
    } else {
      compList.innerHTML = attempts.map(a => `
        <div style="background: var(--color-bg-alt); padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${escapeHtml(a.competitions?.title || 'مسابقة')}</strong>
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">${formatDate(a.started_at)}</div>
          </div>
          <div style="text-align: left;">
            <span class="badge ${a.status === 'completed' ? 'badge-published' : 'badge-draft'}">${a.status === 'completed' ? 'مكتملة' : a.status}</span>
            <span style="font-weight: 800; color: var(--color-primary); margin-right: 0.5rem;">${a.score || 0} نقطة</span>
          </div>
        </div>
      `).join('');
    }

    // 2. Fetch challenge levels progress
    const { data: progress, error: progErr } = await supabase
      .from('student_progress')
      .select(`
        id, score, is_completed, updated_at,
        challenge_levels:challenge_level_id (
          level_number, title,
          challenges:challenge_id ( title )
        )
      `)
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false });

    if (progErr) throw progErr;

    if (!progress || progress.length === 0) {
      progList.innerHTML = '<div style="padding: 0.75rem; color: var(--color-text-muted); font-size: 0.88rem;">لم يبدأ الطالب أي تحدٍ قرائي بعد.</div>';
    } else {
      progList.innerHTML = progress.map(p => `
        <div style="background: var(--color-bg-alt); padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${escapeHtml(p.challenge_levels?.challenges?.title || 'تحدي قراءة')}</strong> - 
            <span style="font-size: 0.9rem;">المستوى ${p.challenge_levels?.level_number || 1}: ${escapeHtml(p.challenge_levels?.title || '')}</span>
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">${formatDate(p.updated_at)}</div>
          </div>
          <div>
            <span class="badge ${p.is_completed ? 'badge-published' : 'badge-draft'}">${p.is_completed ? 'مجتاز ✓' : 'قيد المحاولة'}</span>
            <span style="font-weight: 700; color: var(--color-primary); margin-right: 0.5rem;">${p.score || 0} نقطة</span>
          </div>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Error fetching student activity:', err);
    compList.innerHTML = `<div style="color: #ef4444; padding: 0.5rem;">تعذر تحميل النتائج: ${escapeHtml(err.message)}</div>`;
    progList.innerHTML = '';
  }
}

function closeActivityModal() {
  document.getElementById('user-activity-modal').classList.remove('active');
}

function confirmDeleteUser(user) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  showConfirmModal({
    title: 'حذف حساب المستخدم',
    message: `هل أنت متأكد من حذف حساب «${user.full_name || 'المستخدم'}»؟${isTeacher ? ' تنبيه: هذا الحساب له دور معلم.' : ''} لن يمكن التراجع عن هذا الإجراء.`,
    confirmText: 'نعم، حذف الحساب',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (error) throw error;

        allProfiles = allProfiles.filter(u => u.id !== user.id);
        Toast.success('تم حذف حساب المستخدم بنجاح');
        renderTable();
      } catch (err) {
        console.error('Delete user error:', err);
        Toast.error('تعذر حذف الحساب: ' + err.message);
      }
    }
  });
}
