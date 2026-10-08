/**
 * Main application entry point
 */
import ThemeManager from './theme.js';
import { authService } from '../services/auth.js';
import { Toast } from '../utils/toast.js';
import { initDotGrid } from './dotgrid.js';

// Attach Toast to window for easy access in inline HTML scripts
window.Toast = Toast;

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  initDotGrid();
  
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
  }

  const updateAuthUI = (isLoggedIn) => {
    // Determine login from argument, or fallback to instant synchronous request.
    const logged = isLoggedIn !== undefined ? isLoggedIn : authService.isLoggedIn();
    
    document.querySelectorAll('.auth-required').forEach(el => {
      if (logged) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    document.querySelectorAll('.guest-only').forEach(el => {
      if (!logged) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  };

  // Initial Sync check
  updateAuthUI();

  // Async exact check (good for when navigating after tokens change)
  authService.getSessionAsync().then(({ session }) => {
    updateAuthUI(!!session);
  });

  // Listener for dynamic changes over time
  document.addEventListener('auth-status-changed', (e) => {
    updateAuthUI(e.detail.isLoggedIn);
  });
  
  // ── Scroll Reveal Observer ──
  const revealElements = document.querySelectorAll(
    '.main-content .card, .main-content .empty-state, .main-content section, .main-content h2, .main-content h3, .main-content form'
  );
  
  if (revealElements.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Add scroll-reveal class to eligible elements
    revealElements.forEach(el => {
      if (!el.dataset.revealed) {
        el.classList.add('scroll-reveal');
      }
    });

    // Add stagger class to grids
    document.querySelectorAll('.main-content .grid').forEach(grid => {
      grid.classList.add('scroll-reveal-stagger');
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          entry.target.dataset.revealed = 'true';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  }

  console.log('Siraj Educational Platform Initialized');
});
