/**
 * Teacher Participants Log & Activities Module
 * منصة السراج – مدرسة أبو عبيدة
 * Comprehensive tracking of all student and guest activity across:
 * 1. Competitions (competition_attempts)
 * 2. Reading Challenges (student_progress)
 * 3. Scientific Research (research_submissions)
 */

import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, formatDate, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const pageSize = 12;
let currentView = 'table'; // 'table' | 'cards'

// Filter states
let searchFilter = '';
let activityFilter = 'all';
let userTypeFilter = 'all';
let gradeFilter = 'all';
let dateFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('participants');
    setupEvents();
    await loadAllParticipantsData();
  } catch (err) {
    console.error('Teacher participants init error:', err);
  }
});

function setupEvents() {
  const searchInput = document.getElementById('filter-search');
  const activitySelect = document.getElementById('filter-activity');
  const userTypeSelect = document.getElementById('filter-user-type');
  const gradeSelect = document.getElementById('filter-grade');
  const dateSelect = document.getElementById('filter-date');
  const btnReset = document.getElementById('btn-reset-filters');
  const btnRefresh = document.getElementById('btn-refresh-participants');
  const btnExport = document.getElementById('btn-export-csv');

  const btnViewTable = document.getElementById('btn-view-table');
  const btnViewCards = document.getElementById('btn-view-cards');

  const btnCloseModal = document.getElementById('btn-close-detail-modal');
  const btnDetailClose = document.getElementById('btn-detail-close');
  const detailModal = document.getElementById('part-detail-modal');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchFilter = e.target.value.trim().toLowerCase();
      currentPage = 1;
      applyFilters();
    }, 250));
  }

  if (activitySelect) {
    activitySelect.addEventListener('change', (e) => {
      activityFilter = e.target.value;
      currentPage = 1;
      applyFilters();
    });
  }

  if (userTypeSelect) {
    userTypeSelect.addEventListener('change', (e) => {
      userTypeFilter = e.target.value;
      currentPage = 1;
      applyFilters();
    });
  }

  if (gradeSelect) {
    gradeSelect.addEventListener('change', (e) => {
      gradeFilter = e.target.value;
      currentPage = 1;
      applyFilters();
    });
  }

  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      dateFilter = e.target.value;
      currentPage = 1;
      applyFilters();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      searchFilter = '';
      activityFilter = 'all';
      userTypeFilter = 'all';
      gradeFilter = 'all';
      dateFilter = 'all';

      if (searchInput) searchInput.value = '';
      if (activitySelect) activitySelect.value = 'all';
      if (userTypeSelect) userTypeSelect.value = 'all';
      if (gradeSelect) gradeSelect.value = 'all';
      if (dateSelect) dateSelect.value = 'all';

      currentPage = 1;
      applyFilters();
      Toast.info('تمت إعادة ضبط الفلاتر');
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      btnRefresh.textContent = 'جاري التحديث...';
      await loadAllParticipantsData();
      Toast.success('تم تحديث السجل بنجاح');
      btnRefresh.disabled = false;
      btnRefresh.textContent = '🔄 تحديث السجل';
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', exportToCSV);
  }

  if (btnViewTable && btnViewCards) {
    btnViewTable.addEventListener('click', () => switchView('table'));
    btnViewCards.addEventListener('click', () => switchView('cards'));
  }

  const closeModal = () => {
    if (detailModal) detailModal.classList.remove('active');
  };

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnDetailClose) btnDetailClose.addEventListener('click', closeModal);
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeModal();
    });
  }
}

function switchView(view) {
  currentView = view;
  const btnTable = document.getElementById('btn-view-table');
  const btnCards = document.getElementById('btn-view-cards');
  const tableView = document.getElementById('part-table-view');
  const cardsView = document.getElementById('part-cards-view');

  if (view === 'table') {
    btnTable?.classList.add('btn-primary');
    btnTable?.classList.remove('btn-outline');
    btnCards?.classList.remove('btn-primary');
    btnCards?.classList.add('btn-outline');
    if (tableView) tableView.style.display = 'block';
    if (cardsView) cardsView.style.display = 'none';
  } else {
    btnCards?.classList.add('btn-primary');
    btnCards?.classList.remove('btn-outline');
    btnTable?.classList.remove('btn-primary');
    btnTable?.classList.add('btn-outline');
    if (tableView) tableView.style.display = 'none';
    if (cardsView) cardsView.style.display = 'grid';
  }

  renderData();
}

/**
 * Fetch and unify data from Supabase
 */
async function loadAllParticipantsData() {
  const tableBody = document.getElementById('part-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem;">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⏳</div>
          <div>جاري جلب بيانات المشاركات من الخادم...</div>
        </td>
      </tr>
    `;
  }

  try {
    const [compRes, readingRes, researchRes] = await Promise.all([
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
          id, student_id, title, summary, field, file_url, status, submitted_at,
          guest_name, guest_grade, guest_section, guest_email,
          profiles ( id, full_name, grade, section, school_name, school_type, email )
        `)
        .order('submitted_at', { ascending: false, nullsFirst: false })
    ]);

    const compAttempts = (compRes.data || []).map(item => {
      const isGuest = !item.student_id;
      const name = item.profiles?.full_name || item.guest_name || 'طالب زائر';
      const grade = item.profiles?.grade || item.guest_grade || '-';
      const section = item.profiles?.section || item.guest_section || '-';
      const school = item.profiles?.school_name || item.guest_school_name || (item.profiles ? 'مدرسة أبو عبيدة' : 'مدرسة أخرى');
      const date = item.submitted_at || item.started_at;

      return {
        id: item.id,
        sourceTable: 'competition_attempts',
        activityType: 'competition',
        activityBadgeLabel: 'مسابقة السراج',
        activityBadgeClass: 'badge-act-comp',
        activityName: item.competitions?.title || 'مسابقة السراج',
        participantName: name,
        isGuest,
        grade,
        section,
        school,
        score: item.total_score !== null && item.total_score !== undefined ? item.total_score : '-',
        status: item.status || 'completed',
        date,
        raw: item
      };
    });

    const readingAttempts = (readingRes.data || []).map(item => {
      const isGuest = !item.student_id;
      const name = item.profiles?.full_name || item.guest_name || 'طالب زائر';
      const grade = item.profiles?.grade || item.guest_grade || '-';
      const section = item.profiles?.section || item.guest_section || '-';
      const school = item.profiles?.school_name || item.guest_school_name || (item.profiles ? 'مدرسة أبو عبيدة' : 'مدرسة أخرى');
      const challengeTitle = item.challenge_levels?.challenges?.title || 'برنامج القراءة';
      const levelTitle = item.challenge_levels?.title || `المستوى ${item.challenge_levels?.level_number || ''}`;

      return {
        id: item.id,
        sourceTable: 'student_progress',
        activityType: 'reading',
        activityBadgeLabel: 'طوّر نفسك',
        activityBadgeClass: 'badge-act-reading',
        activityName: `${challengeTitle} — ${levelTitle}`,
        participantName: name,
        isGuest,
        grade,
        section,
        school,
        score: item.score !== null && item.score !== undefined ? item.score : '-',
        status: item.status || 'completed',
        date: item.completed_at,
        raw: item
      };
    });

    const researchSubmissions = (researchRes.data || []).map(item => {
      const isGuest = !item.student_id;
      const name = item.profiles?.full_name || item.guest_name || 'طالب زائر';
      const grade = item.profiles?.grade || item.guest_grade || '-';
      const section = item.profiles?.section || item.guest_section || '-';
      const school = item.profiles?.school_name || (item.profiles ? 'مدرسة أبو عبيدة' : 'مدرسة أخرى');

      return {
        id: item.id,
        sourceTable: 'research_submissions',
        activityType: 'research',
        activityBadgeLabel: 'البحث العلمي',
        activityBadgeClass: 'badge-act-research',
        activityName: `${item.title || 'بحث علمي'} (${item.field || 'عام'})`,
        participantName: name,
        isGuest,
        grade,
        section,
        school,
        score: item.status === 'evaluated' ? 'تم التقييم' : 'قيد المراجعة',
        status: item.status || 'submitted',
        date: item.submitted_at,
        raw: item
      };
    });

    // Merge all records and sort by date descending
    allRecords = [...compAttempts, ...readingAttempts, ...researchSubmissions].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });

    updateKpiStats(compAttempts, readingAttempts, researchSubmissions);
    applyFilters();

  } catch (err) {
    console.error('Error fetching participants data:', err);
    Toast.error('تعذر جلب سجل المشاركين من قاعدة البيانات');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: #ef4444;">
            حدث خطأ أثناء تحميل السجلات. يرجى المحاولة مرة أخرى.
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Compute and display KPI metrics
 */
function updateKpiStats(comps, reading, research) {
  const total = allRecords.length;
  const regCount = allRecords.filter(r => !r.isGuest).length;
  const guestCount = allRecords.filter(r => r.isGuest).length;

  setStat('stat-total-attempts', total);
  setStat('stat-comp-attempts', comps.length);
  setStat('stat-reading-attempts', reading.length);
  setStat('stat-research-attempts', research.length);
  setStat('stat-reg-students', regCount);
  setStat('stat-guest-participants', guestCount);
}

function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val.toLocaleString('ar-OM');
}

/**
 * Filter data
 */
function applyFilters() {
  const now = new Date();

  filteredRecords = allRecords.filter(item => {
    // 1. Search text filter
    if (searchFilter) {
      const nameMatch = item.participantName.toLowerCase().includes(searchFilter);
      const activityMatch = item.activityName.toLowerCase().includes(searchFilter);
      const schoolMatch = (item.school || '').toLowerCase().includes(searchFilter);
      if (!nameMatch && !activityMatch && !schoolMatch) return false;
    }

    // 2. Activity Type filter
    if (activityFilter !== 'all' && item.activityType !== activityFilter) {
      return false;
    }

    // 3. User type filter
    if (userTypeFilter === 'registered' && item.isGuest) return false;
    if (userTypeFilter === 'guest' && !item.isGuest) return false;

    // 4. Grade filter
    if (gradeFilter !== 'all') {
      const itemGrade = String(item.grade || '').trim();
      if (itemGrade !== gradeFilter && !itemGrade.includes(gradeFilter)) return false;
    }

    // 5. Date filter
    if (dateFilter !== 'all' && item.date) {
      const itemDate = new Date(item.date);
      const diffMs = now.getTime() - itemDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (dateFilter === 'today' && diffHours > 24) return false;
      if (dateFilter === 'week' && diffHours > 24 * 7) return false;
      if (dateFilter === 'month' && diffHours > 24 * 30) return false;
    }

    return true;
  });

  const countEl = document.getElementById('filter-results-count');
  if (countEl) {
    countEl.textContent = `تم العثور على ${filteredRecords.length.toLocaleString('ar-OM')} سجل`;
  }

  renderData();
}

/**
 * Render Table or Cards with Pagination
 */
function renderData() {
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filteredRecords.slice(startIndex, startIndex + pageSize);

  if (currentView === 'table') {
    renderTable(pageItems);
  } else {
    renderCards(pageItems);
  }

  renderPagination({
    containerId: 'part-pagination',
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange: (newPage) => {
      currentPage = newPage;
      renderData();
    }
  });
}

function renderTable(items) {
  const tbody = document.getElementById('part-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 700; color: var(--color-text); margin-bottom: 0.25rem;">لا توجد مشاركات مطابقة</div>
          <div style="color: var(--color-text-muted); font-size: 0.88rem;">جرب تغيير خيارات الفلترة أو مسح شريط البحث.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const userBadge = item.isGuest
      ? `<span class="badge badge-guest">👥 زائر</span>`
      : `<span class="badge badge-reg">🎓 مسجل</span>`;

    const gradeInfo = item.grade && item.grade !== '-'
      ? `<div style="font-size: 0.78rem; color: var(--color-text-muted);">صف ${escapeHtml(item.grade)}${item.section && item.section !== '-' ? `/${escapeHtml(item.section)}` : ''}</div>`
      : '';

    const scoreDisplay = typeof item.score === 'number'
      ? `<span class="modal-act-score">${item.score} نقطة</span>`
      : `<span style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(item.score)}</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--color-text);">${escapeHtml(item.participantName)}</div>
          ${gradeInfo}
          <div style="font-size: 0.75rem; color: var(--color-text-muted);">${escapeHtml(item.school)}</div>
        </td>
        <td>${userBadge}</td>
        <td>
          <span class="badge ${item.activityBadgeClass}">${escapeHtml(item.activityBadgeLabel)}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--color-text);">${escapeHtml(item.activityName)}</div>
        </td>
        <td>${scoreDisplay}</td>
        <td>
          <div style="font-size: 0.85rem;">${formatDate(item.date)}</div>
        </td>
        <td style="text-align: center;">
          <div class="flex gap-1 justify-center">
            <button class="btn btn-outline btn-sm btn-view-item" data-id="${item.id}" data-type="${item.sourceTable}" title="عرض تفاصيل المحاولة">
              👁️ عرض
            </button>
            <button class="btn-icon-danger btn-delete-item" data-id="${item.id}" data-type="${item.sourceTable}" title="حذف السجل">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindActionButtons();
}

function renderCards(items) {
  const container = document.getElementById('part-cards-view');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="part-empty-state">
        <div style="font-size: 2.5rem;">🔍</div>
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-text);">لا توجد مشاركات مطابقة للفلاتر</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const avatarLetter = (item.participantName || 'ط')[0];
    const userBadge = item.isGuest
      ? `<span class="badge badge-guest">👥 زائر</span>`
      : `<span class="badge badge-reg">🎓 طالب مسجل</span>`;

    const scoreDisplay = typeof item.score === 'number'
      ? `<span class="modal-act-score">${item.score} نقطة</span>`
      : `<span class="badge ${item.activityBadgeClass}">${escapeHtml(item.score)}</span>`;

    return `
      <div class="part-student-card">
        <div class="part-card-header">
          <div class="part-card-avatar">${escapeHtml(avatarLetter)}</div>
          <div class="part-card-info">
            <div class="part-card-name" title="${escapeHtml(item.participantName)}">${escapeHtml(item.participantName)}</div>
            <div class="part-card-class">صف ${escapeHtml(item.grade)} • شعبة ${escapeHtml(item.section)}</div>
            <div class="part-card-type">${userBadge}</div>
          </div>
          <div class="part-card-actions">
            <button class="btn-icon-danger btn-delete-item" data-id="${item.id}" data-type="${item.sourceTable}" title="حذف">
              🗑️
            </button>
          </div>
        </div>

        <div class="part-card-body">
          <div class="flex justify-between items-center" style="margin-bottom: 0.35rem;">
            <span class="badge ${item.activityBadgeClass}">${escapeHtml(item.activityBadgeLabel)}</span>
            ${scoreDisplay}
          </div>
          <div style="font-weight: 600; font-size: 0.92rem; color: var(--color-text); line-height: 1.4;">
            ${escapeHtml(item.activityName)}
          </div>
          <div class="part-card-meta" style="font-size: 0.8rem; margin-top: 0.4rem;">
            <span>🏫 ${escapeHtml(item.school)}</span>
          </div>
        </div>

        <div class="part-card-footer">
          <div style="font-size: 0.8rem; color: var(--color-text-muted); flex: 1;">
            📅 ${formatDate(item.date)}
          </div>
          <button class="btn btn-primary btn-sm btn-view-item" data-id="${item.id}" data-type="${item.sourceTable}">
            تفاصيل المشاركة ←
          </button>
        </div>
      </div>
    `;
  }).join('');

  bindActionButtons();
}

function bindActionButtons() {
  // Use scoped containers to avoid double-binding when view refreshes
  const tableBody = document.getElementById('part-table-body');
  const cardsView = document.getElementById('part-cards-view');

  const bindIn = (container) => {
    if (!container) return;
    
    const viewButtons = container.querySelectorAll('.btn-view-item');
    const deleteButtons = container.querySelectorAll('.btn-delete-item');
    
    console.log(`[teacher-participants] Binding ${viewButtons.length} view and ${deleteButtons.length} delete buttons in ${container.id}`);
    
    viewButtons.forEach(b => {
      // Remove old flag to ensure fresh binding after re-render
      if (b._boundView) return;
      b._boundView = true;
      
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = b.dataset.id || b.getAttribute('data-id');
        const itemType = b.dataset.type || b.getAttribute('data-type');
        console.log(`[teacher-participants] View button clicked: id=${itemId}, type=${itemType}`);
        openDetailModal(itemId, itemType);
      });
    });
    
    deleteButtons.forEach(b => {
      if (b._boundDelete) return;
      b._boundDelete = true;
      
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = b.dataset.id || b.getAttribute('data-id');
        const itemType = b.dataset.type || b.getAttribute('data-type');
        console.log(`[teacher-participants] Delete button clicked: id=${itemId}, type=${itemType}`);
        deleteRecord(itemId, itemType);
      });
    });
  };

  bindIn(tableBody);
  bindIn(cardsView);
}

/**
 * Open detail modal for full participant and attempt inspection
 */
async function openDetailModal(id, sourceTable) {
  const item = allRecords.find(r => r.id === id && r.sourceTable === sourceTable);
  if (!item) return;

  const modal = document.getElementById('part-detail-modal');
  const nameEl = document.getElementById('modal-part-name');
  const badgeEl = document.getElementById('modal-part-badge');
  const avatarEl = document.getElementById('modal-part-avatar');
  const bodyEl = document.getElementById('modal-part-body');

  if (!modal || !bodyEl) return;

  nameEl.textContent = item.participantName;
  avatarEl.textContent = (item.participantName || 'ط')[0];
  badgeEl.innerHTML = item.isGuest
    ? `<span class="badge badge-guest">👥 زائر غير مسجل</span>`
    : `<span class="badge badge-reg">🎓 طالب مسجل في منصة السراج</span>`;

  bodyEl.innerHTML = `
    <!-- Participant Info Grid -->
    <div class="modal-info-grid">
      <div class="modal-info-card">
        <div class="modal-info-label">اسم المشارك</div>
        <div class="modal-info-value">${escapeHtml(item.participantName)}</div>
      </div>

      <div class="modal-info-card">
        <div class="modal-info-label">المدرسة</div>
        <div class="modal-info-value">${escapeHtml(item.school)}</div>
      </div>

      <div class="modal-info-card">
        <div class="modal-info-label">الصف والشعبة</div>
        <div class="modal-info-value">الصف ${escapeHtml(item.grade)} - الشعبة ${escapeHtml(item.section)}</div>
      </div>

      <div class="modal-info-card">
        <div class="modal-info-label">تاريخ المشاركة</div>
        <div class="modal-info-value">${formatDate(item.date)}</div>
      </div>
    </div>

    <!-- Activity Details Section -->
    <h4 class="modal-section-title">بيانات النشاط والنتيجة</h4>
    <div class="modal-act-card" style="--act-accent: ${getAccentColor(item.activityType)}; margin-bottom: 1.5rem;">
      <div class="modal-act-card-header">
        <span class="modal-act-card-type">${escapeHtml(item.activityBadgeLabel)}</span>
        <span class="modal-act-score">${typeof item.score === 'number' ? item.score + ' نقطة' : item.score}</span>
      </div>
      <div class="modal-act-card-name">${escapeHtml(item.activityName)}</div>
      <div class="modal-act-card-details">
        <div class="act-card-detail"><span>الحالة:</span> <strong>${escapeHtml(item.status)}</strong></div>
        <div class="act-card-detail"><span>معرف السجل:</span> <code>${escapeHtml(item.id)}</code></div>
      </div>
      ${renderExtraRawDetails(item)}
    </div>
  `;

  modal.classList.add('active');
}

function getAccentColor(type) {
  if (type === 'competition') return '#ca8a04';
  if (type === 'reading') return '#059669';
  if (type === 'research') return '#7c3aed';
  return '#4f46e5';
}

function renderExtraRawDetails(item) {
  if (item.sourceTable === 'research_submissions') {
    const raw = item.raw;
    return `
      <div style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--color-border-light);">
        <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem;">ملخص البحث:</div>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 0.75rem;">
          ${escapeHtml(raw.summary || 'لا يوجد ملخص متاح.')}
        </p>
        ${raw.file_url ? `
          <a href="${escapeHtml(raw.file_url)}" target="_blank" class="btn btn-outline btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none;">
            📄 فتح وتحميل ملف البحث
          </a>
        ` : ''}
      </div>
    `;
  }

  if (item.sourceTable === 'competition_attempts') {
    const raw = item.raw;
    return `
      <div style="margin-top: 0.85rem; font-size: 0.82rem; color: var(--color-text-muted);">
        <div>وقت البدء: ${formatDate(raw.started_at)}</div>
        <div>وقت التسليم: ${formatDate(raw.submitted_at)}</div>
      </div>
    `;
  }

  return '';
}

/**
 * Delete participation record with confirmation modal
 */
async function deleteRecord(id, sourceTable) {
  showConfirmModal({
    title: 'حذف سجل المشاركة',
    message: 'هل أنت متأكد من حذف هذه المشاركة؟ سيتم حذف بيانات المحاولة والدرجة بشكل نهائي.',
    confirmText: 'نعم، حذف المشاركة',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase.from(sourceTable).delete().eq('id', id);
        if (error) throw error;

        Toast.success('تم حذف السجل بنجاح');
        allRecords = allRecords.filter(r => !(r.id === id && r.sourceTable === sourceTable));
        applyFilters();
      } catch (err) {
        console.error('Delete record error:', err);
        Toast.error('تعذر حذف السجل من الخادم');
      }
    }
  });
}

/**
 * Export filtered records to CSV for Excel
 */
function exportToCSV() {
  if (filteredRecords.length === 0) {
    Toast.info('لا توجد بيانات لتصديرها');
    return;
  }

  const headers = ['المشارك', 'نوع المشارك', 'نوع النشاط', 'عنوان النشاط', 'الصف', 'الشعبة', 'المدرسة', 'النتيجة', 'الحالة', 'التاريخ والوقت'];
  const rows = filteredRecords.map(r => [
    `"${(r.participantName || '').replace(/"/g, '""')}"`,
    `"${r.isGuest ? 'زائر' : 'طالب مسجل'}"`,
    `"${(r.activityBadgeLabel || '').replace(/"/g, '""')}"`,
    `"${(r.activityName || '').replace(/"/g, '""')}"`,
    `"${r.grade || ''}"`,
    `"${r.section || ''}"`,
    `"${(r.school || '').replace(/"/g, '""')}"`,
    `"${r.score}"`,
    `"${r.status || ''}"`,
    `"${formatDate(r.date)}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `سجل_المشاركين_سراج_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  Toast.success('تم تحميل ملف Excel بنجاح');
}
