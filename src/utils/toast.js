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
    const icon = type === 'error' ? '⚠️' : '✅';
    
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
}

export const Toast = new ToastManager();
