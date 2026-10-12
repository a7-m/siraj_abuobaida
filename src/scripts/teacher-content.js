/**
 * Teacher Content Management Module
 * منصة السراج – مدرسة أبو عبيدة
 * Complete CRUD for content_pages with storage upload and rich editor.
 */

import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, formatDate, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let currentTeacher = null;
let allPages = [];
let editingPageId = null;
let currentCoverUrl = '';

// Pagination state
let currentPage = 1;
const pageSize = 10;
let searchQuery = '';
let statusFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const adminData = await initTeacherAdmin('content');
    currentTeacher = adminData.user;

    setupEvents();
    await loadContentPages();
  } catch (err) {
    console.error('Content module init error:', err);
  }
});

function setupEvents() {
  const btnAdd = document.getElementById('btn-add-page');
  const btnBack = document.getElementById('btn-back-list');
  const btnCancel = document.getElementById('btn-cancel-page');
  const btnSave = document.getElementById('btn-save-page');
  const searchInput = document.getElementById('content-search');
  const filterSelect = document.getElementById('content-filter');
  const titleInput = document.getElementById('page-title');
  const slugInput = document.getElementById('page-slug');
  const coverArea = document.getElementById('cover-upload-area');
  const coverInput = document.getElementById('cover-input');
  const btnRemoveCover = document.getElementById('btn-remove-cover');

  if (btnAdd) btnAdd.addEventListener('click', () => openEditor(null));
  if (btnBack) btnBack.addEventListener('click', closeEditor);
  if (btnCancel) btnCancel.addEventListener('click', closeEditor);
  if (btnSave) btnSave.addEventListener('click', savePage);

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

  // Auto slug generation on new page
  if (titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      if (!editingPageId) {
        slugInput.value = generateSlug(titleInput.value);
      }
    });
  }

  // Cover image upload
  if (coverArea && coverInput) {
    coverArea.addEventListener('click', () => coverInput.click());
    coverInput.addEventListener('change', handleCoverUpload);
  }

  if (btnRemoveCover) {
    btnRemoveCover.addEventListener('click', () => {
      currentCoverUrl = '';
      updateCoverPreview('');
    });
  }

  // WYSIWYG commands
  document.querySelectorAll('.wysiwyg-btn[data-command]').forEach(btn => {
    btn.addEventListener('click', () => {
      const command = btn.getAttribute('data-command');
      document.execCommand(command, false, null);
    });
  });

  const btnLink = document.getElementById('btn-insert-link');
  if (btnLink) {
    btnLink.addEventListener('click', () => {
      const url = prompt('أدخل رابط الموقع (URL):', 'https://');
      if (url) document.execCommand('createLink', false, url);
    });
  }

  const btnImg = document.getElementById('btn-insert-image');
  if (btnImg) {
    btnImg.addEventListener('click', () => {
      const url = prompt('أدخل رابط الصورة المباشر (URL):', 'https://');
      if (url) document.execCommand('insertImage', false, url);
    });
  }
}

async function loadContentPages() {
  const tbody = document.getElementById('content-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">جاري تحميل الصفحات...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('content_pages')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    allPages = data || [];
    renderTable();
  } catch (err) {
    console.error('Error fetching pages:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل الصفحات: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('content-table-body');
  if (!tbody) return;

  // Filter
  const filtered = allPages.filter(p => {
    const matchesSearch = !searchQuery || 
      (p.title && p.title.toLowerCase().includes(searchQuery)) ||
      (p.slug && p.slug.toLowerCase().includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="td-empty-state">
            <div class="td-empty-icon">📝</div>
            <div class="td-empty-title">لا توجد صفحات مطابقة</div>
            <div class="td-empty-desc">لم يتم العثور على أي صفحات تعليمية. يمكنك البدء بإنشاء صفحة جديدة الآن.</div>
            <button class="btn btn-primary" onclick="document.getElementById('btn-add-page').click()">+ إضافة صفحة جديدة</button>
          </div>
        </td>
      </tr>
    `;
    renderPagination({
      containerId: 'content-pagination',
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize,
      onPageChange: () => {}
    });
    return;
  }

  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  tbody.innerHTML = pageItems.map(p => `
    <tr>
      <td>
        <div style="font-weight: 700; font-size: 1rem; color: var(--color-text); margin-bottom: 0.25rem;">
          ${escapeHtml(p.title)}
        </div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted); font-family: monospace;">
          slug: <strong>${escapeHtml(p.slug)}</strong>
        </div>
      </td>
      <td>
        <span class="badge ${p.status === 'published' ? 'badge-published' : 'badge-draft'}">
          ${p.status === 'published' ? 'منشور' : 'مسودة'}
        </span>
      </td>
      <td>
        <div style="font-size: 0.85rem; color: var(--color-text);">${formatDate(p.updated_at || p.created_at)}</div>
      </td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-outline btn-sm btn-edit-page" data-id="${p.id}" title="تعديل">✏️ تعديل</button>
          <a href="page.html?slug=${encodeURIComponent(p.slug)}" target="_blank" class="btn btn-outline btn-sm" title="معاينة الصفحة">👁️ معاينة</a>
          <button class="btn btn-outline-danger btn-sm btn-delete-page" data-id="${p.id}" title="حذف">🗑️ حذف</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Bind row buttons - ensure they exist before binding
  const editButtons = tbody.querySelectorAll('.btn-edit-page');
  const deleteButtons = tbody.querySelectorAll('.btn-delete-page');
  
  console.log(`[teacher-content] Binding ${editButtons.length} edit buttons and ${deleteButtons.length} delete buttons`);
  
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const page = allPages.find(p => p.id === id);
      if (page) openEditor(page);
    });
  });

  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const page = allPages.find(p => p.id === id);
      if (page) confirmDeletePage(page);
    });
  });

  renderPagination({
    containerId: 'content-pagination',
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

function openEditor(page = null) {
  editingPageId = page ? page.id : null;
  currentCoverUrl = page ? (page.cover_image || '') : '';

  const listView = document.getElementById('content-list-view');
  const editorView = document.getElementById('content-editor-view');
  const titleHeader = document.getElementById('editor-title');
  const titleInput = document.getElementById('page-title');
  const slugInput = document.getElementById('page-slug');
  const contentEl = document.getElementById('page-content');
  const statusSelect = document.getElementById('page-status');

  titleHeader.textContent = page ? '✏️ تعديل الصفحة التعليمية' : '➕ إضافة صفحة تعليمية جديدة';
  titleInput.value = page ? page.title : '';
  slugInput.value = page ? page.slug : '';
  contentEl.innerHTML = page ? (page.content || '') : '';
  statusSelect.value = page ? (page.status || 'draft') : 'published';

  updateCoverPreview(currentCoverUrl);

  listView.style.display = 'none';
  editorView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeEditor() {
  document.getElementById('content-list-view').style.display = 'block';
  document.getElementById('content-editor-view').style.display = 'none';
  editingPageId = null;
  currentCoverUrl = '';
}

async function handleCoverUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    Toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
    return;
  }

  const uploadText = document.getElementById('cover-upload-text');
  if (uploadText) uploadText.innerHTML = 'جاري رفع الصورة... ⏳';

  try {
    const ext = file.name.split('.').pop();
    const fileName = `content-covers/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('public_assets')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('public_assets')
      .getPublicUrl(fileName);

    currentCoverUrl = publicUrlData.publicUrl;
    updateCoverPreview(currentCoverUrl);
    Toast.success('تم رفع صورة الغلاف بنجاح');
  } catch (err) {
    console.error('Error uploading cover:', err);
    Toast.error('تعذر رفع الصورة: ' + err.message);
    updateCoverPreview(currentCoverUrl);
  }
}

function updateCoverPreview(url) {
  const preview = document.getElementById('cover-preview');
  const uploadText = document.getElementById('cover-upload-text');
  const removeBtn = document.getElementById('btn-remove-cover');
  const coverInput = document.getElementById('cover-input');

  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    uploadText.style.display = 'none';
    removeBtn.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
    uploadText.style.display = 'block';
    uploadText.innerHTML = `
      <span style="font-size: 1.75rem; display: block; margin-bottom: 0.25rem;">🖼️</span>
      <span style="font-size: 0.85rem;">اضغط لاختيار صورة من جهازك</span>
    `;
    removeBtn.style.display = 'none';
    if (coverInput) coverInput.value = '';
  }
}

async function savePage() {
  const title = document.getElementById('page-title').value.trim();
  const slug = generateSlug(document.getElementById('page-slug').value.trim());
  const content = document.getElementById('page-content').innerHTML.trim();
  const status = document.getElementById('page-status').value;

  if (!title) {
    Toast.warning('يرجى إدخال عنوان الصفحة');
    document.getElementById('page-title').focus();
    return;
  }

  if (!slug) {
    Toast.warning('يرجى تحديد المعرّف بالرابط (Slug)');
    document.getElementById('page-slug').focus();
    return;
  }

  if (!content || content === '<br>') {
    Toast.warning('يرجى كتابة محتوى الصفحة');
    return;
  }

  const saveBtn = document.getElementById('btn-save-page');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  try {
    const payload = {
      title,
      slug,
      content,
      cover_image: currentCoverUrl || null,
      status,
      author_id: currentTeacher?.id || null,
      updated_at: new Date().toISOString()
    };

    if (editingPageId) {
      const { data, error } = await supabase
        .from('content_pages')
        .update(payload)
        .eq('id', editingPageId)
        .select()
        .single();

      if (error) throw error;
      Toast.success('تم تحديث الصفحة التعليمية بنجاح');
      
      const idx = allPages.findIndex(p => p.id === editingPageId);
      if (idx !== -1) allPages[idx] = data;
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('content_pages')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      Toast.success('تم إنشاء الصفحة التعليمية بنجاح');
      allPages.unshift(data);
    }

    closeEditor();
    renderTable();
  } catch (err) {
    console.error('Error saving page:', err);
    Toast.error('تعذر حفظ الصفحة: ' + (err.message.includes('unique') ? 'الرابط (Slug) مستخدم بالفعل' : err.message));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 حفظ الصفحة';
  }
}

function confirmDeletePage(page) {
  showConfirmModal({
    title: 'حذف الصفحة التعليمية',
    message: `هل أنت متأكد من رغبتك في حذف صفحة «${page.title}»؟ لن يتمكن الطلاب من الوصول إليها.`,
    confirmText: 'نعم، حذف الصفحة',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from('content_pages')
          .delete()
          .eq('id', page.id);

        if (error) throw error;

        allPages = allPages.filter(p => p.id !== page.id);
        Toast.success('تم حذف الصفحة التعليمية بنجاح');
        renderTable();
      } catch (err) {
        console.error('Delete page error:', err);
        Toast.error('تعذر حذف الصفحة: ' + err.message);
      }
    }
  });
}

function generateSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, '-')
    .replace(/[^\w\u0621-\u064A\-]/g, '');
}
