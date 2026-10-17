/**
 * Unified Student Identity System — منصة السراج (مدرسة أبو عبيدة)
 * ─────────────────────────────────────────────────────────────
 * • Unified across competition.html and develop.html
 * • Smart 3-level caching: Memory → localStorage → Supabase (only if needed)
 * • Modal shown only for: guests, incomplete profiles, or when forced
 * • Abu Obaida School: grades (10, 11, 12) + dynamic sections managed via DB
 * • Other Schools: custom school name + grades (1-12) + manual positive integer section
 * • Works seamlessly with both authenticated Supabase accounts and persistent guest sessions
 * • Keeps profile identity decoupled from competition attempts and reading challenge progress
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from './toast.js';
import { getSchoolClasses, formatGradeLabel, formatSectionLabel } from '../services/school-classes.js';

const STORAGE_KEY = 'siraj_verified_student';
const LEGACY_STORAGE_KEY = 'siraj_guest_info';

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

// Fallback sections in case network is down
const DEFAULT_SECTIONS = {
  '10': ['10/1', '10/2', '10/3', '10/4', '10/5', '10/6', '10/7', '10/8', '10/9', '10/10', '10/11'],
  'العاشر': ['1', '2', '3', '4', '5', '6'],
  'الحادي عشر': ['1', '2', '3', '4', '5'],
  'الثاني عشر': ['1', '2', '3', '4']
};

export const studentIdentity = {
  _sectionsCache: {},
  _currentVerified: null,

  /**
   * Get existing persistent identity or initialize anonymous session UUID
   */
  getStoredIdentity() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.sessionId) {
          parsed.sessionId = generateUUID();
        }
        return {
          name: parsed.name || parsed.full_name || '',
          username: parsed.username || '',
          schoolType: parsed.schoolType || parsed.school_type || 'abu_obaida',
          schoolName: parsed.schoolName || parsed.school_name || 'مدرسة أبو عبيدة',
          grade: parsed.grade || '',
          section: parsed.section || '',
          sessionId: parsed.sessionId,
          verifiedAt: parsed.verifiedAt || null
        };
      }
    } catch (e) {
      console.warn('Error reading stored identity:', e);
    }

    const initial = {
      name: '',
      username: '',
      schoolType: 'abu_obaida',
      schoolName: 'مدرسة أبو عبيدة',
      grade: '10',
      section: '10/1',
      sessionId: generateUUID(),
      verifiedAt: null
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {}

    return initial;
  },

  /**
   * Fetch active sections for a specific grade from Supabase (or return fallback)
   */
  async getSectionsForGrade(grade) {
    if (!grade) return [];
    try {
      const classes = await getSchoolClasses();
      if (classes.sectionsByGrade?.[grade]) {
        return classes.sectionsByGrade[grade];
      }
      if (grade === 'العاشر' && classes.sectionsByGrade?.['10']) return classes.sectionsByGrade['10'];
      if (grade === '10' && classes.sectionsByGrade?.['العاشر']) return classes.sectionsByGrade['العاشر'];
      if (grade === 'الحادي عشر' && classes.sectionsByGrade?.['11']) return classes.sectionsByGrade['11'];
      if (grade === '11' && classes.sectionsByGrade?.['الحادي عشر']) return classes.sectionsByGrade['الحادي عشر'];
      if (grade === 'الثاني عشر' && classes.sectionsByGrade?.['12']) return classes.sectionsByGrade['12'];
      if (grade === '12' && classes.sectionsByGrade?.['الثاني عشر']) return classes.sectionsByGrade['الثاني عشر'];
    } catch (e) {
      console.warn('Failed to load sections via service:', e);
    }

    const fallback = DEFAULT_SECTIONS[grade] || ['1', '2', '3', '4'];
    return fallback;
  },

  /**
   * Save confirmed identity to local storage and sync to Supabase profile if logged in
   */
  async saveIdentity(info) {
    const current = this.getStoredIdentity();
    const updated = {
      name: (info.name || '').trim(),
      username: (info.username || '').trim(),
      schoolType: info.schoolType === 'other' ? 'other' : 'abu_obaida',
      schoolName: info.schoolType === 'other' ? (info.schoolName || '').trim() : 'مدرسة أبو عبيدة',
      grade: (info.grade || '').trim(),
      section: String(info.section || '').trim(),
      sessionId: current.sessionId || generateUUID(),
      verifiedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
        name: updated.name,
        username: updated.username,
        grade: updated.grade,
        section: updated.section,
        sessionId: updated.sessionId
      }));
    } catch (e) {}

    this._currentVerified = updated;

    // If student is logged in, sync to Supabase profiles
    try {
      const { session } = await authService.getSessionAsync();
      if (session?.user && supabase) {
        await supabase
          .from('profiles')
          .update({
            full_name: updated.name,
            username: updated.username,
            grade: updated.grade,
            section: updated.section,
            school_type: updated.schoolType,
            school_name: updated.schoolName,
            last_verified_at: updated.verifiedAt
          })
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.warn('Could not sync profile to Supabase:', err);
    }

    return updated;
  },

  /**
   * Dedicated guest login modal trigger (for login.html and quick access)
   * Creates a real authenticated session and profile in Supabase database so
   * state becomes officially logged in.
   */
  showGuestLoginModal({ redirectUrl = 'develop.html', onSuccess = null } = {}) {
    const stored = this.getStoredIdentity();
    return new Promise((resolve) => {
      this._renderModal({
        activityName: 'المنصة',
        prefilled: stored,
        user: null,
        isLogin: true,
        allowClose: true,
        onClose: () => resolve(null),
        onConfirm: async (data) => {
          let authSession = null;
          const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const guestEmail = `guest_${cleanUsername}@guest.siraj.om`;
          const guestPassword = `SirajGuest!_${cleanUsername}_2026`;

          // 1. Create or log in to Supabase account so status is logged in and profile exists in DB
          if (supabase) {
            try {
              const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                email: guestEmail,
                password: guestPassword
              });
              if (!signInErr && signInData?.session) {
                authSession = signInData.session;
              }
            } catch (_) {}

            if (!authSession) {
              try {
                const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                  email: guestEmail,
                  password: guestPassword,
                  options: {
                    data: {
                      full_name: data.name,
                      username: data.username,
                      role: 'student'
                    }
                  }
                });
                if (signUpData?.session) {
                  authSession = signUpData.session;
                }
              } catch (err) {
                console.warn('Guest account signup attempt:', err);
              }
            }

            // 2. Update profiles in Supabase with complete student information
            if (authSession?.user?.id) {
              try {
                await supabase
                  .from('profiles')
                  .update({
                    full_name: data.name,
                    username: data.username,
                    grade: data.grade,
                    section: data.section,
                    school_type: data.schoolType,
                    school_name: data.schoolName,
                    last_verified_at: new Date().toISOString()
                  })
                  .eq('id', authSession.user.id);
              } catch (err) {
                console.warn('Error updating guest profile in DB:', err);
              }
            }
          }

          // 3. Save identity locally
          const saved = await this.saveIdentity({
            ...data,
            email: guestEmail,
            sessionId: authSession?.user?.id || stored.sessionId,
            isRegistered: Boolean(authSession)
          });

          // 4. Synchronize local progress to account if any exists
          if (authSession?.user?.id) {
            try {
              const { syncOrResolveProgressConflict } = await import('./progress-sync.js');
              await syncOrResolveProgressConflict(authSession.user.id);
            } catch (err) {
              console.warn('Progress sync on guest login error:', err);
            }
          }

          Toast.success(`أهلاً بك يا ${saved.name}! تم تسجيل دخولك بنجاح.`);
          if (onSuccess) onSuccess(saved);
          if (redirectUrl) {
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 600);
          }
          resolve(saved);
        }
      });
    });
  },

  /**
   * Mandatory verification prompt before starting activity.
   * If logged in and profile is complete: NO MODAL APPEARS.
   * Username is optional for logged-in accounts.
   */
  async requireVerification({
    activityName = 'النشاط',
    forcePrompt = false
  } = {}) {
    // Level 1: Check memory cache (same session)
    if (this._currentVerified && !forcePrompt) {
      console.log('✅ Identity from memory cache');
      return this._currentVerified;
    }

    // Check if user is logged in
    const { session } = await authService.getSessionAsync();
    const user = session?.user || null;

    const storedIdentity = this.getStoredIdentity();

    // ─────────────────────────────────────────────────────────────
    // For LOGGED-IN users (email, Google, or guest account):
    // Data is complete if full_name, grade, and section are present.
    // Username is optional for registered accounts.
    // The modal MUST NOT appear if data is complete!
    // ─────────────────────────────────────────────────────────────
    if (user && !forcePrompt) {
      // 1. Check if localStorage already has complete data
      const isLocalCompleteForUser = Boolean(
        storedIdentity.name &&
        storedIdentity.grade &&
        storedIdentity.section &&
        storedIdentity.verifiedAt
      );

      if (isLocalCompleteForUser) {
        const verifiedIdentity = {
          name: storedIdentity.name,
          username: storedIdentity.username || '',
          schoolType: storedIdentity.schoolType || 'abu_obaida',
          schoolName: storedIdentity.schoolName || 'مدرسة أبو عبيدة',
          grade: storedIdentity.grade,
          section: storedIdentity.section,
          sessionId: user.id,
          verifiedAt: storedIdentity.verifiedAt,
          email: user.email,
          isRegistered: true
        };
        this._currentVerified = verifiedIdentity;
        console.log('✅ Identity from localStorage for logged-in user (no modal needed)');
        return verifiedIdentity;
      }

      // 2. Fetch from Supabase profiles
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, username, grade, section, school_type, school_name, email, last_verified_at')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          const isDbComplete = Boolean(data.full_name && data.grade && data.section);
          if (isDbComplete) {
            const verifiedIdentity = {
              name: data.full_name,
              username: data.username || '',
              schoolType: data.school_type || 'abu_obaida',
              schoolName: data.school_type === 'other' ? (data.school_name || 'مدرسة أخرى') : 'مدرسة أبو عبيدة',
              grade: data.grade,
              section: data.section,
              sessionId: user.id,
              verifiedAt: data.last_verified_at || new Date().toISOString(),
              email: data.email || user.email,
              isRegistered: true
            };

            this._currentVerified = verifiedIdentity;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(verifiedIdentity));
              localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
                name: verifiedIdentity.name,
                username: verifiedIdentity.username,
                grade: verifiedIdentity.grade,
                section: verifiedIdentity.section,
                sessionId: verifiedIdentity.sessionId
              }));
            } catch (_) {}

            console.log('✅ Identity from Supabase for logged-in user (saved to localStorage, no modal needed)');
            return verifiedIdentity;
          }

          // If incomplete in DB, prepare prefilled
          if (data.full_name) storedIdentity.name = data.full_name;
          if (data.username) storedIdentity.username = data.username;
          if (data.grade) storedIdentity.grade = data.grade;
          if (data.section) storedIdentity.section = data.section;
          if (data.school_type) storedIdentity.schoolType = data.school_type;
          if (data.school_name) storedIdentity.schoolName = data.school_name;
          storedIdentity.email = data.email || user.email;
          storedIdentity.isRegistered = true;
        }
      } catch (err) {
        console.warn('Error fetching Supabase profile in requireVerification:', err);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // For GUEST users (not logged in):
    // Requires name, username, grade, section, verifiedAt
    // ─────────────────────────────────────────────────────────────
    if (!user && !forcePrompt) {
      const isGuestComplete = Boolean(
        storedIdentity.name &&
        storedIdentity.username &&
        storedIdentity.grade &&
        storedIdentity.section &&
        storedIdentity.verifiedAt
      );

      if (isGuestComplete) {
        const verifiedIdentity = {
          name: storedIdentity.name,
          username: storedIdentity.username,
          schoolType: storedIdentity.schoolType || 'abu_obaida',
          schoolName: storedIdentity.schoolName || 'مدرسة أبو عبيدة',
          grade: storedIdentity.grade,
          section: storedIdentity.section,
          sessionId: storedIdentity.sessionId || generateUUID(),
          verifiedAt: storedIdentity.verifiedAt,
          email: null,
          isRegistered: false
        };
        this._currentVerified = verifiedIdentity;
        console.log('✅ Identity from localStorage for guest (no modal needed)');
        return verifiedIdentity;
      }
    }

    // Show modal ONLY if:
    // 1. User is guest AND localStorage is incomplete
    // 2. User is logged in AND profile incomplete in both localStorage AND Supabase
    // 3. forcePrompt=true
    console.log('⚠️ Showing verification modal - data incomplete');
    return new Promise((resolve) => {
      this._renderModal({
        activityName,
        prefilled: storedIdentity,
        user,
        onConfirm: async (data) => {
          const saved = await this.saveIdentity(data);
          resolve(saved);
        }
      });
    });
  },

  async _renderModal({ activityName, prefilled, user, onConfirm, isLogin = false, allowClose = false, onClose = null }) {
    // Remove any existing identity modal
    document.querySelector('.siraj-identity-backdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'siraj-identity-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'si-modal-title');

    const schoolClasses = await getSchoolClasses();
    const isAbuObaida = prefilled.schoolType !== 'other';
    const abuObaidaGrades = schoolClasses.grades?.length > 0 ? schoolClasses.grades : ['10', '11', '12'];
    
    // Match prefilled grade with DB grades (handling 'العاشر' <-> '10' etc.)
    let selectedAoGrade = prefilled.grade;
    if (!abuObaidaGrades.includes(selectedAoGrade)) {
      if (selectedAoGrade === 'العاشر' && abuObaidaGrades.includes('10')) selectedAoGrade = '10';
      else if (selectedAoGrade === '10' && abuObaidaGrades.includes('العاشر')) selectedAoGrade = 'العاشر';
      else if (selectedAoGrade === 'الحادي عشر' && abuObaidaGrades.includes('11')) selectedAoGrade = '11';
      else if (selectedAoGrade === '11' && abuObaidaGrades.includes('الحادي عشر')) selectedAoGrade = 'الحادي عشر';
      else if (selectedAoGrade === 'الثاني عشر' && abuObaidaGrades.includes('12')) selectedAoGrade = '12';
      else if (selectedAoGrade === '12' && abuObaidaGrades.includes('الثاني عشر')) selectedAoGrade = 'الثاني عشر';
      else selectedAoGrade = abuObaidaGrades[0] || '10';
    }

    const otherGrades = [
      'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس',
      'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'
    ];

    const isRegisteredUser = Boolean(user && user.id && !isLogin);
    const modalTitle = isLogin ? 'تسجيل الدخول كطالب (بدون حساب)' : 'تأكيد بيانات الطالب';
    const modalSubtitle = isLogin
      ? 'أدخل بياناتك للانضمام الفوري والمشاركة دون الحاجة لإنشاء حساب أو كلمة مرور'
      : `يرجى مراجعة وتأكيد بياناتك قبل بدء ${activityName}`;
    const submitText = isLogin ? 'دخول إلى المنصة' : 'موافق — تأكيد ومتابعة';

    backdrop.innerHTML = `
      <div class="siraj-identity-modal">
        ${allowClose ? `
          <button type="button" id="si-close-modal-btn" class="si-modal-close-btn" aria-label="إغلاق">&times;</button>
        ` : ''}

        <div class="si-modal-header">
          <div class="si-icon-badge">
            <span>🎓</span>
          </div>
          <div class="si-header-text">
            <h2 id="si-modal-title">${modalTitle}</h2>
            <p>${modalSubtitle}</p>
          </div>
        </div>

        <form id="si-form" class="si-form">
          <!-- Full Name -->
          <div class="si-field">
            <label for="si-name" class="si-label">
              <span>اسم الطالب الثلاثي أو الرباعي</span>
              <span class="si-req">*</span>
            </label>
            <input 
              type="text" 
              id="si-name" 
              class="si-input" 
              placeholder="مثال: أحمد بن محمد المعمري" 
              value="${this._escape(prefilled.name)}" 
              required
              autocomplete="name"
            >
          </div>

          <!-- Username (Optional for registered user, Mandatory for guest) -->
          <div class="si-field">
            <label for="si-username" class="si-label">
              <span>اسم المستخدم ${isRegisteredUser ? '<span style="font-size:0.85em; font-weight:normal; opacity:0.75;">(اختياري)</span>' : '(فريد لمنع تشابه الأسماء)'}</span>
              ${isRegisteredUser ? '' : '<span class="si-req">*</span>'}
            </label>
            <input 
              type="text" 
              id="si-username" 
              class="si-input" 
              placeholder="${isRegisteredUser ? 'اختياري - مثال: ahmed_2026' : 'مثال: ahmed_2026 أو mohammed_om'}" 
              value="${this._escape(prefilled.username || '')}" 
              ${isRegisteredUser ? '' : 'required'}
              autocomplete="username"
              dir="ltr"
              style="text-align: right;"
            >
            <div class="si-field-hint" style="margin-top: 0.35rem; font-size: 0.8rem; color: var(--color-text-muted);">
              ${isRegisteredUser
                ? '💡 يمكنك تخصيص اسم مستخدم لحسابك (اختياري)، أو تركه فارغاً.'
                : '💡 اختر اسم مستخدم فريد لتمييز مشاركاتك ومنع تداخل درجاتك مع طالب آخر يحمل نفس الاسم.'
              }
            </div>
          </div>

          <!-- School Type Selector -->
          <div class="si-field">
            <label class="si-label">المدرسة المنتمي إليها</label>
            <div class="si-radio-pills" role="radiogroup">
              <label class="si-radio-pill ${isAbuObaida ? 'active' : ''}">
                <input type="radio" name="si_school_type" value="abu_obaida" ${isAbuObaida ? 'checked' : ''}>
                <span class="si-pill-dot"></span>
                <span>مدرسة أبو عبيدة</span>
              </label>
              <label class="si-radio-pill ${!isAbuObaida ? 'active' : ''}">
                <input type="radio" name="si_school_type" value="other" ${!isAbuObaida ? 'checked' : ''}>
                <span class="si-pill-dot"></span>
                <span>مدرسة أخرى</span>
              </label>
            </div>
          </div>

          <!-- Abu Obaida Section (Conditional) -->
          <div id="si-abu-obaida-box" class="si-branch-box" style="${isAbuObaida ? '' : 'display: none;'}">
            <div class="si-grid-2">
              <div class="si-field">
                <label for="si-ao-grade" class="si-label">
                  <span>الصف الدراسي</span>
                  <span class="si-req">*</span>
                </label>
                <select id="si-ao-grade" class="si-select">
                  ${abuObaidaGrades.map(g => `
                    <option value="${g}" ${selectedAoGrade === g ? 'selected' : ''}>${formatGradeLabel(g)}</option>
                  `).join('')}
                </select>
              </div>

              <div class="si-field">
                <label for="si-ao-section" class="si-label">
                  <span>الشعبة المتاحة</span>
                  <span class="si-req">*</span>
                </label>
                <select id="si-ao-section" class="si-select">
                  <option value="">جاري تحميل الشعب...</option>
                </select>
              </div>
            </div>
            <div class="si-field-hint">
              🏛️ الشعب المتاحة يتم تحديثها تلقائياً حسب الصف المختار من إدارة مدرسة أبو عبيدة.
            </div>
          </div>

          <!-- Other School Section (Conditional) -->
          <div id="si-other-box" class="si-branch-box" style="${!isAbuObaida ? '' : 'display: none;'}">
            <div class="si-field" style="margin-bottom: 0.75rem;">
              <label for="si-other-school-name" class="si-label">
                <span>اسم المدرسة</span>
                <span class="si-req">*</span>
              </label>
              <input 
                type="text" 
                id="si-other-school-name" 
                class="si-input" 
                placeholder="أدخل اسم مدرستك كاملة..."
                value="${this._escape(prefilled.schoolType === 'other' ? prefilled.schoolName : '')}"
              >
            </div>

            <div class="si-grid-2">
              <div class="si-field">
                <label for="si-other-grade" class="si-label">
                  <span>الصف الدراسي (1 - 12)</span>
                  <span class="si-req">*</span>
                </label>
                <select id="si-other-grade" class="si-select">
                  ${otherGrades.map((g, idx) => `
                    <option value="${g}" ${prefilled.grade === g ? 'selected' : (idx === 9 ? 'selected' : '')}>الصف ${g}</option>
                  `).join('')}
                </select>
              </div>

              <div class="si-field">
                <label for="si-other-section" class="si-label">
                  <span>رقم الشعبة (عدد صحيح)</span>
                  <span class="si-req">*</span>
                </label>
                <input 
                  type="number" 
                  id="si-other-section" 
                  class="si-input" 
                  placeholder="مثال: 3"
                  min="1" 
                  max="50"
                  step="1"
                  value="${prefilled.schoolType === 'other' ? prefilled.section : '1'}"
                >
              </div>
            </div>
          </div>

          <!-- Account info notice -->
          <div class="si-account-notice">
            ${user ? `
              <div class="si-notice-row">
                <span>🔐</span>
                <span>أنت مسجل الدخول بحساب <strong>${this._escape(user.email)}</strong>. سيتم ربط مشاركتك بملفك الدائم.</span>
              </div>
            ` : isLogin ? `
              <div class="si-notice-row">
                <span>⚡</span>
                <span>دخول فوري مباشر: تُحفظ بياناتك ودرجاتك تحت اسم المستخدم هذا على هذا المتصفح دون الحاجة لكلمة مرور.</span>
              </div>
            ` : `
              <div class="si-notice-row">
                <span>🌐</span>
                <span>تشارك كضيف دائم عبر هذا المتصفح. إذا كان لديك حساب بالفعل، يمكنك <a href="login.html">تسجيل الدخول</a> لحفظ نتائجك في سجلك المدرسي الرسمي.</span>
              </div>
            `}
          </div>

          <!-- Action Button -->
          <div class="si-actions">
            <button type="submit" id="si-submit-btn" class="btn btn-primary si-submit-btn">
              <span>${submitText}</span>
              <span class="si-btn-arrow">←</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Grab elements
    const form = backdrop.querySelector('#si-form');
    const nameInput = backdrop.querySelector('#si-name');
    const usernameInput = backdrop.querySelector('#si-username');
    const radioTypeEls = backdrop.querySelectorAll('input[name="si_school_type"]');
    const abuBox = backdrop.querySelector('#si-abu-obaida-box');
    const otherBox = backdrop.querySelector('#si-other-box');
    const aoGradeSelect = backdrop.querySelector('#si-ao-grade');
    const aoSectionSelect = backdrop.querySelector('#si-ao-section');
    const otherSchoolInput = backdrop.querySelector('#si-other-school-name');
    const otherGradeSelect = backdrop.querySelector('#si-other-grade');
    const otherSectionInput = backdrop.querySelector('#si-other-section');

    if (allowClose) {
      const closeBtn = backdrop.querySelector('#si-close-modal-btn');
      const dismiss = () => {
        backdrop.classList.add('si-closing');
        setTimeout(() => backdrop.remove(), 250);
        if (onClose) onClose();
      };
      if (closeBtn) closeBtn.addEventListener('click', dismiss);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) dismiss();
      });
    }

    // Populate Abu Obaida sections based on initial grade
    const updateAoSections = async (chosenGrade, currentSection) => {
      aoSectionSelect.innerHTML = '<option value="">جاري التحميل...</option>';
      const sections = await this.getSectionsForGrade(chosenGrade);
      
      if (!sections || sections.length === 0) {
        aoSectionSelect.innerHTML = '<option value="1">1</option>';
        return;
      }

      aoSectionSelect.innerHTML = sections.map(s => `
        <option value="${s}" ${String(currentSection) === String(s) ? 'selected' : ''}>${formatSectionLabel(s)}</option>
      `).join('');

      // If previous section not valid for this grade, pick first one
      if (!sections.includes(String(currentSection))) {
        aoSectionSelect.value = sections[0];
      }
    };

    updateAoSections(aoGradeSelect.value, prefilled.section);

    // Event: Grade change triggers re-fetching sections
    aoGradeSelect.addEventListener('change', () => {
      updateAoSections(aoGradeSelect.value, aoSectionSelect.value);
    });

    // Event: School type radio toggle
    radioTypeEls.forEach(r => {
      r.addEventListener('change', () => {
        backdrop.querySelectorAll('.si-radio-pill').forEach(p => p.classList.remove('active'));
        r.closest('.si-radio-pill').classList.add('active');

        if (r.value === 'abu_obaida') {
          abuBox.style.display = '';
          otherBox.style.display = 'none';
        } else {
          abuBox.style.display = 'none';
          otherBox.style.display = '';
          setTimeout(() => otherSchoolInput.focus(), 50);
        }
      });
    });

    setTimeout(() => {
      if (!nameInput.value) nameInput.focus();
      else if (!usernameInput.value) usernameInput.focus();
    }, 100);

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameVal = nameInput.value.trim();
      if (!nameVal || nameVal.length < 2) {
        Toast.error('يرجى إدخال اسم الطالب كاملاً (حرفين على الأقل).');
        nameInput.focus();
        return;
      }

      const usernameVal = usernameInput.value.trim();
      if (!isRegisteredUser) {
        if (!usernameVal || usernameVal.length < 3) {
          Toast.error('يرجى إدخال اسم مستخدم فريد لا يقل عن 3 أحرف.');
          usernameInput.focus();
          return;
        }
      } else {
        if (usernameVal && usernameVal.length < 3) {
          Toast.error('اسم المستخدم يجب أن لا يقل عن 3 أحرف إذا تم إدخاله.');
          usernameInput.focus();
          return;
        }
      }

      const selectedType = backdrop.querySelector('input[name="si_school_type"]:checked').value;

      let verifiedData = {};

      if (selectedType === 'abu_obaida') {
        const gradeVal = aoGradeSelect.value;
        const sectionVal = aoSectionSelect.value;

        if (!sectionVal) {
          Toast.error('يرجى اختيار شعبة صحيحة.');
          return;
        }

        // Validate that section belongs to this grade
        const validSections = await this.getSectionsForGrade(gradeVal);
        if (validSections.length > 0 && !validSections.includes(String(sectionVal))) {
          Toast.error('الشعبة المختارة لا تنتمي للصف المحدد.');
          return;
        }

        verifiedData = {
          name: nameVal,
          username: usernameVal,
          schoolType: 'abu_obaida',
          schoolName: 'مدرسة أبو عبيدة',
          grade: gradeVal,
          section: sectionVal
        };
      } else {
        const schoolNameVal = otherSchoolInput.value.trim();
        if (!schoolNameVal || schoolNameVal.length < 2) {
          Toast.error('يرجى كتابة اسم المدرسة بشكل صحيح.');
          otherSchoolInput.focus();
          return;
        }

        const gradeVal = otherGradeSelect.value;
        const sectionNum = parseInt(otherSectionInput.value, 10);

        if (isNaN(sectionNum) || sectionNum <= 0) {
          Toast.error('يرجى إدخال رقم شعبة صحيح (عدد صحيح موجب).');
          otherSectionInput.focus();
          return;
        }

        verifiedData = {
          name: nameVal,
          username: usernameVal,
          schoolType: 'other',
          schoolName: schoolNameVal,
          grade: gradeVal,
          section: String(sectionNum)
        };
      }

      // Cleanup modal and resolve
      backdrop.classList.add('si-closing');
      setTimeout(() => backdrop.remove(), 250);

      onConfirm(verifiedData);
    });
  },

  _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
