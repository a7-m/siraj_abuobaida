/**
 * Guest Identity & Tracking Utility
 * Manages privacy-conscious guest identification across Siraj platform activities
 * (Reading Challenges, Competitions, Scientific Research)
 */

const STORAGE_KEY = 'siraj_guest_info';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const guestService = {
  /**
   * Get currently saved guest profile or create a fresh anonymous session
   */
  getGuestInfo() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.sessionId) {
          parsed.sessionId = generateUUID();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read guest info from localStorage:', e);
    }

    const defaultInfo = {
      name: '',
      grade: '',
      section: '',
      sessionId: generateUUID()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultInfo));
    } catch (e) {}
    return defaultInfo;
  },

  /**
   * Save or update guest identification details
   */
  setGuestInfo(info = {}) {
    const current = this.getGuestInfo();
    const updated = {
      ...current,
      name: (info.name || current.name || '').trim(),
      grade: (info.grade || current.grade || '').trim(),
      section: (info.section || current.section || '').trim(),
      email: (info.email || current.email || '').trim(),
      sessionId: current.sessionId || generateUUID(),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save guest info:', e);
    }

    return updated;
  },

  /**
   * Check if guest has entered their name
   */
  hasIdentified() {
    const info = this.getGuestInfo();
    return Boolean(info.name && info.name.trim().length > 1);
  },

  /**
   * Show a modern modal asking for guest identification before or after an activity
   * Returns a Promise resolving to guest info, or null if dismissed
   */
  promptModal({
    title = 'المشاركة كزائر (دون حساب)',
    subtitle = 'أدخل اسمك وبياناتك لتوثيق مشاركتك وحفظ نتيجتك لدى المعلم:',
    actionText = 'متابعة المشاركة',
    allowCancel = true,
    requireName = true
  } = {}) {
    return new Promise((resolve) => {
      const current = this.getGuestInfo();

      const modalEl = document.createElement('div');
      modalEl.className = 'guest-modal-backdrop';
      modalEl.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem; animation: fadeIn 0.2s ease-out;
      `;

      const grades = [
        'الخامس', 'السادس', 'السابع', 'الثامن',
        'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'
      ];

      const gradeOptions = grades.map(g => `
        <option value="${g}" ${current.grade === g ? 'selected' : ''}>${g}</option>
      `).join('');

      modalEl.innerHTML = `
        <div class="card" style="max-width: 460px; width: 100%; border-radius: var(--border-radius-lg, 16px); padding: 2rem; box-shadow: var(--shadow-xl); position: relative; animation: slideUp 0.25s ease-out;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(79, 70, 229, 0.1); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              👤
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.25rem;">${title}</h3>
              <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--color-text-muted);">${subtitle}</p>
            </div>
          </div>

          <form id="guest-prompt-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.25rem;">
            <div>
              <label style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;">
                الاسم الكامل ${requireName ? '<span style="color: #ef4444;">*</span>' : ''}
              </label>
              <input type="text" id="g-name" class="form-control" placeholder="مثال: محمد بن سعيد المعمري" value="${current.name || ''}" style="width: 100%;" required>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;">الصف</label>
                <select id="g-grade" class="form-control" style="width: 100%;">
                  <option value="">اختر الصف...</option>
                  ${gradeOptions}
                </select>
              </div>
              <div>
                <label style="display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.35rem;">الشعبة</label>
                <input type="text" id="g-section" class="form-control" placeholder="مثال: 3" value="${current.section || ''}" style="width: 100%;">
              </div>
            </div>

            <div style="background: var(--color-bg-alt, rgba(0,0,0,0.03)); padding: 0.75rem 1rem; border-radius: var(--border-radius-sm, 8px); font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.4;">
              💡 تُحفظ بياناتك محلياً لتوثيق مشاركاتك دون الحاجة لكلمة مرور. إذا كان لديك حساب بالفعل، يمكنك <a href="login.html" style="color: var(--color-primary); font-weight: 600;">تسجيل الدخول</a>.
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
              <button type="submit" class="btn btn-primary" style="flex: 1; padding: 0.75rem;">
                ${actionText}
              </button>
              ${allowCancel ? `
                <button type="button" id="g-cancel-btn" class="btn btn-outline" style="padding: 0.75rem;">
                  إلغاء
                </button>
              ` : ''}
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modalEl);

      const nameInput = modalEl.querySelector('#g-name');
      setTimeout(() => nameInput?.focus(), 50);

      const cleanup = () => {
        modalEl.remove();
      };

      modalEl.querySelector('#guest-prompt-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nameVal = modalEl.querySelector('#g-name').value.trim();
        const gradeVal = modalEl.querySelector('#g-grade').value.trim();
        const sectionVal = modalEl.querySelector('#g-section').value.trim();

        if (requireName && (!nameVal || nameVal.length < 2)) {
          alert('يرجى كتابة الاسم الكامل للمتابعة.');
          return;
        }

        const saved = this.setGuestInfo({
          name: nameVal,
          grade: gradeVal,
          section: sectionVal
        });

        cleanup();
        resolve(saved);
      });

      if (allowCancel) {
        modalEl.querySelector('#g-cancel-btn')?.addEventListener('click', () => {
          cleanup();
          resolve(null);
        });

        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) {
            cleanup();
            resolve(null);
          }
        });
      }
    });
  }
};
