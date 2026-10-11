/**
 * Teacher Dashboard — Competitions Management Module
 * منصة السراج – مدرسة أبو عبيدة
 */

import { supabase } from '../services/supabase.js';
import { authService } from '../services/auth.js';

let currentCompetitions = [];
let editingCompetitionId = null;
let currentQuestions = [];
let editingQuestionId = null;
let currentTeacherId = null;

export function setupCompetitions() {
  const btnAddComp = document.getElementById('btn-add-comp');
  const btnBackList = document.getElementById('btn-comp-back-list');
  const btnSaveComp = document.getElementById('btn-save-comp');
  const trackEnabledCheck = document.getElementById('comp-track-enabled');
  const coverInput = document.getElementById('comp-cover-input');
  const coverArea = document.getElementById('comp-cover-upload-area');
  const btnRemoveCover = document.getElementById('btn-remove-comp-cover');
  const btnAddQuestion = document.getElementById('btn-add-question');
  const btnSaveQuestion = document.getElementById('btn-save-question');
  const btnCancelQuestion = document.getElementById('btn-cancel-question');
  const qTypeSelect = document.getElementById('q-type');

  if (btnAddComp) btnAddComp.addEventListener('click', () => openCompetitionEditor(null));
  if (btnBackList) btnBackList.addEventListener('click', showCompetitionsList);
  if (btnSaveComp) btnSaveComp.addEventListener('click', saveCompetition);

  if (trackEnabledCheck) {
    trackEnabledCheck.addEventListener('change', () => {
      const fields = document.getElementById('comp-track-fields');
      if (fields) fields.style.display = trackEnabledCheck.checked ? 'block' : 'none';
    });
  }

  // Cover image handling
  if (coverArea && coverInput) {
    coverArea.addEventListener('click', () => coverInput.click());
    coverInput.addEventListener('change', handleCoverUpload);
  }
  if (btnRemoveCover) {
    btnRemoveCover.addEventListener('click', () => {
      const preview = document.getElementById('comp-cover-preview');
      const text = document.getElementById('comp-cover-upload-text');
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
      if (text) text.style.display = 'block';
      btnRemoveCover.style.display = 'none';
      if (coverInput) coverInput.value = '';
    });
  }

  // Question editing
  if (btnAddQuestion) btnAddQuestion.addEventListener('click', () => openQuestionEditor(null));
  if (btnCancelQuestion) btnCancelQuestion.addEventListener('click', closeQuestionEditor);
  if (btnSaveQuestion) btnSaveQuestion.addEventListener('click', saveQuestion);
  if (qTypeSelect) {
    qTypeSelect.addEventListener('change', () => renderQuestionOptionsForm(qTypeSelect.value));
  }

  // Initial load
  loadCompetitions();
}

export async function loadCompetitions() {
  const tbody = document.getElementById('comp-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">جاري تحميل المسابقات...</td></tr>';

  try {
    const { session } = await authService.getSessionAsync();
    currentTeacherId = session?.user?.id || null;

    const { data, error } = await supabase
      .from('competitions')
      .select('*, competition_questions(question_id)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    currentCompetitions = data || [];
    renderCompetitionsTable();
  } catch (err) {
    console.error('Error loading competitions:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444;">تعذر تحميل المسابقات: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderCompetitionsTable() {
  const tbody = document.getElementById('comp-table-body');
  if (!tbody) return;

  if (currentCompetitions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--color-text-muted);">لا توجد مسابقات حالياً. اضغط على «مسابقة جديدة» للبدء.</td></tr>';
    return;
  }

  const statusMap = {
    'active': { label: 'نشطة', color: '#16a34a' },
    'draft': { label: 'مسودة', color: '#eab308' },
    'ended': { label: 'منتهية', color: '#6b7280' },
    'archived': { label: 'مؤرشفة', color: '#9ca3af' }
  };

  tbody.innerHTML = currentCompetitions.map(c => {
    const st = statusMap[c.status] || { label: c.status, color: '#6b7280' };
    const qCount = (c.competition_questions || []).length;
    const dur = c.duration_minutes ? `${c.duration_minutes} دقيقة` : 'غير محدد';
    const start = c.start_date ? formatDate(c.start_date) : 'مفتوحة';

    return `
      <tr>
        <td>
          <div style="font-weight:600;">${escapeHtml(c.title)}</div>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">${escapeHtml(c.description || '')}</div>
          <span style="font-size:0.75rem; background:rgba(0,0,0,0.06); padding:0.15rem 0.4rem; border-radius:4px;">${qCount} أسئلة</span>
          ${c.track_config?.enabled ? '<span style="font-size:0.75rem; background:rgba(18,117,71,0.1); color:#127547; padding:0.15rem 0.4rem; border-radius:4px; margin-right:0.25rem;">مسار تتبعي</span>' : ''}
        </td>
        <td>
          <span class="badge" style="background:${st.color}15; color:${st.color}; border:1px solid ${st.color}40;">
            ${st.label}
          </span>
        </td>
        <td>${dur}</td>
        <td>${start}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-edit-comp" data-id="${c.id}">تعديل والأسئلة</button>
            <button class="btn btn-outline btn-sm btn-toggle-comp-status" data-id="${c.id}" data-status="${c.status}">
              ${c.status === 'active' ? 'تعطيل' : 'تفعيل'}
            </button>
            <button class="btn btn-icon-danger btn-delete-comp" data-id="${c.id}" title="حذف">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach table events
  tbody.querySelectorAll('.btn-edit-comp').forEach(btn => {
    btn.addEventListener('click', () => {
      const comp = currentCompetitions.find(c => c.id === btn.dataset.id);
      if (comp) openCompetitionEditor(comp);
    });
  });

  tbody.querySelectorAll('.btn-toggle-comp-status').forEach(btn => {
    btn.addEventListener('click', () => toggleCompetitionStatus(btn.dataset.id, btn.dataset.status));
  });

  tbody.querySelectorAll('.btn-delete-comp').forEach(btn => {
    btn.addEventListener('click', () => deleteCompetition(btn.dataset.id));
  });
}

function showCompetitionsList() {
  document.getElementById('comp-list-view').style.display = 'block';
  document.getElementById('comp-editor-view').style.display = 'none';
  editingCompetitionId = null;
  loadCompetitions();
}

function openCompetitionEditor(comp = null) {
  document.getElementById('comp-list-view').style.display = 'none';
  document.getElementById('comp-editor-view').style.display = 'block';
  const titleEl = document.getElementById('comp-editor-title');

  if (!comp) {
    editingCompetitionId = null;
    if (titleEl) titleEl.textContent = 'مسابقة جديدة';

    // Reset inputs
    document.getElementById('comp-title').value = '';
    document.getElementById('comp-description').value = '';
    document.getElementById('comp-final-note').value = '';
    document.getElementById('comp-start-date').value = '';
    document.getElementById('comp-end-date').value = '';
    document.getElementById('comp-duration').value = '';
    document.getElementById('comp-max-attempts').value = '';
    document.getElementById('comp-status').value = 'active';
    document.getElementById('comp-result-visibility').checked = true;
    document.getElementById('comp-shuffle').checked = false;

    // Track config reset
    const trackCheck = document.getElementById('comp-track-enabled');
    if (trackCheck) {
      trackCheck.checked = false;
      document.getElementById('comp-track-fields').style.display = 'none';
    }
    document.getElementById('comp-track-type').value = 'numeric';
    document.getElementById('comp-track-start').value = '1';
    document.getElementById('comp-track-end').value = '10';
    document.getElementById('comp-track-step').value = '1';
    document.getElementById('comp-track-unit').value = 'سؤال';

    // Cover reset
    resetCoverPreview('');
    document.getElementById('comp-questions-panel').style.display = 'none';
  } else {
    editingCompetitionId = comp.id;
    if (titleEl) titleEl.textContent = `تعديل: ${comp.title}`;

    document.getElementById('comp-title').value = comp.title || '';
    document.getElementById('comp-description').value = comp.description || '';
    document.getElementById('comp-final-note').value = comp.final_note || '';
    document.getElementById('comp-start-date').value = comp.start_date ? comp.start_date.slice(0, 16) : '';
    document.getElementById('comp-end-date').value = comp.end_date ? comp.end_date.slice(0, 16) : '';
    document.getElementById('comp-duration').value = comp.duration_minutes || '';
    document.getElementById('comp-max-attempts').value = comp.max_attempts || '';
    document.getElementById('comp-status').value = comp.status || 'active';
    document.getElementById('comp-result-visibility').checked = comp.result_visibility !== false;
    document.getElementById('comp-shuffle').checked = !!comp.shuffle_questions;

    // Track config
    const tc = comp.track_config || {};
    const trackCheck = document.getElementById('comp-track-enabled');
    if (trackCheck) {
      trackCheck.checked = !!tc.enabled;
      document.getElementById('comp-track-fields').style.display = tc.enabled ? 'block' : 'none';
    }
    document.getElementById('comp-track-type').value = tc.type || 'numeric';
    document.getElementById('comp-track-start').value = tc.start ?? 1;
    document.getElementById('comp-track-end').value = tc.end ?? 10;
    document.getElementById('comp-track-step').value = tc.step ?? 1;
    document.getElementById('comp-track-unit').value = tc.unit || 'سؤال';

    resetCoverPreview(comp.cover_image_url || '');

    // Show questions panel
    document.getElementById('comp-questions-panel').style.display = 'block';
    loadCompetitionQuestions(comp.id);
  }
}

function resetCoverPreview(url) {
  const preview = document.getElementById('comp-cover-preview');
  const text = document.getElementById('comp-cover-upload-text');
  const btnRemove = document.getElementById('btn-remove-comp-cover');

  if (url) {
    if (preview) { preview.src = url; preview.style.display = 'block'; }
    if (text) text.style.display = 'none';
    if (btnRemove) btnRemove.style.display = 'block';
  } else {
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (text) text.style.display = 'block';
    if (btnRemove) btnRemove.style.display = 'none';
  }
}

function handleCoverUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    resetCoverPreview(event.target.result);
  };
  reader.readAsDataURL(file);
}

async function saveCompetition() {
  const title = (document.getElementById('comp-title').value || '').trim();
  if (!title) {
    window.Toast?.error('يرجى كتابة اسم المسابقة');
    return;
  }

  const description = (document.getElementById('comp-description').value || '').trim();
  const final_note = (document.getElementById('comp-final-note').value || '').trim();
  const start_date = document.getElementById('comp-start-date').value || null;
  const end_date = document.getElementById('comp-end-date').value || null;
  const duration_minutes = parseInt(document.getElementById('comp-duration').value, 10) || null;
  const max_attempts = parseInt(document.getElementById('comp-max-attempts').value, 10) || null;
  const status = document.getElementById('comp-status').value;
  const result_visibility = document.getElementById('comp-result-visibility').checked;
  const shuffle_questions = document.getElementById('comp-shuffle').checked;

  const trackEnabled = document.getElementById('comp-track-enabled').checked;
  const track_config = {
    enabled: trackEnabled,
    type: document.getElementById('comp-track-type').value,
    start: parseInt(document.getElementById('comp-track-start').value, 10) || 1,
    end: parseInt(document.getElementById('comp-track-end').value, 10) || 10,
    step: parseInt(document.getElementById('comp-track-step').value, 10) || 1,
    unit: document.getElementById('comp-track-unit').value || 'سؤال'
  };

  const coverPreview = document.getElementById('comp-cover-preview');
  const cover_image_url = (coverPreview && coverPreview.style.display !== 'none') ? coverPreview.src : null;

  const payload = {
    title,
    description,
    final_note,
    start_date,
    end_date,
    duration_minutes,
    max_attempts,
    status,
    result_visibility,
    shuffle_questions,
    track_config,
    cover_image_url,
    created_by: currentTeacherId
  };

  try {
    if (editingCompetitionId) {
      const { error } = await supabase
        .from('competitions')
        .update(payload)
        .eq('id', editingCompetitionId);
      if (error) throw error;
      window.Toast?.success('تم تحديث المسابقة بنجاح');
    } else {
      const { data, error } = await supabase
        .from('competitions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      editingCompetitionId = data.id;
      window.Toast?.success('تم إنشاء المسابقة بنجاح. يمكنك الآن إضافة الأسئلة.');
      document.getElementById('comp-questions-panel').style.display = 'block';
      loadCompetitionQuestions(data.id);
    }
  } catch (err) {
    console.error('Error saving competition:', err);
    window.Toast?.error(`حدث خطأ أثناء الحفظ: ${err.message}`);
  }
}

async function toggleCompetitionStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'draft' : 'active';
  try {
    const { error } = await supabase
      .from('competitions')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    window.Toast?.success(`تم تغيير حالة المسابقة إلى ${newStatus === 'active' ? 'نشطة' : 'مسودة'}`);
    loadCompetitions();
  } catch (err) {
    window.Toast?.error('تعذر تغيير حالة المسابقة');
  }
}

async function deleteCompetition(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المسابقة وجميع أسئلتها؟')) return;
  try {
    const { error } = await supabase
      .from('competitions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    window.Toast?.success('تم حذف المسابقة بنجاح');
    loadCompetitions();
  } catch (err) {
    window.Toast?.error('تعذر حذف المسابقة');
  }
}

// ── Competition Questions Logic ─────────────────────────────
async function loadCompetitionQuestions(compId) {
  const listEl = document.getElementById('comp-questions-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center; padding:1rem;">جاري تحميل الأسئلة...</div>';

  try {
    const { data, error } = await supabase
      .from('competition_questions')
      .select('order_num, questions(*)')
      .eq('competition_id', compId)
      .order('order_num', { ascending: true });

    if (error) throw error;

    currentQuestions = (data || []).map(d => ({
      order_num: d.order_num,
      ...d.questions
    })).filter(q => q.id);

    renderQuestionsList();
  } catch (err) {
    console.error('Error loading questions:', err);
    listEl.innerHTML = '<div style="color:#ef4444; padding:1rem;">تعذر تحميل الأسئلة.</div>';
  }
}

function renderQuestionsList() {
  const listEl = document.getElementById('comp-questions-list');
  if (!listEl) return;

  if (currentQuestions.length === 0) {
    listEl.innerHTML = '<div class="card" style="padding:1.5rem; text-align:center; color:var(--color-text-muted);">لا توجد أسئلة مضافة بعد. اضغط «+ إضافة سؤال» لإضافة السؤال الأول.</div>';
    return;
  }

  const typeLabels = {
    'mcq': 'اختيار من متعدد',
    'tf': 'صح وخطأ',
    'order': 'ترتيب'
  };

  listEl.innerHTML = currentQuestions.map((q, idx) => {
    let detailsHtml = '';
    if (q.type === 'mcq') {
      const opts = q.metadata?.options || [];
      const corr = q.metadata?.correct_answer || '';
      detailsHtml = `
        <div style="font-size:0.85rem; color:var(--color-text-muted); margin-top:0.35rem;">
          الخيارات: ${opts.map(o => o === corr ? `<strong style="color:var(--color-primary);">${escapeHtml(o)} ✓</strong>` : escapeHtml(o)).join(' | ')}
        </div>
      `;
    } else if (q.type === 'tf') {
      const corr = q.metadata?.correct_answer || '';
      detailsHtml = `<div style="font-size:0.85rem; color:var(--color-primary); margin-top:0.35rem;">الإجابة الصحيحة: ${escapeHtml(corr)}</div>`;
    } else if (q.type === 'order') {
      const items = q.metadata?.correct_order || q.metadata?.items || [];
      detailsHtml = `<div style="font-size:0.85rem; color:var(--color-text-muted); margin-top:0.35rem;">الترتيب الصحيح: ${items.map((it, i) => `${i + 1}. ${escapeHtml(it)}`).join(' ← ')}</div>`;
    }

    return `
      <div class="card" style="padding:1rem; margin-bottom:0.75rem; border-right:4px solid var(--color-primary);">
        <div class="flex justify-between items-center">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="badge" style="background:var(--color-primary); color:white; font-size:0.75rem;">سؤال ${idx + 1}</span>
            <span class="badge" style="background:rgba(0,0,0,0.06); font-size:0.75rem;">${typeLabels[q.type] || q.type}</span>
            <span style="font-size:0.8rem; color:var(--color-text-muted);">${q.points || 1} نقطة</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-edit-question" data-id="${q.id}">تعديل</button>
            <button class="btn btn-icon-danger btn-delete-question" data-id="${q.id}">🗑️</button>
          </div>
        </div>
        <div style="font-weight:600; margin-top:0.5rem; font-size:0.95rem;">${escapeHtml(q.text)}</div>
        ${detailsHtml}
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-edit-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = currentQuestions.find(item => item.id === btn.dataset.id);
      if (q) openQuestionEditor(q);
    });
  });

  listEl.querySelectorAll('.btn-delete-question').forEach(btn => {
    btn.addEventListener('click', () => deleteQuestion(btn.dataset.id));
  });
}

function openQuestionEditor(q = null) {
  const editor = document.getElementById('question-editor');
  if (!editor) return;
  editor.style.display = 'block';

  const titleEl = document.getElementById('q-editor-title');
  const typeSelect = document.getElementById('q-type');
  const textEl = document.getElementById('q-text');
  const pointsEl = document.getElementById('q-points');

  if (!q) {
    editingQuestionId = null;
    if (titleEl) titleEl.textContent = 'سؤال جديد';
    if (typeSelect) typeSelect.value = 'mcq';
    if (textEl) textEl.value = '';
    if (pointsEl) pointsEl.value = '1';
    renderQuestionOptionsForm('mcq');
  } else {
    editingQuestionId = q.id;
    if (titleEl) titleEl.textContent = 'تعديل السؤال';
    if (typeSelect) typeSelect.value = q.type || 'mcq';
    if (textEl) textEl.value = q.text || '';
    if (pointsEl) pointsEl.value = q.points || 1;
    renderQuestionOptionsForm(q.type || 'mcq', q.metadata);
  }

  editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeQuestionEditor() {
  const editor = document.getElementById('question-editor');
  if (editor) editor.style.display = 'none';
  editingQuestionId = null;
}

function renderQuestionOptionsForm(type, metadata = {}) {
  const area = document.getElementById('q-options-area');
  if (!area) return;

  if (type === 'mcq') {
    const opts = metadata.options || ['', '', '', ''];
    const corr = metadata.correct_answer || opts[0] || '';
    area.innerHTML = `
      <div style="margin-top:0.75rem;">
        <label class="form-label" style="font-size:0.85rem; font-weight:600;">الخيارات وحدد الإجابة الصحيحة بالدائرة:</label>
        ${[0, 1, 2, 3].map(i => `
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <input type="radio" name="q-correct-mcq" value="${i}" ${opts[i] && opts[i] === corr ? 'checked' : (i === 0 ? 'checked' : '')} style="width:auto;">
            <input type="text" class="form-control q-mcq-opt" placeholder="الخيار ${i + 1}" value="${escapeHtml(opts[i] || '')}">
          </div>
        `).join('')}
      </div>
    `;
  } else if (type === 'tf') {
    const corr = metadata.correct_answer || 'صح';
    area.innerHTML = `
      <div style="margin-top:0.75rem;">
        <label class="form-label" style="font-size:0.85rem; font-weight:600;">الإجابة الصحيحة:</label>
        <div style="display:flex; gap:1.5rem; margin-top:0.25rem;">
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="radio" name="q-correct-tf" value="صح" ${corr === 'صح' ? 'checked' : ''} style="width:auto;">
            <span>صح</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="radio" name="q-correct-tf" value="خطأ" ${corr === 'خطأ' ? 'checked' : ''} style="width:auto;">
            <span>خطأ</span>
          </label>
        </div>
      </div>
    `;
  } else if (type === 'order') {
    const items = metadata.correct_order || metadata.items || ['', '', '', ''];
    area.innerHTML = `
      <div style="margin-top:0.75rem;">
        <label class="form-label" style="font-size:0.85rem; font-weight:600;">عناصر الترتيب (اكتبها بالترتيب الصحيح من 1 إلى 4):</label>
        ${[0, 1, 2, 3].map(i => `
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <span style="font-weight:700; width:20px;">${i + 1}.</span>
            <input type="text" class="form-control q-order-item" placeholder="العنصر ${i + 1}" value="${escapeHtml(items[i] || '')}">
          </div>
        `).join('')}
      </div>
    `;
  }
}

async function saveQuestion() {
  if (!editingCompetitionId) {
    window.Toast?.error('يرجى حفظ المسابقة أولاً قبل إضافة الأسئلة');
    return;
  }

  const text = (document.getElementById('q-text').value || '').trim();
  if (!text) {
    window.Toast?.error('يرجى إدخال نص السؤال');
    return;
  }

  const type = document.getElementById('q-type').value;
  const points = parseInt(document.getElementById('q-points').value, 10) || 1;
  let metadata = {};

  if (type === 'mcq') {
    const inputs = document.querySelectorAll('.q-mcq-opt');
    const opts = Array.from(inputs).map(inp => (inp.value || '').trim()).filter(Boolean);
    if (opts.length < 2) {
      window.Toast?.error('يرجى إدخال خيارين على الأقل لسؤال الاختيار من متعدد');
      return;
    }
    const selectedRadio = document.querySelector('input[name="q-correct-mcq"]:checked');
    const selIdx = selectedRadio ? parseInt(selectedRadio.value, 10) : 0;
    const correct_answer = (inputs[selIdx] ? inputs[selIdx].value : opts[0]).trim();

    metadata = { options: opts, correct_answer };
  } else if (type === 'tf') {
    const sel = document.querySelector('input[name="q-correct-tf"]:checked');
    const correct_answer = sel ? sel.value : 'صح';
    metadata = { options: ['صح', 'خطأ'], correct_answer };
  } else if (type === 'order') {
    const inputs = document.querySelectorAll('.q-order-item');
    const items = Array.from(inputs).map(inp => (inp.value || '').trim()).filter(Boolean);
    if (items.length < 2) {
      window.Toast?.error('يرجى إدخال عنصرين على الأقل لسؤال الترتيب');
      return;
    }
    metadata = { items, correct_order: [...items] };
  }

  try {
    let questionId = editingQuestionId;

    if (questionId) {
      // Update
      const { error } = await supabase
        .from('questions')
        .update({ type, text, points, metadata })
        .eq('id', questionId);
      if (error) throw error;
      window.Toast?.success('تم تعديل السؤال بنجاح');
    } else {
      // Insert new question
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .insert({ type, text, points, metadata })
        .select()
        .single();
      if (qErr) throw qErr;

      questionId = qData.id;
      const orderNum = currentQuestions.length + 1;

      // Link to competition
      const { error: cqErr } = await supabase
        .from('competition_questions')
        .insert({
          competition_id: editingCompetitionId,
          question_id: questionId,
          order_num: orderNum
        });
      if (cqErr) throw cqErr;

      window.Toast?.success('تمت إضافة السؤال بنجاح');
    }

    closeQuestionEditor();
    loadCompetitionQuestions(editingCompetitionId);
  } catch (err) {
    console.error('Error saving question:', err);
    window.Toast?.error(`تعذر حفظ السؤال: ${err.message}`);
  }
}

async function deleteQuestion(qId) {
  if (!confirm('هل أنت متأكد من حذف هذا السؤال من المسابقة؟')) return;
  try {
    // Delete link
    await supabase
      .from('competition_questions')
      .delete()
      .eq('competition_id', editingCompetitionId)
      .eq('question_id', qId);

    // Delete question record
    await supabase.from('questions').delete().eq('id', qId);

    window.Toast?.success('تم حذف السؤال بنجاح');
    loadCompetitionQuestions(editingCompetitionId);
  } catch (err) {
    window.Toast?.error('تعذر حذف السؤال');
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('ar-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return isoStr;
  }
}
