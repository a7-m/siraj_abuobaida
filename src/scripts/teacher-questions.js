/**
 * Teacher Central Questions Bank Module
 * منصة السراج – مدرسة أبو عبيدة
 * Complete management of public.questions with advanced type builders.
 */

import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let allQuestions = [];
let editingQuestionId = null;

// Pagination and filter state
let currentPage = 1;
const pageSize = 12;
let searchQuery = '';
let typeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('questions');
    setupEvents();
    await loadQuestions();
  } catch (err) {
    console.error('Questions bank init error:', err);
  }
});

function setupEvents() {
  const btnAdd = document.getElementById('btn-add-qbank');
  const btnBack = document.getElementById('btn-back-qbank');
  const btnCancel = document.getElementById('btn-cancel-qbank');
  const btnSave = document.getElementById('btn-save-qbank');
  const searchInput = document.getElementById('q-search');
  const filterSelect = document.getElementById('q-filter-type');
  const typeSelect = document.getElementById('qb-type');
  const uploadBtn = document.getElementById('btn-upload-q-img');
  const fileInput = document.getElementById('qb-file-input');
  const imageUrlInput = document.getElementById('qb-image-url');

  if (btnAdd) btnAdd.addEventListener('click', () => openEditor(null));
  if (btnBack) btnBack.addEventListener('click', closeEditor);
  if (btnCancel) btnCancel.addEventListener('click', closeEditor);
  if (btnSave) btnSave.addEventListener('click', saveQuestion);

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderTable();
    }, 250));
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      typeFilter = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      renderOptionsBuilder(typeSelect.value, {});
    });
  }

  // Question Image upload
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImageUpload);
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', () => {
      updateImagePreview(imageUrlInput.value.trim());
    });
  }
}

async function loadQuestions() {
  const tbody = document.getElementById('qbank-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">جاري تحميل بنك الأسئلة...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allQuestions = data || [];
    renderTable();
  } catch (err) {
    console.error('Error fetching questions:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">تعذر تحميل الأسئلة: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('qbank-table-body');
  if (!tbody) return;

  const filtered = allQuestions.filter(q => {
    const matchesSearch = !searchQuery || (q.text && q.text.toLowerCase().includes(searchQuery));
    const matchesType = typeFilter === 'all' || q.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="td-empty-state">
            <div class="td-empty-icon">❓</div>
            <div class="td-empty-title">لا توجد أسئلة مطابقة</div>
            <div class="td-empty-desc">لم يتم العثور على أي أسئلة في البنك. يمكنك إضافة سؤال جديد الآن.</div>
            <button class="btn btn-primary" onclick="document.getElementById('btn-add-qbank').click()">+ إضافة سؤال جديد</button>
          </div>
        </td>
      </tr>
    `;
    renderPagination({
      containerId: 'qbank-pagination',
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

  const typeLabels = {
    mcq: 'اختيار من متعدد',
    tf: 'صح أو خطأ',
    multi: 'متعدد الخيارات',
    order: 'ترتيب تسلسلي',
    match: 'مطابقة وتوصيل'
  };

  tbody.innerHTML = pageItems.map(q => {
    let previewAnswer = '-';
    const meta = q.metadata || {};

    if (q.type === 'mcq') {
      previewAnswer = meta.correct_answer || (meta.options ? meta.options[meta.correct] : '-');
    } else if (q.type === 'tf') {
      previewAnswer = meta.correct_answer || (meta.correct ? 'صح' : 'خطأ');
    } else if (q.type === 'multi') {
      const correctArr = meta.correct_answers || [];
      previewAnswer = correctArr.length ? correctArr.join('، ') : 'متعدد';
    } else if (q.type === 'order') {
      const ord = meta.correct_order || meta.items || [];
      previewAnswer = ord.slice(0, 3).join(' ← ') + (ord.length > 3 ? '...' : '');
    } else if (q.type === 'match') {
      previewAnswer = `${(meta.pairs || []).length} أزواج مطابقة`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--color-text); line-height: 1.4;">
            ${escapeHtml(q.text)}
          </div>
          ${q.image_url ? `<div style="font-size: 0.78rem; color: var(--color-primary); margin-top: 0.25rem;">🖼️ يحتوي على صورة مرفقة</div>` : ''}
          ${meta.explanation ? `<div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.2rem;">💡 شرح: ${escapeHtml(meta.explanation)}</div>` : ''}
        </td>
        <td>
          <span class="q-type-badge q-type-${q.type}">
            ${typeLabels[q.type] || q.type}
          </span>
        </td>
        <td>
          <strong>${q.points || 1}</strong> نقطة
        </td>
        <td>
          <div style="font-size: 0.85rem; color: var(--color-primary); font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(String(previewAnswer))}
          </div>
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-edit-q" data-id="${q.id}">✏️ تعديل</button>
            <button class="btn btn-outline-danger btn-sm btn-delete-q" data-id="${q.id}">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-q').forEach(b => {
    b.addEventListener('click', () => {
      const q = allQuestions.find(item => item.id === b.dataset.id);
      if (q) openEditor(q);
    });
  });

  tbody.querySelectorAll('.btn-delete-q').forEach(b => {
    b.addEventListener('click', () => {
      const q = allQuestions.find(item => item.id === b.dataset.id);
      if (q) confirmDeleteQuestion(q);
    });
  });

  renderPagination({
    containerId: 'qbank-pagination',
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

function openEditor(q = null) {
  editingQuestionId = q ? q.id : null;

  const listView = document.getElementById('qbank-list-view');
  const editorView = document.getElementById('qbank-editor-view');
  const titleHeader = document.getElementById('qbank-editor-title');
  const typeSelect = document.getElementById('qb-type');
  const pointsInput = document.getElementById('qb-points');
  const textInput = document.getElementById('qb-text');
  const imageUrlInput = document.getElementById('qb-image-url');
  const explanationInput = document.getElementById('qb-explanation');

  titleHeader.textContent = q ? '✏️ تعديل السؤال' : '➕ إضافة سؤال لبنك الأسئلة';
  typeSelect.value = q ? (q.type || 'mcq') : 'mcq';
  pointsInput.value = q ? (q.points || 1) : 1;
  textInput.value = q ? (q.text || '') : '';
  imageUrlInput.value = q ? (q.image_url || '') : '';
  explanationInput.value = q?.metadata?.explanation || '';

  updateImagePreview(imageUrlInput.value);
  renderOptionsBuilder(typeSelect.value, q?.metadata || {});

  listView.style.display = 'none';
  editorView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeEditor() {
  document.getElementById('qbank-list-view').style.display = 'block';
  document.getElementById('qbank-editor-view').style.display = 'none';
  editingQuestionId = null;
}

function renderOptionsBuilder(type, metadata = {}) {
  const container = document.getElementById('qb-options-builder');
  if (!container) return;

  if (type === 'mcq') {
    const opts = Array.isArray(metadata.options) && metadata.options.length >= 2 
      ? metadata.options 
      : ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'];
    let corrAns = metadata.correct_answer || (typeof metadata.correct === 'number' ? opts[metadata.correct] : opts[0]);

    container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.75rem;">خيارات السؤال (حدد الدائرة بجانب الإجابة الصحيحة):</div>
      <div id="mcq-options-list">
        ${opts.map((opt, i) => `
          <div class="q-option-row">
            <input type="radio" name="qb-mcq-correct" value="${i}" ${opt === corrAns ? 'checked' : (i === 0 && !corrAns ? 'checked' : '')}>
            <input type="text" class="form-control qb-opt-input" value="${escapeHtml(opt)}" placeholder="الخيار ${i + 1}">
            ${opts.length > 2 ? `<button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button type="button" id="btn-add-mcq-opt" class="btn btn-sm btn-outline" style="margin-top: 0.5rem;">+ إضافة خيار آخر</button>
    `;

    bindOptionButtons('mcq');

  } else if (type === 'tf') {
    const corr = metadata.correct_answer || (metadata.correct === false ? 'خطأ' : 'صح');
    container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.75rem;">حدد الإجابة الصحيحة:</div>
      <div class="flex gap-4">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; cursor: pointer;">
          <input type="radio" name="qb-tf-correct" value="صح" ${corr === 'صح' ? 'checked' : ''}>
          <span>صح ✓</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; cursor: pointer;">
          <input type="radio" name="qb-tf-correct" value="خطأ" ${corr === 'خطأ' ? 'checked' : ''}>
          <span>خطأ ✕</span>
        </label>
      </div>
    `;

  } else if (type === 'multi') {
    const opts = Array.isArray(metadata.options) && metadata.options.length >= 2 
      ? metadata.options 
      : ['خيار 1', 'خيار 2', 'خيار 3'];
    const correctAnswers = Array.isArray(metadata.correct_answers) ? metadata.correct_answers : [];

    container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.75rem;">الخيارات المتاحة (ضع علامة على كل إجابة صحيحة):</div>
      <div id="multi-options-list">
        ${opts.map((opt, i) => `
          <div class="q-option-row">
            <input type="checkbox" class="qb-multi-check" value="${i}" ${correctAnswers.includes(opt) ? 'checked' : ''}>
            <input type="text" class="form-control qb-opt-input" value="${escapeHtml(opt)}" placeholder="الخيار ${i + 1}">
            ${opts.length > 2 ? `<button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button type="button" id="btn-add-multi-opt" class="btn btn-sm btn-outline" style="margin-top: 0.5rem;">+ إضافة خيار</button>
    `;

    bindOptionButtons('multi');

  } else if (type === 'order') {
    const items = Array.isArray(metadata.correct_order) || Array.isArray(metadata.items) 
      ? (metadata.correct_order || metadata.items) 
      : ['الخطوة الأولى', 'الخطوة الثانية', 'الخطوة الثالثة'];

    container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.75rem;">عناصر الترتيب (اكتبها بالترتيب الصحيح المتسلسل):</div>
      <div id="order-options-list">
        ${items.map((it, i) => `
          <div class="q-option-row">
            <span style="font-weight: 700; width: 25px;">${i + 1}.</span>
            <input type="text" class="form-control qb-order-input" value="${escapeHtml(it)}" placeholder="العنصر ${i + 1}">
            ${items.length > 2 ? `<button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button type="button" id="btn-add-order-opt" class="btn btn-sm btn-outline" style="margin-top: 0.5rem;">+ إضافة عنصر للترتيب</button>
    `;

    bindOptionButtons('order');

  } else if (type === 'match') {
    const pairs = Array.isArray(metadata.pairs) && metadata.pairs.length 
      ? metadata.pairs 
      : [{ left: 'عنصر 1', right: 'مطابقة 1' }, { left: 'عنصر 2', right: 'مطابقة 2' }];

    container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.75rem;">أزواج المطابقة والتوصيل (الطرف الأيمن وما يقابله بالأيسر):</div>
      <div id="match-options-list">
        ${pairs.map((p, i) => `
          <div class="q-option-row" style="gap: 0.5rem;">
            <input type="text" class="form-control qb-match-left" value="${escapeHtml(p.left || '')}" placeholder="الطرف الأيمن">
            <span style="font-weight: 700;">⇄</span>
            <input type="text" class="form-control qb-match-right" value="${escapeHtml(p.right || '')}" placeholder="الطرف المقابل">
            ${pairs.length > 2 ? `<button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button type="button" id="btn-add-match-opt" class="btn btn-sm btn-outline" style="margin-top: 0.5rem;">+ إضافة زوج مطابقة</button>
    `;

    bindOptionButtons('match');
  }
}

function bindOptionButtons(type) {
  const container = document.getElementById('qb-options-builder');
  if (!container) return;

  container.querySelectorAll('.btn-remove-opt').forEach(b => {
    b.onclick = () => {
      b.closest('.q-option-row').remove();
    };
  });

  const addMcqBtn = document.getElementById('btn-add-mcq-opt');
  if (addMcqBtn) {
    addMcqBtn.onclick = () => {
      const list = document.getElementById('mcq-options-list');
      const idx = list.children.length;
      const row = document.createElement('div');
      row.className = 'q-option-row';
      row.innerHTML = `
        <input type="radio" name="qb-mcq-correct" value="${idx}">
        <input type="text" class="form-control qb-opt-input" placeholder="الخيار ${idx + 1}">
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>
      `;
      row.querySelector('.btn-remove-opt').onclick = () => row.remove();
      list.appendChild(row);
    };
  }

  const addMultiBtn = document.getElementById('btn-add-multi-opt');
  if (addMultiBtn) {
    addMultiBtn.onclick = () => {
      const list = document.getElementById('multi-options-list');
      const idx = list.children.length;
      const row = document.createElement('div');
      row.className = 'q-option-row';
      row.innerHTML = `
        <input type="checkbox" class="qb-multi-check" value="${idx}">
        <input type="text" class="form-control qb-opt-input" placeholder="الخيار ${idx + 1}">
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>
      `;
      row.querySelector('.btn-remove-opt').onclick = () => row.remove();
      list.appendChild(row);
    };
  }

  const addOrderBtn = document.getElementById('btn-add-order-opt');
  if (addOrderBtn) {
    addOrderBtn.onclick = () => {
      const list = document.getElementById('order-options-list');
      const idx = list.children.length;
      const row = document.createElement('div');
      row.className = 'q-option-row';
      row.innerHTML = `
        <span style="font-weight: 700; width: 25px;">${idx + 1}.</span>
        <input type="text" class="form-control qb-order-input" placeholder="العنصر ${idx + 1}">
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>
      `;
      row.querySelector('.btn-remove-opt').onclick = () => row.remove();
      list.appendChild(row);
    };
  }

  const addMatchBtn = document.getElementById('btn-add-match-opt');
  if (addMatchBtn) {
    addMatchBtn.onclick = () => {
      const list = document.getElementById('match-options-list');
      const row = document.createElement('div');
      row.className = 'q-option-row';
      row.style.gap = '0.5rem';
      row.innerHTML = `
        <input type="text" class="form-control qb-match-left" placeholder="الطرف الأيمن">
        <span style="font-weight: 700;">⇄</span>
        <input type="text" class="form-control qb-match-right" placeholder="الطرف المقابل">
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-opt">✕</button>
      `;
      row.querySelector('.btn-remove-opt').onclick = () => row.remove();
      list.appendChild(row);
    };
  }
}

async function handleImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 4 * 1024 * 1024) {
    Toast.error('حجم الصورة كبير (الحد الأقصى 4 ميجابايت)');
    return;
  }

  const uploadBtn = document.getElementById('btn-upload-q-img');
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'جاري الرفع...';

  try {
    const ext = file.name.split('.').pop();
    const fileName = `questions/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('public_assets')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('public_assets')
      .getPublicUrl(fileName);

    document.getElementById('qb-image-url').value = publicUrlData.publicUrl;
    updateImagePreview(publicUrlData.publicUrl);
    Toast.success('تم رفع صورة السؤال بنجاح');
  } catch (err) {
    console.error('Question image upload error:', err);
    Toast.error('تعذر رفع الصورة: ' + err.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = '📁 رفع صورة';
  }
}

function updateImagePreview(url) {
  const box = document.getElementById('qb-img-preview-box');
  const img = document.getElementById('qb-img-preview');
  if (url) {
    img.src = url;
    box.style.display = 'block';
  } else {
    img.src = '';
    box.style.display = 'none';
  }
}

async function saveQuestion() {
  const type = document.getElementById('qb-type').value;
  const points = parseInt(document.getElementById('qb-points').value, 10) || 1;
  const text = document.getElementById('qb-text').value.trim();
  const image_url = document.getElementById('qb-image-url').value.trim() || null;
  const explanation = document.getElementById('qb-explanation').value.trim();

  if (!text) {
    Toast.warning('يرجى إدخال نص السؤال');
    document.getElementById('qb-text').focus();
    return;
  }

  let metadata = {};
  if (explanation) metadata.explanation = explanation;

  if (type === 'mcq') {
    const optInputs = Array.from(document.querySelectorAll('#mcq-options-list .qb-opt-input'));
    const options = optInputs.map(i => i.value.trim()).filter(Boolean);
    if (options.length < 2) {
      Toast.warning('يرجى إدخال خيارين على الأقل');
      return;
    }
    const selectedRadio = document.querySelector('input[name="qb-mcq-correct"]:checked');
    const selectedIdx = selectedRadio ? parseInt(selectedRadio.value, 10) : 0;
    const correct_answer = optInputs[selectedIdx] ? optInputs[selectedIdx].value.trim() : options[0];

    metadata = { ...metadata, options, correct_answer };

  } else if (type === 'tf') {
    const selectedRadio = document.querySelector('input[name="qb-tf-correct"]:checked');
    const correct_answer = selectedRadio ? selectedRadio.value : 'صح';
    metadata = { ...metadata, options: ['صح', 'خطأ'], correct_answer };

  } else if (type === 'multi') {
    const rows = Array.from(document.querySelectorAll('#multi-options-list .q-option-row'));
    const options = [];
    const correct_answers = [];

    rows.forEach(r => {
      const val = r.querySelector('.qb-opt-input')?.value.trim();
      const isChecked = r.querySelector('.qb-multi-check')?.checked;
      if (val) {
        options.push(val);
        if (isChecked) correct_answers.push(val);
      }
    });

    if (options.length < 2) {
      Toast.warning('يرجى إدخال خيارين على الأقل');
      return;
    }
    if (correct_answers.length === 0) {
      Toast.warning('يرجى تحديد إجابة صحيحة واحدة على الأقل');
      return;
    }

    metadata = { ...metadata, options, correct_answers };

  } else if (type === 'order') {
    const inputs = Array.from(document.querySelectorAll('#order-options-list .qb-order-input'));
    const items = inputs.map(i => i.value.trim()).filter(Boolean);
    if (items.length < 2) {
      Toast.warning('يرجى إدخال عنصرين على الأقل للترتيب');
      return;
    }
    metadata = { ...metadata, items, correct_order: [...items] };

  } else if (type === 'match') {
    const rows = Array.from(document.querySelectorAll('#match-options-list .q-option-row'));
    const pairs = [];
    rows.forEach(r => {
      const left = r.querySelector('.qb-match-left')?.value.trim();
      const right = r.querySelector('.qb-match-right')?.value.trim();
      if (left && right) {
        pairs.push({ left, right });
      }
    });
    if (pairs.length < 2) {
      Toast.warning('يرجى إدخال زوجين من المطابقة على الأقل');
      return;
    }
    metadata = { ...metadata, pairs };
  }

  const saveBtn = document.getElementById('btn-save-qbank');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  try {
    const payload = {
      type,
      question_type: type,
      text,
      points,
      image_url,
      metadata,
      updated_at: new Date().toISOString()
    };

    if (editingQuestionId) {
      const { data, error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editingQuestionId)
        .select()
        .single();

      if (error) throw error;
      Toast.success('تم تعديل السؤال في البنك بنجاح');
      const idx = allQuestions.findIndex(q => q.id === editingQuestionId);
      if (idx !== -1) allQuestions[idx] = data;
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('questions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      Toast.success('تمت إضافة السؤال لبنك الأسئلة بنجاح');
      allQuestions.unshift(data);
    }

    closeEditor();
    renderTable();
  } catch (err) {
    console.error('Save question error:', err);
    Toast.error('تعذر حفظ السؤال: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 حفظ السؤال في البنك';
  }
}

function confirmDeleteQuestion(q) {
  showConfirmModal({
    title: 'حذف السؤال من البنك',
    message: `هل أنت متأكد من حذف هذا السؤال: «${q.text.substring(0, 50)}...»؟`,
    confirmText: 'نعم، حذف',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', q.id);

        if (error) throw error;

        allQuestions = allQuestions.filter(item => item.id !== q.id);
        Toast.success('تم حذف السؤال بنجاح');
        renderTable();
      } catch (err) {
        console.error('Delete question error:', err);
        Toast.error('تعذر حذف السؤال (قد يكون مرتبطاً بمسابقة أو مرحلة): ' + err.message);
      }
    }
  });
}
