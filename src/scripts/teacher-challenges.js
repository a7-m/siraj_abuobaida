/**
 * Teacher Dashboard — Challenges & "طوّر نفسك" Management Module
 * منصة السراج – مدرسة أبو عبيدة
 */

import { supabase } from '../services/supabase.js';

let currentChallenges = [];
let challengeCategories = [];
let editingChallengeId = null;
let currentLevels = [];
let editingLevelId = null;
let currentLevelQuestions = [];
let editingLevelQuestionId = null;

export function setupChallenges() {
  const btnAddChal = document.getElementById('btn-add-chal');
  const btnBackList = document.getElementById('btn-chal-back-list');
  const btnSaveChal = document.getElementById('btn-save-chal');
  const catFilter = document.getElementById('chal-filter-category');

  // Level buttons
  const btnAddLevel = document.getElementById('btn-add-level');
  const btnCancelLevel = document.getElementById('btn-cancel-level');
  const btnSaveLevel = document.getElementById('btn-save-level');

  // Level Question buttons
  const btnAddLq = document.getElementById('btn-add-level-question');
  const btnCancelLq = document.getElementById('btn-cancel-lq');
  const btnSaveLq = document.getElementById('btn-save-lq');
  const lqTypeSelect = document.getElementById('lq-type');

  if (btnAddChal) btnAddChal.addEventListener('click', () => openChallengeEditor(null));
  if (btnBackList) btnBackList.addEventListener('click', showChallengesList);
  if (btnSaveChal) btnSaveChal.addEventListener('click', saveChallenge);
  if (catFilter) catFilter.addEventListener('change', renderChallengesTable);

  if (btnAddLevel) btnAddLevel.addEventListener('click', () => openLevelEditor(null));
  if (btnCancelLevel) btnCancelLevel.addEventListener('click', closeLevelEditor);
  if (btnSaveLevel) btnSaveLevel.addEventListener('click', saveLevel);

  if (btnAddLq) btnAddLq.addEventListener('click', () => openLevelQuestionEditor(null));
  if (btnCancelLq) btnCancelLq.addEventListener('click', closeLevelQuestionEditor);
  if (btnSaveLq) btnSaveLq.addEventListener('click', saveLevelQuestion);
  if (lqTypeSelect) {
    lqTypeSelect.addEventListener('change', () => renderLevelQuestionOptionsForm(lqTypeSelect.value));
  }

  // Load initial
  loadCategoriesAndChallenges();
}

export async function loadCategoriesAndChallenges() {
  try {
    // 1. Categories
    const { data: catData, error: categoryError } = await supabase
      .from('challenge_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (categoryError) throw categoryError;

    challengeCategories = catData || [];
    populateCategoryDropdowns();

    // 2. Challenges
    await loadChallenges();
  } catch (err) {
    console.error('Error loading challenges system:', err);
    window.Toast?.error('تعذر تحميل بيانات التحديات. تحقق من الاتصال وحاول مرة أخرى.');
  }
}

function populateCategoryDropdowns() {
  const filterEl = document.getElementById('chal-filter-category');
  const selectEl = document.getElementById('chal-category-select');

  if (filterEl) {
    filterEl.innerHTML = '<option value="all">جميع الفئات</option>' + 
      challengeCategories.map(c => `<option value="${c.name}">${escapeHtml(c.name)}</option>`).join('');
  }

  if (selectEl) {
    selectEl.innerHTML = '<option value="">بدون فئة</option>' + challengeCategories.map(c => `
      <option value="${c.id}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>
    `).join('');
  }
}

async function loadChallenges() {
  const tbody = document.getElementById('chal-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">جاري تحميل برامج التحدي...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        challenge_levels (
          id, level_number, title, passing_score, paragraph,
          challenge_questions ( question_id )
        )
      `)
      .order('order_num', { ascending: true });

    if (error) throw error;
    currentChallenges = data || [];
    renderChallengesTable();
  } catch (err) {
    console.error('loadChallenges error:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444;">تعذر تحميل البرامج. تحقق من الاتصال والصلاحيات وحاول مرة أخرى.</td></tr>';
  }
}

function renderChallengesTable() {
  const tbody = document.getElementById('chal-table-body');
  if (!tbody) return;

  const catFilter = document.getElementById('chal-filter-category')?.value || 'all';
  const filtered = currentChallenges.filter(ch => {
    if (catFilter === 'all') return true;
    return ch.category_name === catFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--color-text-muted);">لا توجد برامج مسجلة. اضغط «+ برنامج جديد» لإضافة البرنامج الأول.</td></tr>';
    return;
  }

  const statusMap = {
    'active': { label: 'نشط', color: '#16a34a' },
    'draft': { label: 'مسودة', color: '#eab308' },
    'archived': { label: 'مؤرشف', color: '#9ca3af' },
    'inactive': { label: 'غير نشط', color: '#9ca3af' }
  };

  tbody.innerHTML = filtered.map(ch => {
    const st = statusMap[ch.status] || { label: ch.status, color: '#6b7280' };
    const levelsCount = (ch.challenge_levels || []).length;

    return `
      <tr>
        <td>
          <div style="font-weight:600;">${escapeHtml(ch.title)}</div>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">${escapeHtml(ch.description || '')}</div>
        </td>
        <td>
          <span class="badge" style="background:rgba(0,0,0,0.06); font-size:0.8rem;">
            ${escapeHtml(ch.category_name || 'عام')}
          </span>
        </td>
        <td>
          <span style="font-weight:600; color:var(--color-primary);">${levelsCount} مراحل</span>
        </td>
        <td>
          <span class="badge" style="background:${st.color}15; color:${st.color}; border:1px solid ${st.color}40;">
            ${st.label}
          </span>
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-edit-chal" data-id="${ch.id}">إدارة المراحل والتعديل</button>
            <button class="btn btn-outline btn-sm btn-toggle-chal-status" data-id="${ch.id}" data-status="${ch.status}">
              ${ch.status === 'active' ? 'تعطيل' : 'تفعيل'}
            </button>
            <button class="btn btn-icon-danger btn-delete-chal" data-id="${ch.id}" title="حذف">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Table listeners
  tbody.querySelectorAll('.btn-edit-chal').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = currentChallenges.find(c => c.id === btn.dataset.id);
      if (ch) openChallengeEditor(ch);
    });
  });

  tbody.querySelectorAll('.btn-toggle-chal-status').forEach(btn => {
    btn.addEventListener('click', () => toggleChallengeStatus(btn.dataset.id, btn.dataset.status));
  });

  tbody.querySelectorAll('.btn-delete-chal').forEach(btn => {
    btn.addEventListener('click', () => deleteChallenge(btn.dataset.id));
  });
}

function showChallengesList() {
  document.getElementById('chal-list-view').style.display = 'block';
  document.getElementById('chal-editor-view').style.display = 'none';
  editingChallengeId = null;
  loadChallenges();
}

function openChallengeEditor(ch = null) {
  document.getElementById('chal-list-view').style.display = 'none';
  document.getElementById('chal-editor-view').style.display = 'block';
  const titleEl = document.getElementById('chal-editor-title');

  if (!ch) {
    editingChallengeId = null;
    if (titleEl) titleEl.textContent = 'برنامج جديد';
    document.getElementById('chal-title').value = '';
    document.getElementById('chal-description').value = '';
    document.getElementById('chal-order-num').value = currentChallenges.length + 1;
    document.getElementById('chal-status').value = 'draft';
    document.getElementById('chal-category-select').value = '';

    document.getElementById('chal-levels-panel').style.display = 'none';
  } else {
    editingChallengeId = ch.id;
    if (titleEl) titleEl.textContent = `تعديل البرنامج: ${ch.title}`;
    document.getElementById('chal-title').value = ch.title || '';
    document.getElementById('chal-description').value = ch.description || '';
    document.getElementById('chal-order-num').value = ch.order_num || 1;
    document.getElementById('chal-status').value = ch.status || 'active';

    const catSelect = document.getElementById('chal-category-select');
    if (catSelect && ch.category_id) {
      catSelect.value = ch.category_id;
    }

    document.getElementById('chal-levels-panel').style.display = 'block';
    loadChallengeLevels(ch.id);
  }
}

async function saveChallenge() {
  const title = (document.getElementById('chal-title').value || '').trim();
  if (!title) {
    window.Toast?.error('يرجى إدخال عنوان البرنامج');
    return;
  }

  const description = (document.getElementById('chal-description').value || '').trim();
  const catSelect = document.getElementById('chal-category-select');
  const category_id = catSelect?.value || null;
  const selectedOpt = catSelect && catSelect.value ? catSelect.options[catSelect.selectedIndex] : null;
  const category_name = selectedOpt ? selectedOpt.getAttribute('data-name') : null;
  const order_num = Math.max(1, parseInt(document.getElementById('chal-order-num').value, 10) || 1);
  const status = document.getElementById('chal-status').value;

  const payload = {
    title,
    description,
    category_id,
    category_name,
    order_num,
    status
  };

  if (status === 'active') {
    if (!editingChallengeId) {
      window.Toast?.error('احفظ البرنامج كمسودة أولاً، ثم أضف مرحلة وأسئلتها قبل تفعيله.');
      return;
    }
    if (!await isChallengeReadyToPublish(editingChallengeId)) return;
  }

  const saveButton = document.getElementById('btn-save-chal');
  if (saveButton) saveButton.disabled = true;
  try {
    if (editingChallengeId) {
      const { data, error } = await supabase
        .from('challenges')
        .update(payload)
        .eq('id', editingChallengeId)
        .select('id')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Challenge update was not confirmed');
      currentChallenges = currentChallenges.map(ch => ch.id === data.id ? { ...ch, ...payload } : ch);
      window.Toast?.success('تم تحديث البرنامج بنجاح');
    } else {
      const { data, error } = await supabase
        .from('challenges')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error('Challenge creation was not confirmed');
      editingChallengeId = data.id;
      currentChallenges = [data, ...currentChallenges];
      window.Toast?.success('تم حفظ البرنامج كمسودة. أضف المراحل والأسئلة ثم فعّله.');
      document.getElementById('chal-levels-panel').style.display = 'block';
      await loadChallengeLevels(data.id);
    }
  } catch (err) {
    console.error('Error saving challenge:', err);
    window.Toast?.error('تعذر حفظ البرنامج. تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

async function isChallengeReadyToPublish(challengeId) {
  try {
    const { data: levels, error } = await supabase
      .from('challenge_levels')
      .select('id, passing_score, challenge_questions ( questions ( points ) )')
      .eq('challenge_id', challengeId);
    if (error) throw error;

    if (!levels?.length || levels.some(level => {
      const questions = level.challenge_questions || [];
      const availablePoints = questions.reduce((sum, link) => sum + (link.questions?.points || 1), 0);
      return questions.length === 0 || (level.passing_score || 1) > availablePoints;
    })) {
      window.Toast?.error('لا يمكن تفعيل البرنامج قبل إضافة سؤال واحد على الأقل لكل مرحلة وضبط درجة اجتياز مناسبة.');
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error validating challenge before publishing:', err);
    window.Toast?.error('تعذر التحقق من اكتمال المراحل. لم يتم تفعيل البرنامج؛ حاول مرة أخرى.');
    return false;
  }
}

async function toggleChallengeStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'draft' : 'active';
  if (newStatus === 'active' && !await isChallengeReadyToPublish(id)) return;
  try {
    const { data, error } = await supabase
      .from('challenges')
      .update({ status: newStatus })
      .eq('id', id)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Challenge status update was not confirmed');
    currentChallenges = currentChallenges.map(ch => ch.id === id ? { ...ch, status: newStatus } : ch);
    window.Toast?.success(`تم تغيير حالة البرنامج إلى ${newStatus === 'active' ? 'نشط' : 'مسودة'}`);
    await loadChallenges();
  } catch (err) {
    console.error('Error changing challenge status:', err);
    window.Toast?.error('تعذر تغيير حالة البرنامج. تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
  }
}

async function deleteChallenge(id) {
  const hasProgress = await hasChallengeProgress(id);
  if (hasProgress === null) return;
  if (hasProgress) {
    window.Toast?.error('لا يمكن حذف برنامج له نتائج طلاب محفوظة. غيّر حالته إلى مؤرشف للحفاظ على السجل.');
    return;
  }
  if (!confirm('هل أنت متأكد من حذف هذا البرنامج ومراحله؟ لن تُحذف أسئلة مستخدمة في أنشطة أخرى.')) return;
  try {
    const { data, error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Challenge deletion was not confirmed');
    window.Toast?.success('تم حذف البرنامج بنجاح');
    await loadChallenges();
  } catch (err) {
    console.error('Error deleting challenge:', err);
    window.Toast?.error('تعذر حذف البرنامج. تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
  }
}

async function hasChallengeProgress(challengeId) {
  try {
    const { data: levels, error: levelError } = await supabase
      .from('challenge_levels')
      .select('id')
      .eq('challenge_id', challengeId);
    if (levelError) throw levelError;
    const levelIds = (levels || []).map(level => level.id);
    if (levelIds.length === 0) return false;

    const { count, error } = await supabase
      .from('student_progress')
      .select('id', { count: 'exact', head: true })
      .in('challenge_level_id', levelIds);
    if (error) throw error;
    return (count || 0) > 0;
  } catch (err) {
    console.error('Error checking challenge progress before deletion:', err);
    window.Toast?.error('تعذر التحقق من نتائج الطلاب؛ لم يتم حذف البرنامج.');
    return null;
  }
}

// ── Challenge Levels Logic ────────────────────────────────────
async function loadChallengeLevels(chalId) {
  const listEl = document.getElementById('chal-levels-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center; padding:1rem;">جاري تحميل المراحل...</div>';

  try {
    const { data, error } = await supabase
      .from('challenge_levels')
      .select(`
        id, level_number, title, paragraph, passing_score, created_at,
        challenge_questions (
          order_num,
          questions ( id, type, text, points, metadata )
        )
      `)
      .eq('challenge_id', chalId)
      .order('level_number', { ascending: true });

    if (error) throw error;
    currentLevels = (data || []).map(level => ({
      ...level,
      challenge_questions: (level.challenge_questions || []).sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    }));
    if (editingLevelId) {
      const editedLevel = currentLevels.find(level => level.id === editingLevelId);
      if (editedLevel) {
        currentLevelQuestions = editedLevel.challenge_questions
          .map(link => ({ order_num: link.order_num, ...link.questions }))
          .filter(question => question.id);
        renderLevelQuestionsList();
      }
    }
    renderLevelsList();
  } catch (err) {
    console.error('loadChallengeLevels error:', err);
    listEl.innerHTML = '<div style="color:#ef4444; padding:1rem;">تعذر تحميل المراحل. تحقق من الاتصال والصلاحيات وحاول مرة أخرى.</div>';
  }
}

function renderLevelsList() {
  const listEl = document.getElementById('chal-levels-list');
  if (!listEl) return;

  if (currentLevels.length === 0) {
    listEl.innerHTML = '<div class="card" style="padding:1.5rem; text-align:center; color:var(--color-text-muted);">لا توجد مراحل بعد في هذا البرنامج. اضغط «+ إضافة مرحلة» للبدء.</div>';
    return;
  }

  listEl.innerHTML = currentLevels.map(lvl => {
    const qCount = (lvl.challenge_questions || []).length;
    const passReq = lvl.passing_score || Math.ceil(qCount * 0.6);
    const snippet = lvl.paragraph ? `${escapeHtml(lvl.paragraph.substring(0, 100))}...` : '<em style="color:var(--color-text-muted);">لا يوجد نص قرائي (أسئلة مباشرة)</em>';

    return `
      <div class="card" style="padding:1.25rem; margin-bottom:1rem; border-right:4px solid var(--color-primary);">
        <div class="flex justify-between items-center" style="flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="badge" style="background:var(--color-primary); color:white; font-size:0.85rem;">المستوى ${lvl.level_number}</span>
            <strong style="font-size:1.05rem;">${escapeHtml(lvl.title)}</strong>
          </div>
          <div class="flex gap-2">
            <span class="badge" style="background:rgba(217,119,6,0.12); color:#d97706; font-size:0.8rem; border:1px solid rgba(217,119,6,0.3);">
              🎯 شرط الاجتياز: ${passReq} نقاط
            </span>
            <span class="badge" style="background:rgba(0,0,0,0.06); font-size:0.8rem;">
              📝 ${qCount} أسئلة
            </span>
            <button class="btn btn-outline btn-sm btn-edit-level" data-id="${lvl.id}">تعديل والأسئلة</button>
            <button class="btn btn-icon-danger btn-delete-level" data-id="${lvl.id}" title="حذف">🗑️</button>
          </div>
        </div>
        <div style="margin-top:0.75rem; font-size:0.85rem; color:var(--color-text-muted); background:var(--color-bg-alt); padding:0.6rem 0.8rem; border-radius:6px;">
          📖 ${snippet}
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-edit-level').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = currentLevels.find(l => l.id === btn.dataset.id);
      if (lvl) openLevelEditor(lvl);
    });
  });

  listEl.querySelectorAll('.btn-delete-level').forEach(btn => {
    btn.addEventListener('click', () => deleteLevel(btn.dataset.id));
  });
}

function openLevelEditor(lvl = null) {
  const card = document.getElementById('level-editor-card');
  if (!card) return;
  card.style.display = 'block';

  const titleEl = document.getElementById('level-editor-title');
  const numEl = document.getElementById('level-num');
  const titleInput = document.getElementById('level-title-input');
  const passEl = document.getElementById('level-passing-score');
  const paraEl = document.getElementById('level-paragraph');
  const qPanel = document.getElementById('level-questions-panel');

  if (!lvl) {
    editingLevelId = null;
    if (titleEl) titleEl.textContent = 'إضافة مرحلة جديدة';
    if (numEl) numEl.value = currentLevels.length + 1;
    if (titleInput) titleInput.value = '';
    if (passEl) passEl.value = '2';
    if (paraEl) paraEl.value = '';
    if (qPanel) qPanel.style.display = 'none';
  } else {
    editingLevelId = lvl.id;
    if (titleEl) titleEl.textContent = `تعديل المرحلة ${lvl.level_number}: ${lvl.title}`;
    if (numEl) numEl.value = lvl.level_number || 1;
    if (titleInput) titleInput.value = lvl.title || '';
    if (passEl) passEl.value = lvl.passing_score || 2;
    if (paraEl) paraEl.value = lvl.paragraph || '';
    
    if (qPanel) {
      qPanel.style.display = 'block';
      currentLevelQuestions = (lvl.challenge_questions || []).map(cq => ({
        order_num: cq.order_num,
        ...cq.questions
      })).filter(q => q.id).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      renderLevelQuestionsList();
    }
  }

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeLevelEditor() {
  const card = document.getElementById('level-editor-card');
  if (card) card.style.display = 'none';
  editingLevelId = null;
}

async function saveLevel() {
  if (!editingChallengeId) {
    window.Toast?.error('يرجى حفظ البرنامج أولاً');
    return;
  }

  const title = (document.getElementById('level-title-input').value || '').trim();
  if (!title) {
    window.Toast?.error('يرجى إدخال عنوان المرحلة');
    return;
  }

  const level_number = Number(document.getElementById('level-num').value);
  const passing_score = Number(document.getElementById('level-passing-score').value);
  if (!Number.isInteger(level_number) || level_number < 1 ||
      !Number.isInteger(passing_score) || passing_score < 1) {
    window.Toast?.error('أدخل رقم مرحلة ودرجة اجتياز صحيحين أكبر من صفر');
    return;
  }
  const paragraph = (document.getElementById('level-paragraph').value || '').trim() || null;

  const payload = {
    challenge_id: editingChallengeId,
    level_number,
    title,
    passing_score,
    paragraph
  };

  const saveButton = document.getElementById('btn-save-level');
  if (saveButton) saveButton.disabled = true;
  try {
    if (!editingLevelId && document.getElementById('chal-status').value === 'active') {
      await setChallengeToDraft(editingChallengeId);
      document.getElementById('chal-status').value = 'draft';
    }

    if (editingLevelId) {
      const { data, error } = await supabase
        .from('challenge_levels')
        .update(payload)
        .eq('id', editingLevelId)
        .select('id')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Challenge level update was not confirmed');
      window.Toast?.success('تم تعديل المرحلة بنجاح');
    } else {
      const { data, error } = await supabase
        .from('challenge_levels')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error('Challenge level creation was not confirmed');
      editingLevelId = data.id;
      window.Toast?.success('تمت إضافة المرحلة بنجاح. يمكنك الآن إضافة أسئلتها.');
      document.getElementById('level-questions-panel').style.display = 'block';
      currentLevelQuestions = [];
      renderLevelQuestionsList();
    }

    await loadChallengeLevels(editingChallengeId);
  } catch (err) {
    console.error('saveLevel error:', err);
    window.Toast?.error('تعذر حفظ المرحلة. بقيت بياناتك في النموذج؛ تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

async function deleteLevel(lvlId) {
  const hasProgress = await hasLevelProgress(lvlId);
  if (hasProgress === null) return;
  if (hasProgress) {
    window.Toast?.error('لا يمكن حذف مرحلة لها نتائج محفوظة للطلاب. عدّل محتواها للحفاظ على سجل التقدم.');
    return;
  }
  if (!confirm('هل أنت متأكد من حذف هذه المرحلة وروابط أسئلتها؟ لن تُحذف الأسئلة المشتركة أو نتائج الطلاب.')) return;
  try {
    if (document.getElementById('chal-status').value === 'active') {
      await setChallengeToDraft(editingChallengeId);
      document.getElementById('chal-status').value = 'draft';
    }
    const { data, error } = await supabase
      .from('challenge_levels')
      .delete()
      .eq('id', lvlId)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Challenge level deletion was not confirmed');
    window.Toast?.success('تم حذف المرحلة بنجاح');
    await loadChallengeLevels(editingChallengeId);
  } catch (err) {
    console.error('Error deleting challenge level:', err);
    window.Toast?.error('تعذر حذف المرحلة. تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
  }
}

async function hasLevelProgress(levelId) {
  try {
    const { count, error } = await supabase
      .from('student_progress')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_level_id', levelId);
    if (error) throw error;
    return (count || 0) > 0;
  } catch (err) {
    console.error('Error checking challenge level progress:', err);
    window.Toast?.error('تعذر التحقق من نتائج الطلاب؛ لم يتم حذف المرحلة.');
    return null;
  }
}

async function setChallengeToDraft(challengeId) {
  const { data, error } = await supabase
    .from('challenges')
    .update({ status: 'draft' })
    .eq('id', challengeId)
    .select('id')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Challenge draft status was not confirmed');
  currentChallenges = currentChallenges.map(ch => ch.id === challengeId ? { ...ch, status: 'draft' } : ch);
}
// ── Level Questions Logic ────────────────────────────────────
function renderLevelQuestionsList() {
  const listEl = document.getElementById('level-questions-list');
  if (!listEl) return;

  if (currentLevelQuestions.length === 0) {
    listEl.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--color-text-muted); font-size:0.85rem;">لا توجد أسئلة مضافة بعد لهذه المرحلة.</div>';
    return;
  }

  listEl.innerHTML = currentLevelQuestions.map((q, idx) => {
    let corr = q.metadata?.correct_answer || '';
    return `
      <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:6px; padding:0.75rem; margin-bottom:0.5rem;">
        <div class="flex justify-between items-center">
          <div style="font-size:0.9rem; font-weight:600;">
            <span style="color:var(--color-primary); margin-left:0.35rem;">س ${idx + 1}:</span>
            ${escapeHtml(q.text)}
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm btn-move-lq" data-id="${q.id}" data-direction="-1" aria-label="تحريك السؤال للأعلى" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn btn-outline btn-sm btn-move-lq" data-id="${q.id}" data-direction="1" aria-label="تحريك السؤال للأسفل" ${idx === currentLevelQuestions.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn btn-outline btn-sm btn-edit-lq" data-id="${q.id}">تعديل</button>
            <button class="btn btn-icon-danger btn-delete-lq" data-id="${q.id}">🗑️</button>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:0.25rem;">
          النوع: ${q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'tf' ? 'صح أو خطأ' : escapeHtml(q.type)} · النقاط: ${q.points || 1} · الإجابة الصحيحة: <strong style="color:var(--color-primary);">${escapeHtml(corr)}</strong>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-edit-lq').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = currentLevelQuestions.find(item => item.id === btn.dataset.id);
      if (q) openLevelQuestionEditor(q);
    });
  });

  listEl.querySelectorAll('.btn-delete-lq').forEach(btn => {
    btn.addEventListener('click', () => deleteLevelQuestion(btn.dataset.id));
  });
  listEl.querySelectorAll('.btn-move-lq').forEach(btn => {
    btn.addEventListener('click', () => moveLevelQuestion(btn.dataset.id, Number(btn.dataset.direction)));
  });
}

function openLevelQuestionEditor(q = null) {
  const editor = document.getElementById('level-question-editor');
  if (!editor) return;
  editor.style.display = 'block';

  const titleEl = document.getElementById('lq-editor-title');
  const typeEl = document.getElementById('lq-type');
  const textEl = document.getElementById('lq-text');
  const pointsEl = document.getElementById('lq-points');

  if (!q) {
    editingLevelQuestionId = null;
    if (titleEl) titleEl.textContent = 'سؤال جديد للمرحلة';
    if (typeEl) typeEl.value = 'mcq';
    if (textEl) textEl.value = '';
    if (pointsEl) pointsEl.value = '1';
    renderLevelQuestionOptionsForm('mcq');
  } else {
    editingLevelQuestionId = q.id;
    if (titleEl) titleEl.textContent = 'تعديل السؤال';
    if (typeEl) typeEl.value = q.type || 'mcq';
    if (textEl) textEl.value = q.text || '';
    if (pointsEl) pointsEl.value = q.points || 1;
    const correctIndex = (q.metadata?.options || []).indexOf(q.metadata?.correct_answer);
    renderLevelQuestionOptionsForm(q.type || 'mcq', q.metadata, Math.max(0, correctIndex));
  }
}

function closeLevelQuestionEditor() {
  const editor = document.getElementById('level-question-editor');
  if (editor) editor.style.display = 'none';
  editingLevelQuestionId = null;
}

function renderLevelQuestionOptionsForm(type, metadata = {}, correctIndex = 0) {
  const area = document.getElementById('lq-options-area');
  if (!area) return;

  if (type === 'mcq') {
    const opts = Array.isArray(metadata.options) && metadata.options.length >= 2
      ? metadata.options
      : ['', ''];
    const savedCorrectIndex = opts.indexOf(metadata.correct_answer);
    if (savedCorrectIndex >= 0) correctIndex = savedCorrectIndex;
    correctIndex = Math.max(0, Math.min(correctIndex, opts.length - 1));
    area.innerHTML = `
      <div style="margin-top:0.5rem;">
        <label class="form-label" style="font-size:0.8rem; font-weight:600;">خيارات الإجابة (حد أدنى خياران، وحدد الإجابة الصحيحة):</label>
        <div id="lq-mcq-options">
          ${opts.map((option, i) => `
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
              <input type="radio" name="lq-correct-mcq" value="${i}" ${i === correctIndex ? 'checked' : ''} aria-label="الإجابة الصحيحة للخيار ${i + 1}" style="width:auto;">
              <input type="text" class="form-control lq-mcq-opt" placeholder="الخيار ${i + 1}" value="${escapeHtml(option)}" style="font-size:0.85rem;">
              <button type="button" class="btn btn-outline btn-sm lq-remove-option" data-index="${i}" aria-label="حذف الخيار ${i + 1}" ${opts.length <= 2 ? 'disabled' : ''}>حذف</button>
            </div>
          `).join('')}
        </div>
        <button type="button" id="btn-add-lq-option" class="btn btn-outline btn-sm" style="margin-top:0.35rem;">+ إضافة خيار</button>
      </div>
    `;
    document.getElementById('btn-add-lq-option').addEventListener('click', () => {
      const values = Array.from(area.querySelectorAll('.lq-mcq-opt')).map(input => input.value);
      const selected = Number(area.querySelector('input[name="lq-correct-mcq"]:checked')?.value || 0);
      values.push('');
      renderLevelQuestionOptionsForm(type, { options: values }, selected);
      area.querySelector('.lq-mcq-opt:last-of-type')?.focus();
    });
    area.querySelectorAll('.lq-remove-option').forEach(button => {
      button.addEventListener('click', () => {
        const values = Array.from(area.querySelectorAll('.lq-mcq-opt')).map(input => input.value);
        if (values.length <= 2) return;
        const removedIndex = Number(button.dataset.index);
        const selected = Number(area.querySelector('input[name="lq-correct-mcq"]:checked')?.value || 0);
        values.splice(removedIndex, 1);
        const nextSelected = selected === removedIndex ? Math.min(removedIndex, values.length - 1)
          : selected > removedIndex ? selected - 1 : selected;
        renderLevelQuestionOptionsForm(type, { options: values }, nextSelected);
      });
    });
  } else if (type === 'tf') {
    const corr = metadata.correct_answer || 'صح';
    area.innerHTML = `
      <div style="margin-top:0.5rem;">
        <label class="form-label" style="font-size:0.8rem; font-weight:600;">الإجابة الصحيحة:</label>
        <div style="display:flex; gap:1.5rem; margin-top:0.25rem;">
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="radio" name="lq-correct-tf" value="صح" ${corr === 'صح' ? 'checked' : ''} style="width:auto;">
            <span>صح</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="radio" name="lq-correct-tf" value="خطأ" ${corr === 'خطأ' ? 'checked' : ''} style="width:auto;">
            <span>خطأ</span>
          </label>
        </div>
      </div>
    `;
  }
}

async function saveLevelQuestion() {
  if (!editingLevelId) {
    window.Toast?.error('يرجى حفظ المرحلة أولاً');
    return;
  }

  const text = (document.getElementById('lq-text').value || '').trim();
  if (!text) {
    window.Toast?.error('يرجى إدخال نص السؤال');
    return;
  }

  const type = document.getElementById('lq-type').value;
  const points = Number(document.getElementById('lq-points').value);
  if (!Number.isInteger(points) || points < 1) {
    window.Toast?.error('أدخل درجة صحيحة لا تقل عن نقطة واحدة');
    return;
  }
  let metadata = {};

  if (type === 'mcq') {
    const inputs = document.querySelectorAll('.lq-mcq-opt');
    const opts = Array.from(inputs).map(input => input.value.trim());
    if (opts.length < 2 || opts.some(option => !option)) {
      window.Toast?.error('أدخل خيارين على الأقل، ولا تترك أي خيار فارغًا');
      return;
    }
    if (new Set(opts.map(option => option.toLocaleLowerCase())).size !== opts.length) {
      window.Toast?.error('احذف خيارات الإجابة المكررة قبل الحفظ');
      return;
    }
    const selRadio = document.querySelector('input[name="lq-correct-mcq"]:checked');
    const selIdx = selRadio ? Number(selRadio.value) : -1;
    const correct_answer = selIdx >= 0 && inputs[selIdx] ? inputs[selIdx].value.trim() : '';
    if (!correct_answer) {
      window.Toast?.error('حدد الإجابة الصحيحة قبل الحفظ');
      return;
    }
    metadata = { options: opts, correct_answer };
  } else if (type === 'tf') {
    const selRadio = document.querySelector('input[name="lq-correct-tf"]:checked');
    const correct_answer = selRadio ? selRadio.value : 'صح';
    metadata = { options: ['صح', 'خطأ'], correct_answer };
  }

  const saveButton = document.getElementById('btn-save-lq');
  if (saveButton) saveButton.disabled = true;
  try {
    let questionId = editingLevelQuestionId;

    if (questionId) {
      questionId = await updateQuestionWithoutChangingSharedUses(questionId, { type, text, points, metadata });
      window.Toast?.success('تم تعديل السؤال بنجاح');
    } else {
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .insert({ type, text, points, metadata })
        .select()
        .single();
      if (qErr) throw qErr;
      if (!qData?.id) throw new Error('Question creation was not confirmed');

      questionId = qData.id;
      const orderNum = currentLevelQuestions.length + 1;

      const { error: clqErr } = await supabase
        .from('challenge_questions')
        .insert({
          challenge_level_id: editingLevelId,
          question_id: questionId,
          order_num: orderNum
        });
      if (clqErr) {
        try {
          const { error: cleanupError } = await supabase.from('questions').delete().eq('id', questionId);
          if (cleanupError) throw cleanupError;
        } catch (cleanupError) {
          console.error('Could not clean up question after link failure:', cleanupError);
        }
        throw clqErr;
      }

      window.Toast?.success('تمت إضافة السؤال للمرحلة بنجاح');
    }

    closeLevelQuestionEditor();
    await loadChallengeLevels(editingChallengeId);
  } catch (err) {
    console.error('saveLevelQuestion error:', err);
    window.Toast?.error('تعذر حفظ السؤال في هذه المرحلة. بقيت بياناتك في المحرر؛ تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

async function updateQuestionWithoutChangingSharedUses(questionId, payload) {
  const { data: challengeLinks, error: challengeError } = await supabase
    .from('challenge_questions')
    .select('challenge_level_id')
    .eq('question_id', questionId);
  if (challengeError) throw challengeError;

  const { data: competitionLinks, error: competitionError } = await supabase
    .from('competition_questions')
    .select('competition_id')
    .eq('question_id', questionId);
  if (competitionError) throw competitionError;

  const isShared = (challengeLinks || []).length > 1 || (competitionLinks || []).length > 0;
  if (!isShared) {
    const { data, error } = await supabase
      .from('questions')
      .update(payload)
      .eq('id', questionId)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Question update was not confirmed');
    return questionId;
  }

  const { data: original, error: originalError } = await supabase
    .from('questions')
    .select('image_url')
    .eq('id', questionId)
    .single();
  if (originalError) throw originalError;

  const { data: copy, error: copyError } = await supabase
    .from('questions')
    .insert({ ...payload, image_url: original.image_url })
    .select('id')
    .single();
  if (copyError) throw copyError;
  if (!copy?.id) throw new Error('Question copy creation was not confirmed');

  const { data: updatedLink, error: linkError } = await supabase
    .from('challenge_questions')
    .update({ question_id: copy.id })
    .eq('challenge_level_id', editingLevelId)
    .eq('question_id', questionId)
    .select('question_id')
    .single();
  if (linkError || !updatedLink) {
    try {
      const { error: cleanupError } = await supabase.from('questions').delete().eq('id', copy.id);
      if (cleanupError) throw cleanupError;
    } catch (cleanupError) {
      console.error('Could not clean up question copy after link failure:', cleanupError);
    }
    throw linkError || new Error('Question link update was not confirmed');
  }
  return copy.id;
}

async function deleteLevelQuestion(qId) {
  const activeChallenge = document.getElementById('chal-status').value === 'active';
  const warning = activeChallenge
    ? 'سيتم تحويل البرنامج إلى مسودة لحماية الطلاب. سيُزال السؤال من هذه المرحلة فقط، وستبقى النتائج والأسئلة المستخدمة في أنشطة أخرى محفوظة. هل تريد المتابعة؟'
    : 'سيُزال السؤال من هذه المرحلة فقط، وستبقى النتائج والأسئلة المستخدمة في أنشطة أخرى محفوظة. هل تريد المتابعة؟';
  if (!confirm(warning)) return;
  try {
    if (activeChallenge) {
      await setChallengeToDraft(editingChallengeId);
      document.getElementById('chal-status').value = 'draft';
    }
    const { data, error } = await supabase
      .from('challenge_questions')
      .delete()
      .eq('challenge_level_id', editingLevelId)
      .eq('question_id', qId)
      .select('question_id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Question removal was not confirmed');

    window.Toast?.success('تم حذف السؤال بنجاح');
    await loadChallengeLevels(editingChallengeId);
  } catch (err) {
    console.error('Error removing challenge question:', err);
    window.Toast?.error('تعذر حذف السؤال من المرحلة. لم تُحذف بيانات السؤال أو النتائج.');
  }
}

async function moveLevelQuestion(qId, direction) {
  const index = currentLevelQuestions.findIndex(question => question.id === qId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= currentLevelQuestions.length) return;

  const current = currentLevelQuestions[index];
  const next = currentLevelQuestions[nextIndex];
  try {
    const { data: first, error: firstError } = await supabase
      .from('challenge_questions')
      .update({ order_num: next.order_num })
      .eq('challenge_level_id', editingLevelId)
      .eq('question_id', current.id)
      .select('question_id')
      .single();
    if (firstError) throw firstError;
    if (!first) throw new Error('Question order update was not confirmed');

    const { data: second, error: secondError } = await supabase
      .from('challenge_questions')
      .update({ order_num: current.order_num })
      .eq('challenge_level_id', editingLevelId)
      .eq('question_id', next.id)
      .select('question_id')
      .single();
    if (secondError || !second) {
      const { error: rollbackError } = await supabase
        .from('challenge_questions')
        .update({ order_num: current.order_num })
        .eq('challenge_level_id', editingLevelId)
        .eq('question_id', current.id);
      if (rollbackError) console.error('Could not restore question order after partial failure:', rollbackError);
      throw secondError || new Error('Question order update was not confirmed');
    }

    [current.order_num, next.order_num] = [next.order_num, current.order_num];
    currentLevelQuestions.sort((a, b) => a.order_num - b.order_num);
    renderLevelQuestionsList();
    window.Toast?.success('تم حفظ ترتيب الأسئلة');
  } catch (err) {
    console.error('Error reordering challenge questions:', err);
    window.Toast?.error('تعذر حفظ ترتيب الأسئلة. حاول مرة أخرى.');
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
