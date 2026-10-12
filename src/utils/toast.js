/**
 * Toast Notification Utility
 * Displays non-blocking messages on screen for success and error handling.
 */

class ToastManager {
  constructor() {
    this.container = null;
    if (document.body) {
      this._getOrCreateContainer();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this._getOrCreateContainer();
      });
    }
  }

  _getOrCreateContainer() {
    if (!this.container || !document.body.contains(this.container)) {
      let existing = document.querySelector('.toast-container');
      if (existing) {
        this.container = existing;
      } else if (document.body) {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        // Ensure container is always positioned at top with inline styles as fallback
        this.container.style.cssText = `
          position: fixed !important;
          top: 1.5rem !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 99999 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          pointer-events: none;
          width: max-content;
          max-width: min(90vw, 480px);
        `;
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  show(message, type = 'success', duration = 4000) {
    const container = this._getOrCreateContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Auto Emoji based on type
    const icons = { error: '⚠️', success: '✅', warning: '🔔', info: 'ℹ️' };
    const icon = icons[type] || 'ℹ️';
    
    toast.innerHTML = `
      <div style="font-size: 1.25rem; flex-shrink: 0; line-height: 1;">${icon}</div>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger reflow to animate
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350); // Wait for transition
    }, duration);
  }

  error(message, duration = 4000) {
    this.show(message, 'error', duration);
  }

  success(message, duration = 4000) {
    this.show(message, 'success', duration);
  }

  warning(message, duration = 4000) {
    this.show(message, 'warning', duration);
  }

  info(message, duration = 4000) {
    this.show(message, 'info', duration);
  }
}

export const Toast = new ToastManager();
