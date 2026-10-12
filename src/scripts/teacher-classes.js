/**
 * Teacher School Classes & Sections Management Module
 * منصة السراج – مدرسة أبو عبيدة
 * إدارة الصفوف والشعب الدراسية - CRUD operations with student count and deletion protection.
 */

import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, formatDate, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let allSections = [];
let editingSection = null;

// Pagination and filter state
let currentPage = 1;
const pageSize = 15;
let searchQuery = '';
let gradeFilter = 'all';
let activeOnlyFilter = true;

// Students modal state
let currentSectionForStudents = null;
let studentsInCurrentSection = [];
let selectedStudentIds = [];
let transferMode = 'single'; // 'single' or 'bulk'
let singleTransferStudent = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('classes');
    setupEvents();
    await loadSections();
  } catch (err) {
    console.error('Classes module init error:', err);
  }
});

function setupEvents() {
  const searchInput = document.getElementById('section-search');
  const gradeSelect = document.getElementById('filter-grade');
  const activeCheckbox = document.getElementById('filter-active');
  const btnClearFilters = document.getElementById('btn-clear-filters');

  const btnAddSection = document.getElementById('btn-add-section');
  const btnCloseModal = document.getElementById('btn-close-section-modal');
  const btnCancelModal = document.getElementById('btn-cancel-section-modal');
  const btnSaveSection = document.getElementById('btn-save-section');

  // Students modal events
  const btnCloseStudentsModal = document.getElementById('btn-close-students-modal');
  const btnTransferSelected = document.getElementById('btn-transfer-selected');
  const selectAllStudents = document.getElementById('select-all-students');

  // Transfer modal events
  const btnCloseTransferModal = document.getElementById('btn-close-transfer-modal');
  const btnCancelTransferModal = document.getElementById('btn-cancel-transfer-modal');
  const btnConfirmTransfer = document.getElementById('btn-confirm-transfer');
  const transferNewGrade = document.getElementById('transfer-new-grade');

  // Cannot delete modal events
  const btnCloseCannotDeleteModal = document.getElementById('btn-close-cannot-delete-modal');
  const btnCancelCannotDelete = document.getElementById('btn-cancel-cannot-delete');
  const btnViewStudentsFromDelete = document.getElementById('btn-view-students-from-delete');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      updateClearFiltersButton();
      renderTable();
    }, 250));
  }

  if (gradeSelect) {
    gradeSelect.addEventListener('change', (e) => {
      gradeFilter = e.target.value;
      currentPage = 1;
      updateClearFiltersButton();
      renderTable();
    });
  }

  if (activeCheckbox) {
    activeCheckbox.addEventListener('change', (e) => {
      activeOnlyFilter = e.target.checked;
      currentPage = 1;
      updateClearFiltersButton();
      renderTable();
    });
  }

  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', clearAllFilters);
  }

  if (btnAddSection) btnAddSection.addEventListener('click', openAddModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
  if (btnSaveSection) btnSaveSection.addEventListener('click', saveSection);

  // Students modal
  if (btnCloseStudentsModal) btnCloseStudentsModal.addEventListener('click', closeStudentsModal);
  if (btnTransferSelected) btnTransferSelected.addEventListener('click', openTransferModalForBulk);
  if (selectAllStudents) {
    selectAllStudents.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.student-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      updateSelectedStudents();
    });
  }

  // Transfer modal
  if (btnCloseTransferModal) btnCloseTransferModal.addEventListener('click', closeTransferModal);
  if (btnCancelTransferModal) btnCancelTransferModal.addEventListener('click', closeTransferModal);
  if (btnConfirmTransfer) btnConfirmTransfer.addEventListener('click', confirmTransfer);
  if (transferNewGrade) {
    transferNewGrade.addEventListener('change', async (e) => {
      await loadSectionsForGrade(e.target.value);
    });
  }

  // Cannot delete modal
  if (btnCloseCannotDeleteModal) btnCloseCannotDeleteModal.addEventListener('click', closeCannotDeleteModal);
  if (btnCancelCannotDelete) btnCancelCannotDelete.addEventListener('click', closeCannotDeleteModal);
  if (btnViewStudentsFromDelete) btnViewStudentsFromDelete.addEventListener('click', () => {
    closeCannotDeleteModal();
    if (currentSectionForStudents) {
      openStudentsModal(currentSectionForStudents);
    }
  });
}

function updateClearFiltersButton() {
  const btnClearFilters = document.getElementById('btn-clear-filters');
  if (!btnClearFilters) return;
  
  const hasActiveFilters = searchQuery !== '' || gradeFilter !== 'all' || !activeOnlyFilter;
  btnClearFilters.style.display = hasActiveFilters ? 'inline-flex' : 'none';
}

function clearAllFilters() {
  searchQuery = '';
  gradeFilter = 'all';
  activeOnlyFilter = true;
  currentPage = 1;
  
  const searchInput = document.getElementById('section-search');
  const gradeSelect = document.getElementById('filter-grade');
  const activeCheckbox = document.getElementById('filter-active');
  
  if (searchInput) searchInput.value = '';
  if (gradeSelect) gradeSelect.value = 'all';
  if (activeCheckbox) activeCheckbox.checked = true;
  
  updateClearFiltersButton();
  renderTable();
}

async function loadSections() {
  const tbody = document.getElementById('sections-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">جاري تحميل الشعب الدراسية...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('school_sections')
      .select('*')
      .order('grade', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;
    allSections = data || [];

    // Load student counts for all sections
    await loadStudentCounts();
    
    renderTable();
  } catch (err) {
    console.error('Error fetching sections:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل الشعب: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function loadStudentCounts() {
  try {
    // Get counts grouped by grade and section
    const { data, error } = await supabase
      .from('profiles')
      .select('grade, section');

    if (error) throw error;

    // Count manually since we need to handle text-based grade and section
    const counts = {};
    if (data) {
      data.forEach(profile => {
        if (profile.grade && profile.section) {
          const key = `${profile.grade}_${profile.section}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    }

    // Attach counts to sections
    allSections.forEach(section => {
      const key = `${section.grade}_${section.section_name}`;
      section.student_count = counts[key] || 0;
    });
  } catch (err) {
    console.error('Error loading student counts:', err);
    // Continue without counts
    allSections.forEach(section => {
      section.student_count = 0;
    });
  }
}

function renderTable() {
  const tbody = document.getElementById('sections-table-body');
  if (!tbody) return;

  const filtered = allSections.filter(s => {
    const nameMatch = !searchQuery || (s.section_name && s.section_name.toLowerCase().includes(searchQuery));
    const gradeMatch = gradeFilter === 'all' || s.grade === gradeFilter;
    const activeMatch = !activeOnlyFilter || s.is_active;
    return nameMatch && gradeMatch && activeMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="td-empty-state">
            <div class="td-empty-icon">🏫</div>
            <div class="td-empty-title">لا توجد شعب مطابقة</div>
            <div class="td-empty-desc">لم يتم العثور على أي شعبة تطابق معايير البحث المحددة.</div>
          </div>
        </td>
      </tr>
    `;
    renderPagination({
      containerId: 'sections-pagination',
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

  tbody.innerHTML = pageItems.map(s => {
    const statusBadge = s.is_active
      ? '<span class="badge badge-published">✓ نشطة</span>'
      : '<span class="badge badge-draft">معطلة</span>';

    const studentCountDisplay = s.student_count > 0
      ? `<strong style="color: var(--color-primary); font-size: 1rem;">${s.student_count}</strong> طالب`
      : '<span style="color: var(--color-text-muted);">لا يوجد</span>';

    return `
      <tr>
        <td>
          <strong style="font-size: 1rem; color: var(--color-text);">${escapeHtml(s.grade)}</strong>
        </td>
        <td>
          <span style="font-size: 0.95rem; font-weight: 600;">${escapeHtml(s.section_name)}</span>
        </td>
        <td>
          ${studentCountDisplay}
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">${formatDate(s.created_at)}</span>
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-view-students" data-id="${s.id}" title="عرض الطلاب">👥 عرض الطلاب</button>
            <button class="btn btn-outline btn-sm btn-toggle-status" data-id="${s.id}" data-active="${s.is_active}" title="تبديل الحالة">
              ${s.is_active ? '🔒 تعطيل' : '✅ تفعيل'}
            </button>
            <button class="btn btn-outline btn-sm btn-edit-section" data-id="${s.id}" title="تعديل">✏️ تعديل</button>
            <button class="btn btn-outline-danger btn-sm btn-delete-section" data-id="${s.id}" data-name="${escapeHtml(s.grade)} - ${escapeHtml(s.section_name)}" data-count="${s.student_count}" title="حذف">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind events
  const viewStudentsButtons = tbody.querySelectorAll('.btn-view-students');
  const editButtons = tbody.querySelectorAll('.btn-edit-section');
  const deleteButtons = tbody.querySelectorAll('.btn-delete-section');
  const toggleButtons = tbody.querySelectorAll('.btn-toggle-status');

  viewStudentsButtons.forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = b.dataset.id || b.getAttribute('data-id');
      const section = allSections.find(item => item.id === sectionId);
      if (section) {
        openStudentsModal(section);
      }
    });
  });

  editButtons.forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = b.dataset.id || b.getAttribute('data-id');
      const section = allSections.find(item => item.id === sectionId);
      if (section) {
        openEditModal(section);
      }
    });
  });

  deleteButtons.forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = b.dataset.id || b.getAttribute('data-id');
      const sectionName = b.dataset.name || b.getAttribute('data-name');
      const studentCount = parseInt(b.dataset.count || b.getAttribute('data-count') || '0', 10);
      const section = allSections.find(item => item.id === sectionId);
      if (section) {
        confirmDeleteSection(section, sectionName, studentCount);
      }
    });
  });

  toggleButtons.forEach(b => {
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      const sectionId = b.dataset.id || b.getAttribute('data-id');
      const isActive = b.dataset.active === 'true' || b.getAttribute('data-active') === 'true';
      await toggleSectionStatus(sectionId, isActive);
    });
  });

  renderPagination({
    containerId: 'sections-pagination',
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

function openAddModal() {
  editingSection = null;
  const modal = document.getElementById('section-modal');
  document.getElementById('section-modal-title').textContent = 'إضافة شعبة جديدة';
  document.getElementById('section-grade').value = '';
  document.getElementById('section-name').value = '';
  document.getElementById('section-sort-order').value = '1';
  document.getElementById('section-is-active').checked = true;

  modal.classList.add('active');
  document.getElementById('section-grade').focus();
}

function openEditModal(section) {
  editingSection = section;
  const modal = document.getElementById('section-modal');
  document.getElementById('section-modal-title').textContent = `تعديل الشعبة: ${section.grade} - ${section.section_name}`;
  document.getElementById('section-grade').value = section.grade || '';
  document.getElementById('section-name').value = section.section_name || '';
  document.getElementById('section-sort-order').value = section.sort_order || 1;
  document.getElementById('section-is-active').checked = section.is_active !== false;

  modal.classList.add('active');
  document.getElementById('section-name').focus();
}

function closeModal() {
  document.getElementById('section-modal').classList.remove('active');
  editingSection = null;
}

async function saveSection() {
  const grade = document.getElementById('section-grade').value.trim();
  const section_name = document.getElementById('section-name').value.trim();
  const sort_order = parseInt(document.getElementById('section-sort-order').value, 10) || 0;
  const is_active = document.getElementById('section-is-active').checked;

  // Validation
  if (!grade) {
    Toast.warning('يرجى اختيار الصف الدراسي');
    return;
  }

  if (!section_name) {
    Toast.warning('يرجى إدخال اسم الشعبة');
    return;
  }

  const saveBtn = document.getElementById('btn-save-section');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  try {
    const payload = {
      grade,
      section_name,
      sort_order,
      is_active
    };

    if (editingSection) {
      // Update existing section
      const { data, error } = await supabase
        .from('school_sections')
        .update(payload)
        .eq('id', editingSection.id)
        .select()
        .single();

      if (error) throw error;

      const idx = allSections.findIndex(s => s.id === editingSection.id);
      if (idx !== -1) {
        allSections[idx] = { ...data, student_count: allSections[idx].student_count };
      }

      Toast.success('تم تحديث بيانات الشعبة بنجاح');
    } else {
      // Insert new section
      const { data, error } = await supabase
        .from('school_sections')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          Toast.error('الشعبة موجودة مسبقاً! الصف والشعبة يجب أن يكونا فريدين.');
          return;
        }
        throw error;
      }

      allSections.push({ ...data, student_count: 0 });
      Toast.success('تمت إضافة الشعبة الجديدة بنجاح');
    }

    closeModal();
    renderTable();
  } catch (err) {
    console.error('Save section error:', err);
    Toast.error('تعذر حفظ الشعبة: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 حفظ';
  }
}

async function toggleSectionStatus(sectionId, currentActive) {
  try {
    const newStatus = !currentActive;
    const { data, error } = await supabase
      .from('school_sections')
      .update({ is_active: newStatus })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw error;

    const idx = allSections.findIndex(s => s.id === sectionId);
    if (idx !== -1) {
      allSections[idx].is_active = newStatus;
    }

    Toast.success(newStatus ? 'تم تفعيل الشعبة بنجاح' : 'تم تعطيل الشعبة بنجاح');
    renderTable();
  } catch (err) {
    console.error('Toggle status error:', err);
    Toast.error('تعذر تحديث حالة الشعبة: ' + err.message);
  }
}

function confirmDeleteSection(section, displayName, studentCount) {
  // Prevent deletion if section has students
  if (studentCount > 0) {
    currentSectionForStudents = section;
    const modal = document.getElementById('cannot-delete-modal');
    const message = document.getElementById('cannot-delete-message');
    message.textContent = `لا يمكن حذف الشعبة «${displayName}» لأنها مرتبطة بـ ${studentCount} طالب/طالبة. يرجى أولاً نقل الطلاب إلى شعبة أخرى.`;
    modal.classList.add('active');
    return;
  }

  // Section is safe to delete
  showConfirmModal({
    title: 'حذف الشعبة',
    message: `هل أنت متأكد من حذف الشعبة «${displayName}»؟ لا يمكن التراجع عن هذا الإجراء.`,
    confirmText: 'نعم، حذف الشعبة',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from('school_sections')
          .delete()
          .eq('id', section.id);

        if (error) throw error;

        allSections = allSections.filter(s => s.id !== section.id);
        Toast.success('تم حذف الشعبة بنجاح');
        renderTable();
      } catch (err) {
        console.error('Delete section error:', err);
        Toast.error('تعذر حذف الشعبة: ' + err.message);
      }
    }
  });
}

function closeCannotDeleteModal() {
  document.getElementById('cannot-delete-modal').classList.remove('active');
}

// ========== Students Modal Functions ==========

async function openStudentsModal(section) {
  currentSectionForStudents = section;
  selectedStudentIds = [];
  
  const modal = document.getElementById('students-list-modal');
  const title = document.getElementById('students-modal-title');
  title.textContent = `👥 طلاب ${section.grade} - شعبة ${section.section_name}`;
  
  modal.classList.add('active');
  await loadStudentsForSection(section.grade, section.section_name);
}

function closeStudentsModal() {
  document.getElementById('students-list-modal').classList.remove('active');
  currentSectionForStudents = null;
  studentsInCurrentSection = [];
  selectedStudentIds = [];
}

async function loadStudentsForSection(grade, section) {
  const tbody = document.getElementById('students-table-body');
  const countDisplay = document.getElementById('students-count-display');
  const btnTransferSelected = document.getElementById('btn-transfer-selected');

  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">جاري تحميل الطلاب...</td></tr>';
  btnTransferSelected.style.display = 'none';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('grade', grade)
      .eq('section', section)
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (error) throw error;

    studentsInCurrentSection = data || [];
    countDisplay.textContent = `عدد الطلاب: ${studentsInCurrentSection.length}`;

    if (studentsInCurrentSection.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="td-empty-state">
              <div class="td-empty-icon">👥</div>
              <div class="td-empty-title">لا يوجد طلاب</div>
              <div class="td-empty-desc">لم يتم تسجيل أي طالب في هذه الشعبة بعد.</div>
            </div>
          </td>
        </tr>
      `;
      document.getElementById('select-all-students').checked = false;
      return;
    }

    tbody.innerHTML = studentsInCurrentSection.map(student => `
      <tr>
        <td>
          <input type="checkbox" class="student-checkbox" data-student-id="${student.id}" style="cursor: pointer; width: 18px; height: 18px;">
        </td>
        <td>
          <strong>${escapeHtml(student.full_name || 'غير محدد')}</strong>
        </td>
        <td>
          <span style="color: var(--color-text-muted); font-size: 0.9rem;">${escapeHtml(student.email || 'غير محدد')}</span>
        </td>
        <td>
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">${formatDate(student.created_at)}</span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm btn-transfer-single" data-student-id="${student.id}" data-student-name="${escapeHtml(student.full_name || 'الطالب')}">
            🔄 نقل
          </button>
        </td>
      </tr>
    `).join('');

    // Bind events
    const checkboxes = tbody.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateSelectedStudents);
    });

    const transferButtons = tbody.querySelectorAll('.btn-transfer-single');
    transferButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const studentId = btn.dataset.studentId || btn.getAttribute('data-student-id');
        const studentName = btn.dataset.studentName || btn.getAttribute('data-student-name');
        openTransferModalForSingle(studentId, studentName);
      });
    });

    document.getElementById('select-all-students').checked = false;
  } catch (err) {
    console.error('Error loading students:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل الطلاب: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updateSelectedStudents() {
  const checkboxes = document.querySelectorAll('.student-checkbox:checked');
  selectedStudentIds = Array.from(checkboxes).map(cb => cb.dataset.studentId || cb.getAttribute('data-student-id'));
  
  const btnTransferSelected = document.getElementById('btn-transfer-selected');
  if (selectedStudentIds.length > 0) {
    btnTransferSelected.style.display = 'block';
    btnTransferSelected.textContent = `🔄 نقل المحددين (${selectedStudentIds.length})`;
  } else {
    btnTransferSelected.style.display = 'none';
  }
}

// ========== Transfer Modal Functions ==========

function openTransferModalForSingle(studentId, studentName) {
  transferMode = 'single';
  singleTransferStudent = { id: studentId, name: studentName };
  
  const modal = document.getElementById('transfer-student-modal');
  const title = document.getElementById('transfer-modal-title');
  const fromDisplay = document.getElementById('transfer-from-display');
  
  title.textContent = `🔄 نقل ${studentName}`;
  fromDisplay.textContent = `${currentSectionForStudents.grade} - شعبة ${currentSectionForStudents.section_name}`;
  
  // Reset form
  document.getElementById('transfer-new-grade').value = '';
  document.getElementById('transfer-new-section').value = '';
  document.getElementById('transfer-new-section').disabled = true;
  document.getElementById('transfer-new-section').innerHTML = '<option value="">-- اختر الصف أولاً --</option>';
  
  modal.classList.add('active');
}

function openTransferModalForBulk() {
  if (selectedStudentIds.length === 0) {
    Toast.warning('يرجى اختيار طالب واحد على الأقل');
    return;
  }
  
  transferMode = 'bulk';
  singleTransferStudent = null;
  
  const modal = document.getElementById('transfer-student-modal');
  const title = document.getElementById('transfer-modal-title');
  const fromDisplay = document.getElementById('transfer-from-display');
  
  title.textContent = `🔄 نقل ${selectedStudentIds.length} طالب/طالبة`;
  fromDisplay.textContent = `${currentSectionForStudents.grade} - شعبة ${currentSectionForStudents.section_name}`;
  
  // Reset form
  document.getElementById('transfer-new-grade').value = '';
  document.getElementById('transfer-new-section').value = '';
  document.getElementById('transfer-new-section').disabled = true;
  document.getElementById('transfer-new-section').innerHTML = '<option value="">-- اختر الصف أولاً --</option>';
  
  modal.classList.add('active');
}

function closeTransferModal() {
  document.getElementById('transfer-student-modal').classList.remove('active');
}

async function loadSectionsForGrade(grade) {
  const sectionSelect = document.getElementById('transfer-new-section');
  
  if (!grade) {
    sectionSelect.disabled = true;
    sectionSelect.innerHTML = '<option value="">-- اختر الصف أولاً --</option>';
    return;
  }
  
  sectionSelect.disabled = true;
  sectionSelect.innerHTML = '<option value="">جاري التحميل...</option>';
  
  try {
    const { data, error } = await supabase
      .from('school_sections')
      .select('section_name')
      .eq('grade', grade)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      sectionSelect.innerHTML = '<option value="">لا توجد شعب نشطة لهذا الصف</option>';
      sectionSelect.disabled = true;
      return;
    }
    
    sectionSelect.innerHTML = '<option value="">-- اختر الشعبة --</option>' +
      data.map(s => `<option value="${escapeHtml(s.section_name)}">${escapeHtml(s.section_name)}</option>`).join('');
    sectionSelect.disabled = false;
  } catch (err) {
    console.error('Error loading sections for grade:', err);
    sectionSelect.innerHTML = '<option value="">تعذر تحميل الشعب</option>';
    Toast.error('تعذر تحميل الشعب: ' + err.message);
  }
}

async function confirmTransfer() {
  const newGrade = document.getElementById('transfer-new-grade').value.trim();
  const newSection = document.getElementById('transfer-new-section').value.trim();
  
  if (!newGrade) {
    Toast.warning('يرجى اختيار الصف الجديد');
    return;
  }
  
  if (!newSection) {
    Toast.warning('يرجى اختيار الشعبة الجديدة');
    return;
  }
  
  const btnConfirm = document.getElementById('btn-confirm-transfer');
  btnConfirm.disabled = true;
  btnConfirm.textContent = 'جاري النقل...';
  
  try {
    if (transferMode === 'single' && singleTransferStudent) {
      await transferStudent(singleTransferStudent.id, newGrade, newSection);
      Toast.success(`تم نقل ${singleTransferStudent.name} بنجاح`);
    } else if (transferMode === 'bulk' && selectedStudentIds.length > 0) {
      await transferMultipleStudents(selectedStudentIds, newGrade, newSection);
      Toast.success(`تم نقل ${selectedStudentIds.length} طالب/طالبة بنجاح`);
    }
    
    closeTransferModal();
    
    // Reload students list for current section
    if (currentSectionForStudents) {
      await loadStudentsForSection(currentSectionForStudents.grade, currentSectionForStudents.section_name);
    }
    
    // Reload sections table with updated counts
    await loadSections();
  } catch (err) {
    console.error('Transfer error:', err);
    Toast.error('تعذر نقل الطلاب: ' + err.message);
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.textContent = '✓ تأكيد النقل';
  }
}

async function transferStudent(studentId, newGrade, newSection) {
  const { error } = await supabase
    .from('profiles')
    .update({
      grade: newGrade,
      section: newSection,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId);
  
  if (error) throw error;
}

async function transferMultipleStudents(studentIds, newGrade, newSection) {
  // Transfer all students - Supabase allows multiple IDs with .in()
  const { error } = await supabase
    .from('profiles')
    .update({
      grade: newGrade,
      section: newSection,
      updated_at: new Date().toISOString()
    })
    .in('id', studentIds);
  
  if (error) throw error;
}
