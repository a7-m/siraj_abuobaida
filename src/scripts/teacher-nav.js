/**
 * Teacher Navigation & Shared Admin Core Module
 * منصة السراج – مدرسة أبو عبيدة
 * Provides unified authentication check, sidebar rendering, header actions,
 * modal dialogs, and helper utilities across all teacher admin pages.
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

export const ADMIN_PAGES = [
  { key: 'dashboard', href: 'teacher-dashboard.html', title: 'لوحة التحكم والإحصائيات', icon: '📊' },
  { key: 'content', href: 'teacher-content.html', title: 'الصفحات التعليمية', icon: '📝' },
  { key: 'reading', href: 'teacher-reading.html', title: 'تحديات القراءة (طوّر نفسك)', icon: '📚' },
  { key: 'competitions', href: 'teacher-competitions.html', title: 'مسابقات السراج', icon: '🏆' },
  { key: 'questions', href: 'teacher-questions.html', title: 'بنك الأسئلة', icon: '❓' },
  { key: 'research', href: 'teacher-research.html', title: 'البحث العلمي والتحكيم', icon: '🔬' },
  { key: 'participants', href: 'teacher-participants.html', title: 'سجل المشاركين', icon: '👥' },
  { key: 'users', href: 'teacher-users.html', title: 'إدارة المستخدمين والطلاب', icon: '🎓' },
  { key: 'media', href: 'teacher-media.html', title: 'الملفات والوسائط', icon: '📁' },
  { key: 'profile', href: 'teacher-profile.html', title: 'الملف الشخصي', icon: '👤' }
];

let currentUser = null;
let currentProfile = null;

/**
 * Initialize Teacher Admin page with access verification and navigation setup
 * @param {string} activePageKey e.g. 'dashboard', 'content', 'reading', ...
 * @returns {Promise<{ user: object, profile: object }>}
 */
export async function initTeacherAdmin(activePageKey) {
  // Theme check early
  initTheme();

  // Verify Auth and Teacher Role
  const authData = await checkTeacherAccess();
  currentUser = authData.user;
  currentProfile = authData.profile;

  // Render or enhance Sidebar
  renderSidebar(activePageKey);

  // Bind Header controls
  setupHeaderControls(currentProfile);

  // Setup Logout action
  setupLogout();

  return { user: currentUser, profile: currentProfile };
}

/**
 * Strict role and authentication check
 */
export async function checkTeacherAccess() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    window.location.replace('login.html');
    throw new Error('Supabase not connected');
  }

  const { session } = await authService.getSessionAsync();
  if (!session || !session.user) {
    window.location.replace('login.html');
    throw new Error('Unauthenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || profile.role !== 'teacher') {
    Toast.error('عذراً، هذه الصفحة مخصصة للمعلمين فقط.');
    setTimeout(() => {
      window.location.replace('dashboard.html');
    }, 900);
    throw new Error('Unauthorized: Role is not teacher');
  }

  return { user: session.user, profile };
}

/**
 * Build or hydrate sidebar navigation
 */
/**
 * Build or hydrate sidebar navigation
 */
function renderSidebar(activeKey) {
  const sidebar = document.getElementById('td-sidebar');
  if (!sidebar) return;

  // Ensure mobile backdrop exists
  ensureSidebarBackdrop();

  const currentPath = window.location.pathname.split('/').pop() || 'teacher-dashboard.html';

  const navHtml = `
    <div class="td-sidebar-header">
      <a href="index.html" class="logo" title="الرئيسية">
        <img src="./src/assets/images/siraj-logo.png" alt="شعار سراج">
      </a>
      <button id="td-sidebar-close" class="btn-icon td-sidebar-close-btn" aria-label="إغلاق القائمة">&times;</button>
    </div>

    <div class="td-sidebar-profile-mini">
      <div class="td-mini-avatar">👨‍🏫</div>
      <div class="td-mini-info">
        <div class="td-mini-name" id="sidebar-teacher-name">${escapeHtml(currentProfile?.full_name || 'المعلم')}</div>
        <div class="td-mini-role">لوحة إدارة السراج</div>
      </div>
    </div>

    <nav class="td-nav">
      <div class="td-nav-section">إدارة المنصة التعليمية</div>
      ${ADMIN_PAGES.map(p => {
        const isActive = p.key === activeKey || currentPath === p.href;
        return `
          <a href="${p.href}" class="td-nav-item ${isActive ? 'active' : ''}" data-key="${p.key}">
            <span class="td-nav-icon">${p.icon}</span>
            <span class="td-nav-text">${p.title}</span>
          </a>
        `;
      }).join('')}
    </nav>

    <div class="td-sidebar-footer">
      <a href="index.html" class="btn btn-outline btn-sm" style="width: 100%; text-align: center; margin-bottom: 0.5rem; text-decoration: none;">
        🌐 زيارة الموقع العام
      </a>
      <button id="td-logout-btn" class="btn btn-outline-danger btn-sm" style="width: 100%;">
        🚪 تسجيل الخروج
      </button>
    </div>
  `;

  sidebar.innerHTML = navHtml;

  // Bind close button
  const closeBtn = document.getElementById('td-sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileSidebar);
  }

  // Close sidebar on link click on small screens
  sidebar.querySelectorAll('.td-nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
        closeMobileSidebar();
      }
    });
  });
}

function ensureSidebarBackdrop() {
  let backdrop = document.getElementById('td-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'td-sidebar-backdrop';
    backdrop.className = 'td-sidebar-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeMobileSidebar);
  }
  return backdrop;
}

export function openMobileSidebar() {
  const sidebar = document.getElementById('td-sidebar');
  const backdrop = ensureSidebarBackdrop();
  if (sidebar) sidebar.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
  document.body.classList.add('sidebar-opened');
}

export function closeMobileSidebar() {
  const sidebar = document.getElementById('td-sidebar');
  const backdrop = document.getElementById('td-sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('sidebar-opened');
}

/**
 * Bind Header controls (Theme toggle, mobile hamburger, badges, header logout)
 */
function setupHeaderControls(profile) {
  const hamburger = document.getElementById('td-hamburger');
  const sidebar = document.getElementById('td-sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains('open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  // Teacher badge & display name
  const badgeName = document.getElementById('header-teacher-name');
  if (badgeName && profile) {
    badgeName.textContent = profile.full_name || 'المعلم';
  }

  // Inject header logout button if not already in the header
  const header = document.querySelector('.td-header');
  if (header) {
    const headerActions = header.querySelector('.flex.items-center.gap-3') || header.lastElementChild;
    if (headerActions && !document.getElementById('header-logout-btn')) {
      const headerLogout = document.createElement('button');
      headerLogout.id = 'header-logout-btn';
      headerLogout.className = 'btn btn-outline-danger btn-sm header-logout-btn';
      headerLogout.title = 'تسجيل الخروج';
      headerLogout.style.cssText = 'display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.35rem 0.75rem;';
      headerLogout.innerHTML = '<span>🚪</span> <span>خروج</span>';
      headerActions.appendChild(headerLogout);
    }
  }

  // Theme toggle button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    updateThemeToggleIcon(themeToggle);
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('siraj-theme', newTheme);
      updateThemeToggleIcon(themeToggle);
    });
  }

  // Esc key closes mobile sidebar and modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileSidebar();
      const openModal = document.querySelector('.modal.active');
      if (openModal) openModal.classList.remove('active');
    }
  });

  // Window resize resets mobile sidebar
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
      closeMobileSidebar();
    }
  });
}

function initTheme() {
  const saved = localStorage.getItem('siraj-theme');
  if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function updateThemeToggleIcon(btn) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark ? '☀️' : '🌙';
  btn.setAttribute('title', isDark ? 'الوضع الفاتح' : 'الوضع الداكن');
}

/**
 * Handle Logout across any triggered element
 */
export async function logoutTeacher() {
  try {
    await authService.logout();
  } catch (err) {
    console.warn('Logout warning:', err);
  } finally {
    try {
      localStorage.removeItem('siraj-session');
      sessionStorage.clear();
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      });
    } catch (_) {}
    Toast.success('تم تسجيل الخروج بنجاح');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 350);
  }
}

// Make globally accessible
window.logoutTeacher = logoutTeacher;
window.handleLogout = logoutTeacher;

function setupLogout() {
  const triggerLogoutConfirm = () => {
    showConfirmModal({
      title: 'تسجيل الخروج',
      message: 'هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة المعلم؟',
      confirmText: 'نعم، تسجيل خروج',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        await logoutTeacher();
      }
    });
  };

  // Bind all potential logout triggers
  const logoutButtons = document.querySelectorAll('#td-logout-btn, #header-logout-btn, #btn-logout, #td-logout, .btn-logout, [data-action="logout"]');
  logoutButtons.forEach(btn => {
    // Avoid double binding
    btn.removeEventListener('click', triggerLogoutConfirm);
    btn.addEventListener('click', triggerLogoutConfirm);
  });
}

/**
 * Shared Confirmation Modal Helper
 */
export function showConfirmModal({
  title = 'تأكيد الإجراء',
  message = 'هل أنت متأكد من متابعة هذا الإجراء؟ لا يمكن التراجع عنه.',
  confirmText = 'نعم، تأكيد',
  cancelText = 'إلغاء',
  confirmClass = 'btn-danger',
  onConfirm = () => {}
}) {
  let modal = document.getElementById('confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content card" style="max-width: 440px; text-align: center; padding: 2rem;">
      <div style="font-size: 2.8rem; margin-bottom: 0.75rem;">⚠️</div>
      <h3 id="confirm-modal-title" style="margin-bottom: 0.75rem; color: var(--color-text);">${escapeHtml(title)}</h3>
      <p id="confirm-modal-msg" style="margin-bottom: 1.5rem; color: var(--color-text-muted); line-height: 1.6;">${escapeHtml(message)}</p>
      <div class="flex gap-2 justify-center" style="flex-wrap: wrap;">
        <button id="btn-confirm-modal-yes" class="btn ${confirmClass}">${escapeHtml(confirmText)}</button>
        <button id="btn-confirm-modal-no" class="btn btn-outline">${escapeHtml(cancelText)}</button>
      </div>
    </div>
  `;

  modal.classList.add('active');

  const close = () => {
    modal.classList.remove('active');
  };

  const yesBtn = modal.querySelector('#btn-confirm-modal-yes');
  const noBtn = modal.querySelector('#btn-confirm-modal-no');

  yesBtn.onclick = async () => {
    close();
    await onConfirm();
  };

  noBtn.onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
}

/**
 * Shared Pagination UI Renderer
 */
export function renderPagination({
  containerId,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = totalItems !== undefined 
      ? `<div style="font-size: 0.85rem; color: var(--color-text-muted); text-align: center; padding: 0.5rem;">إجمالي السجلات: ${totalItems}</div>` 
      : '';
    return;
  }

  let html = `
    <div class="td-pagination-wrapper">
      <div class="td-pagination-info">
        عرض الصفحة <strong>${currentPage}</strong> من <strong>${totalPages}</strong> ${totalItems ? `(إجمالي: ${totalItems})` : ''}
      </div>
      <div class="td-pagination-buttons">
        <button class="btn btn-sm btn-outline td-page-prev" ${currentPage <= 1 ? 'disabled' : ''}>السابق</button>
  `;

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'} td-page-btn" data-page="${i}">
        ${i}
      </button>
    `;
  }

  html += `
        <button class="btn btn-sm btn-outline td-page-next" ${currentPage >= totalPages ? 'disabled' : ''}>التالي</button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll('.td-page-btn').forEach(b => {
    b.addEventListener('click', () => onPageChange(parseInt(b.dataset.page, 10)));
  });

  const prevBtn = container.querySelector('.td-page-prev');
  if (prevBtn) prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));

  const nextBtn = container.querySelector('.td-page-next');
  if (nextBtn) nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
}

/**
 * Escapes HTML strings to prevent XSS
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats ISO date to Arabic date string
 */
export function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

/**
 * Debounce utility for search inputs
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
