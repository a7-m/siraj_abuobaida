/**
 * National Identity Page Logic (identity.html)
 * ─────────────────────────────────────────────────────────────
 * Dynamically fetches and renders published content pages created 
 * by teachers from the `content_pages` table in Supabase.
 */

import { supabase } from '../services/supabase.js';
import { authService } from '../services/auth.js';
import './main.js';

let allPages = [];
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  initSearch();
  await checkTeacherAccess();
  await loadPublishedPages();
});

/**
 * Check if logged-in user is a teacher and display manage button
 */
async function checkTeacherAccess() {
  const teacherControls = document.getElementById('teacher-controls');
  if (!teacherControls) return;

  try {
    const { session } = await authService.getSessionAsync();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'teacher') {
      teacherControls.style.display = 'flex';
    }
  } catch (e) {
    console.warn('Teacher check error:', e);
  }
}

/**
 * Fetch published pages from Supabase
 */
async function loadPublishedPages() {
  const container = document.getElementById('identity-pages-grid');
  const loading = document.getElementById('identity-loading');
  const emptyState = document.getElementById('identity-empty');
  const errorState = document.getElementById('identity-error');

  if (!container) return;

  if (loading) loading.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';
  if (errorState) errorState.style.display = 'none';
  container.innerHTML = '';

  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('content_pages')
      .select('id, slug, title, content, cover_image, status, created_at, updated_at, author_id')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    allPages = data || [];

    if (loading) loading.style.display = 'none';

    renderPages();
  } catch (err) {
    console.error('Error fetching national identity pages:', err);
    if (loading) loading.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      const errMsg = document.getElementById('identity-error-msg');
      if (errMsg) errMsg.textContent = err.message || 'تعذر تحميل الصفحات في الوقت الحالي.';
    }
  }
}

/**
 * Render page cards
 */
function renderPages() {
  const container = document.getElementById('identity-pages-grid');
  const emptyState = document.getElementById('identity-empty');
  const countBadge = document.getElementById('identity-count-badge');

  if (!container) return;

  const filtered = allPages.filter(page => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = page.title && page.title.toLowerCase().includes(q);
    const contentMatch = page.content && page.content.toLowerCase().includes(q);
    return titleMatch || contentMatch;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} صفحة`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = filtered.map(page => createPageCard(page)).join('');
}

/**
 * Generate card HTML for a single page
 */
function createPageCard(page) {
  const dateStr = formatDate(page.updated_at || page.created_at);
  const snippet = extractSnippet(page.content, 110);
  const pageUrl = `page.html?slug=${encodeURIComponent(page.slug)}`;

  // Cover image or beautiful SVG geometric placeholder
  const coverHtml = page.cover_image
    ? `<div class="id-card-cover-wrap">
         <img src="${escapeHtml(page.cover_image)}" alt="${escapeHtml(page.title)}" class="id-card-cover" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'id-card-fallback-cover\\'><span>🇴🇲</span></div>'">
       </div>`
    : `<div class="id-card-fallback-cover">
         <div class="id-card-fallback-emblem">🇴🇲</div>
         <span class="id-card-fallback-tag">محتوى تعليمي وطني</span>
       </div>`;

  return `
    <article class="id-page-card card">
      ${coverHtml}
      <div class="id-card-body">
        <div class="id-card-meta">
          <span class="id-card-tag">📜 الهوية الوطنية</span>
          <span class="id-card-date">📅 ${dateStr}</span>
        </div>
        <h3 class="id-card-title">
          <a href="${pageUrl}">${escapeHtml(page.title)}</a>
        </h3>
        <p class="id-card-snippet">${escapeHtml(snippet)}</p>
        <div class="id-card-footer">
          <a href="${pageUrl}" class="btn btn-primary btn-sm id-card-btn">
            <span>استعراض الصفحة</span>
            <span class="btn-arrow">←</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Initialize search bar
 */
function initSearch() {
  const searchInput = document.getElementById('identity-search-input');
  const clearBtn = document.getElementById('identity-search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'inline-flex' : 'none';
      }
      renderPages();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.style.display = 'none';
        renderPages();
        searchInput.focus();
      }
    });
  }
}

/**
 * Extract clean plain-text snippet from HTML content
 */
function extractSnippet(html, maxLength = 120) {
  if (!html) return 'لا يوجد ملخص متاح لهذه الصفحة.';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text || 'انقر لاستعراض تفاصيل هذه الصفحة...';
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format timestamp into Arabic date
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString('ar-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
