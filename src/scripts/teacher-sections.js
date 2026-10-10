/**
 * Teacher Dashboard — Abu Obaida School Sections Management
 * منصة السراج – مدرسة أبو عبيدة
 */

import { supabase } from '../services/supabase.js';

let allSections = [];

export function setupSections() {
  const gradeFilter = document.getElementById('sec-filter-grade');
  const btnAdd = document.getElementById('btn-add-section-modal');
  const btnCancel = document.getElementById('btn-cancel-new-sec');
  const btnSubmit = document.getElementById('btn-submit-new-sec');

  if (gradeFilter) gradeFilter.addEventListener('change', renderSectionsTable);
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const card = document.getElementById('add-section-card');
      if (card) {
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      const card = document.getElementById('add-section-card');
      if (card) card.style.display = 'none';
    });
  }
  if (btnSubmit) btnSubmit.addEventListener('click', handleCreateSection);

  loadSections();
}

export async function loadSections() {
  const tbody = document.getElementById('sections-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">جاري تحميل شعب مدرسة أبو عبيدة...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('school_sections')
      .select('*')
      .order('grade', { ascending: true })
      .order('section_number', { ascending: true });

    if (error) throw error;
    allSections = data || [];
    renderSectionsTable();
  } catch (err) {
    console.error('loadSections error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">تعذر تحميل الشعب: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderSectionsTable() {
  const tbody = document.getElementById('sections-table-body');
  if (!tbody) return;

  const gradeFilter = document.getElementById('sec-filter-grade')?.value || 'all';
  const filtered = allSections.filter(s => {
    if (gradeFilter === 'all') return true;
    return String(s.grade) === gradeFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--color-text-muted);">لا توجد شعب مسجلة لهذا الصف. اضغط «+ إضافة شعبة جديدة» لإضافتها.</td></tr>';
    return;
  }

  const gradeLabels = {
    10: 'الصف العاشر',
    11: 'الصف الحادي عشر',
    12: 'الصف الثاني عشر'
  };

  tbody.innerHTML = filtered.map(s => {
    const gradeName = gradeLabels[s.grade] || `الصف ${s.grade}`;
    const isActive = s.is_active !== false;

    return `
      <tr>
        <td><strong>${gradeName}</strong></td>
        <td>شعبة ${s.section_number}</td>
        <td><span class="badge" style="background:rgba(0,0,0,0.06);">${escapeHtml(s.section_name || `${s.grade}/${s.section_number}`)}</span></td>
        <td>
          <button class="btn btn-sm btn-toggle-sec" data-id="${s.id}" data-active="${isActive}" style="border-radius:999px; padding:0.25rem 0.75rem; font-size:0.8rem; background:${isActive ? '#16a34a' : '#9ca3af'}; color:white; border:none; cursor:pointer;">
            ${isActive ? '✓ مفعلة' : '✕ معطلة'}
          </button>
        </td>
        <td style="font-size:0.85rem; color:var(--color-text-muted);">${formatDate(s.created_at)}</td>
        <td>
          <button class="btn btn-icon-danger btn-delete-sec" data-id="${s.id}" title="حذف الشعبة">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-toggle-sec').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const currentActive = btn.dataset.active === 'true';
      toggleSectionActive(id, currentActive);
    });
  });

  tbody.querySelectorAll('.btn-delete-sec').forEach(btn => {
    btn.addEventListener('click', () => deleteSection(btn.dataset.id));
  });
}

async function handleCreateSection() {
  const grade = parseInt(document.getElementById('new-sec-grade').value, 10);
  const num = parseInt(document.getElementById('new-sec-num').value, 10);
  let name = (document.getElementById('new-sec-name').value || '').trim();

  if (!grade || !num || num < 1) {
    window.Toast?.error('يرجى تحديد الصف ورقم الشعبة بشكل صحيح');
    return;
  }

  if (!name) {
    name = `${grade}/${num}`;
  }

  try {
    const { error } = await supabase
      .from('school_sections')
      .upsert({
        grade,
        section_number: num,
        section_name: name,
        is_active: true
      }, { onConflict: 'grade, section_number' });

    if (error) throw error;
    window.Toast?.success(`تمت إضافة شعبة ${name} لمدرسة أبو عبيدة بنجاح`);

    document.getElementById('new-sec-num').value = '';
    document.getElementById('new-sec-name').value = '';
    document.getElementById('add-section-card').style.display = 'none';

    loadSections();
  } catch (err) {
    console.error('handleCreateSection error:', err);
    window.Toast?.error(`تعذر إضافة الشعبة: ${err.message}`);
  }
}

async function toggleSectionActive(id, currentActive) {
  try {
    const { error } = await supabase
      .from('school_sections')
      .update({ is_active: !currentActive })
      .eq('id', id);

    if (error) throw error;
    window.Toast?.success(`تم ${!currentActive ? 'تفعيل' : 'تعطيل'} الشعبة بنجاح`);
    loadSections();
  } catch (err) {
    window.Toast?.error('تعذر تحديث حالة الشعبة');
  }
}

async function deleteSection(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الشعبة؟')) return;
  try {
    const { error } = await supabase
      .from('school_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    window.Toast?.success('تم حذف الشعبة بنجاح');
    loadSections();
  } catch (err) {
    window.Toast?.error('تعذر حذف الشعبة');
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
