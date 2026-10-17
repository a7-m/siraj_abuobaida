/**
 * Question Bank Picker Modal Component
 * منصة السراج – مدرسة أبو عبيدة
 * ─────────────────────────────────────────────────────────────
 * Allows selecting questions from the central questions bank (public.questions)
 * to be imported into challenges, levels, or competitions.
 */

import { supabase } from '../services/supabase.js';
import { Toast } from './toast.js';

let cachedQuestions = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TYPE_CONFIG = {
  mcq: { label: 'اختيار من متعدد', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', icon: '🔘' },
  tf: { label: 'صح أو خطأ', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: '⚖️' },
  order: { label: 'ترتيب تسلسلي', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', icon: '🔢' },
  match: { label: 'مطابقة وتوصيل', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)', icon: '🔀' }
};

/**
 * Open the question bank picker modal
 * @param {Object} options
 * @param {Function} options.onSelect - Callback when teacher chooses to import/edit question
 * @param {Function} [options.onDirectInsert] - Optional callback for 1-click direct link to activity
 * @param {string[]} [options.excludeIds] - IDs of questions already present in the activity
 * @param {string} [options.title] - Modal title
 * @param {string} [options.subtitle] - Modal subtitle
 */
export async function openQuestionBankPicker({
  onSelect = null,
  onDirectInsert = null,
  excludeIds = [],
  title = 'اختيار سؤال من بنك الأسئلة',
  subtitle = 'تصفح بنك الأسئلة واختر سؤالاً لإدراجه مباشرة أو استيراده في المحرر'
} = {}) {
  // Remove existing picker modal if any
  document.querySelector('.qbank-picker-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'qbank-picker-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  backdrop.innerHTML = `
    <div class="qbank-picker-modal">
      <!-- Header -->
      <div class="qbp-header">
        <div class="qbp-header-info">
          <div class="qbp-icon-badge">📚</div>
          <div>
            <h3 class="qbp-title">${escapeHtml(title)}</h3>
            <p class="qbp-subtitle">${escapeHtml(subtitle)}</p>
          </div>
        </div>
        <button type="button" class="qbp-close-btn" id="qbp-close-btn" aria-label="إغلاق">&times;</button>
      </div>

      <!-- Toolbar: Search & Filter -->
      <div class="qbp-toolbar">
        <div class="qbp-search-box">
          <span class="qbp-search-icon">🔍</span>
          <input 
            type="text" 
            id="qbp-search-input" 
            class="qbp-search-input" 
            placeholder="ابحث في نص السؤال، الكلمات الدلالية أو الإجابات..."
            autocomplete="off"
          >
          <button type="button" id="qbp-search-clear" class="qbp-clear-btn" style="display: none;">✕</button>
        </div>

        <div class="qbp-filter-group">
          <select id="qbp-type-filter" class="qbp-select">
            <option value="all">جميع الأنواع</option>
            <option value="mcq">اختيار من متعدد</option>
            <option value="tf">صح أو خطأ</option>
            <option value="order">ترتيب تسلسلي</option>
            <option value="match">مطابقة وتوصيل</option>
          </select>
          <span id="qbp-count-badge" class="qbp-count-badge">جاري التحميل...</span>
        </div>
      </div>

      <!-- Questions List Container -->
      <div id="qbp-list-container" class="qbp-list-container">
        <div class="qbp-loading">
          <div class="qbp-spinner"></div>
          <div>جاري جلب الأسئلة من بنك الأسئلة المركزي...</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="qbp-footer">
        <div class="qbp-footer-hint">
          💡 يمكنك فتح <a href="teacher-questions.html" target="_blank" style="color: var(--color-primary); font-weight: 600; text-decoration: underline;">إدارة بنك الأسئلة</a> لإضافة أسئلة جديدة وحفظها مركزياً.
        </div>
        <button type="button" id="qbp-cancel-btn" class="btn btn-outline btn-sm">إلغاء</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Grab interactive elements
  const closeBtn = backdrop.querySelector('#qbp-close-btn');
  const cancelBtn = backdrop.querySelector('#qbp-cancel-btn');
  const searchInput = backdrop.querySelector('#qbp-search-input');
  const clearBtn = backdrop.querySelector('#qbp-search-clear');
  const typeFilter = backdrop.querySelector('#qbp-type-filter');
  const listContainer = backdrop.querySelector('#qbp-list-container');
  const countBadge = backdrop.querySelector('#qbp-count-badge');

  const closeModal = () => {
    backdrop.classList.add('qbp-closing');
    setTimeout(() => backdrop.remove(), 200);
    document.removeEventListener('keydown', handleKeyDown);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleKeyDown);

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Load questions from Supabase
  let questions = [];
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    questions = data || [];
    cachedQuestions = questions;
  } catch (err) {
    console.error('Failed to load questions from bank:', err);
    listContainer.innerHTML = `
      <div class="qbp-empty-state">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
        <div style="font-weight: 700; color: #ef4444; margin-bottom: 0.25rem;">تعذر تحميل بنك الأسئلة</div>
        <div style="font-size: 0.85rem; color: var(--color-text-muted);">${escapeHtml(err.message)}</div>
      </div>
    `;
    countBadge.textContent = 'خطأ';
    return;
  }

  // Render question card
  const renderQuestionItem = (q) => {
    const isExcluded = excludeIds.includes(q.id);
    const typeInfo = TYPE_CONFIG[q.type] || { label: q.type, color: '#4b5563', bg: 'rgba(75, 85, 99, 0.1)', icon: '❓' };
    const meta = q.metadata || {};

    let previewHtml = '';
    if (q.type === 'mcq') {
      const opts = Array.isArray(meta.options) ? meta.options : [];
      const corr = meta.correct_answer || (typeof meta.correct === 'number' ? opts[meta.correct] : '');
      previewHtml = `
        <div class="qbp-options-preview">
          ${opts.map(opt => `
            <span class="qbp-opt-pill ${opt === corr ? 'is-correct' : ''}">
              ${escapeHtml(opt)} ${opt === corr ? '✓' : ''}
            </span>
          `).join('')}
        </div>
      `;
    } else if (q.type === 'tf') {
      const corr = meta.correct_answer || (meta.correct === false ? 'خطأ' : 'صح');
      previewHtml = `
        <div class="qbp-options-preview">
          <span class="qbp-opt-pill ${corr === 'صح' ? 'is-correct' : ''}">صح ${corr === 'صح' ? '✓' : ''}</span>
          <span class="qbp-opt-pill ${corr === 'خطأ' ? 'is-correct' : ''}">خطأ ${corr === 'خطأ' ? '✓' : ''}</span>
        </div>
      `;
    } else if (q.type === 'order') {
      const items = meta.correct_order || meta.items || [];
      previewHtml = `
        <div class="qbp-options-preview">
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">الترتيب:</span>
          ${items.map((it, idx) => `
            <span class="qbp-opt-pill">${idx + 1}. ${escapeHtml(it)}</span>
          `).join(' ← ')}
        </div>
      `;
    } else if (q.type === 'match') {
      const pairs = meta.pairs || [];
      previewHtml = `
        <div class="qbp-options-preview">
          ${pairs.map(p => `
            <span class="qbp-opt-pill">${escapeHtml(p.left || '')} ⇄ ${escapeHtml(p.right || '')}</span>
          `).join(' · ')}
        </div>
      `;
    }

    return `
      <div class="qbp-question-card ${isExcluded ? 'is-already-added' : ''}" data-id="${q.id}">
        <div class="qbp-card-header">
          <div class="qbp-badges-row">
            <span class="qbp-type-tag" style="background: ${typeInfo.bg}; color: ${typeInfo.color}; border: 1px solid ${typeInfo.color}33;">
              <span>${typeInfo.icon}</span>
              <span>${typeInfo.label}</span>
            </span>
            <span class="qbp-points-tag">${q.points || 1} درجات</span>
            ${isExcluded ? `<span class="qbp-already-badge">✓ مضاف بالفعل</span>` : ''}
          </div>

          <div class="qbp-card-actions">
            ${onDirectInsert ? `
              <button 
                type="button" 
                class="btn btn-primary btn-sm btn-qbp-direct" 
                data-id="${q.id}"
                ${isExcluded ? 'disabled title="هذا السؤال مضاف بالفعل"' : ''}
              >
                <span>➕ إدراج مباشر</span>
              </button>
            ` : ''}

            ${onSelect ? `
              <button 
                type="button" 
                class="btn btn-outline btn-sm btn-qbp-select" 
                data-id="${q.id}"
              >
                <span>✏️ اختيار وتعديل</span>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="qbp-question-text">${escapeHtml(q.text)}</div>

        ${previewHtml}
      </div>
    `;
  };

  // Filter and re-render list
  const applyFilterAndRender = () => {
    const qSearch = (searchInput.value || '').trim().toLowerCase();
    const qType = typeFilter.value;

    clearBtn.style.display = qSearch ? 'block' : 'none';

    const filtered = questions.filter(q => {
      const matchesType = qType === 'all' || q.type === qType;
      if (!matchesType) return false;

      if (!qSearch) return true;

      const inText = (q.text || '').toLowerCase().includes(qSearch);
      let inMeta = false;
      if (q.metadata) {
        try {
          inMeta = JSON.stringify(q.metadata).toLowerCase().includes(qSearch);
        } catch (_) {}
      }
      return inText || inMeta;
    });

    countBadge.textContent = `${filtered.length} سؤال`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="qbp-empty-state">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 700; margin-bottom: 0.25rem;">لا توجد أسئلة مطابقة للبحث</div>
          <div style="font-size: 0.85rem; color: var(--color-text-muted);">جرب تغيير كلمات البحث أو تغيير نوع السؤال المحدد.</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(renderQuestionItem).join('');

    // Attach click events
    if (onDirectInsert) {
      listContainer.querySelectorAll('.btn-qbp-direct:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async () => {
          const qId = btn.dataset.id;
          const targetQ = questions.find(item => item.id === qId);
          if (!targetQ) return;

          btn.disabled = true;
          const origText = btn.innerHTML;
          btn.innerHTML = '<span>جاري الإدراج...</span>';

          try {
            await onDirectInsert(targetQ);
            closeModal();
          } catch (err) {
            console.error('Direct insert error:', err);
            Toast.error('تعذر إدراج السؤال: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = origText;
          }
        });
      });
    }

    if (onSelect) {
      listContainer.querySelectorAll('.btn-qbp-select').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.dataset.id;
          const targetQ = questions.find(item => item.id === qId);
          if (!targetQ) return;

          closeModal();
          onSelect(targetQ);
        });
      });
    }
  };

  // Event handlers for search and filter
  searchInput.addEventListener('input', applyFilterAndRender);
  typeFilter.addEventListener('change', applyFilterAndRender);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    applyFilterAndRender();
  });

  // Initial render
  applyFilterAndRender();
  setTimeout(() => searchInput.focus(), 150);
}
