/**
 * Unified Student Identity System — منصة السراج (مدرسة أبو عبيدة)
 * ─────────────────────────────────────────────────────────────
 * • Unified across competition.html and develop.html
 * • Modal must be confirmed ("موافق") on each visit before starting activity
 * • Abu Obaida School: grades (10, 11, 12) + dynamic sections managed via DB
 * • Other Schools: custom school name + grades (1-12) + manual positive integer section
 * • Works seamlessly with both authenticated Supabase accounts and persistent guest sessions
 * • Keeps profile identity decoupled from competition attempts and reading challenge progress
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from './toast.js';

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
      schoolType: 'abu_obaida',
      schoolName: 'مدرسة أبو عبيدة',
      grade: 'العاشر',
      section: '1',
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
    if (this._sectionsCache[grade]) {
      return this._sectionsCache[grade];
    }

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('school_sections')
          .select('section_name')
          .eq('grade', grade)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const list = data.map(d => String(d.section_name));
          this._sectionsCache[grade] = list;
          return list;
        }
      }
    } catch (e) {
      console.warn('Failed to load sections from DB, using fallback:', e);
    }

    const fallback = DEFAULT_SECTIONS[grade] || ['1', '2', '3', '4'];
    this._sectionsCache[grade] = fallback;
    return fallback;
  },

  /**
   * Save confirmed identity to local storage and sync to Supabase profile if logged in
   */
  async saveIdentity(info) {
    const current = this.getStoredIdentity();
    const updated = {
      name: (info.name || '').trim(),
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
   * Mandatory verification prompt before starting activity.
   * If already confirmed in the current page execution, returns immediately.
   * Otherwise renders the modal and waits for "موافق".
   */
  async requireVerification({
    activityName = 'النشاط',
    forcePrompt = false
  } = {}) {
    if (this._currentVerified && !forcePrompt) {
      return this._currentVerified;
    }

    // Check if user is logged in and fetch latest profile
    const { session } = await authService.getSessionAsync();
    const user = session?.user || null;
    let prefilled = this.getStoredIdentity();

    if (user && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, grade, section, school_type, school_name, email')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          if (data.full_name) prefilled.name = data.full_name;
          if (data.grade) prefilled.grade = data.grade;
          if (data.section) prefilled.section = data.section;
          if (data.school_type) prefilled.schoolType = data.school_type;
          if (data.school_name) prefilled.schoolName = data.school_name;
          prefilled.email = data.email || user.email;
          prefilled.isRegistered = true;
        }
      } catch (e) {
        console.warn('Error fetching user profile:', e);
      }
    }

    return new Promise((resolve) => {
      this._renderModal({
        activityName,
        prefilled,
        user,
        onConfirm: async (data) => {
          const saved = await this.saveIdentity(data);
          resolve(saved);
        }
      });
    });
  },

  _renderModal({ activityName, prefilled, user, onConfirm }) {
    // Remove any existing identity modal
    document.querySelector('.siraj-identity-backdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'siraj-identity-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'si-modal-title');

    const isAbuObaida = prefilled.schoolType !== 'other';
    const abuObaidaGrades = ['العاشر', 'الحادي عشر', 'الثاني عشر'];
    const otherGrades = [
      'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس',
      'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'
    ];

    backdrop.innerHTML = `
      <div class="siraj-identity-modal">
        <div class="si-modal-header">
          <div class="si-icon-badge">
            <span>🎓</span>
          </div>
          <div class="si-header-text">
            <h2 id="si-modal-title">تأكيد بيانات الطالب</h2>
            <p>يرجى مراجعة وتأكيد بياناتك قبل بدء ${activityName}</p>
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
                    <option value="${g}" ${prefilled.grade === g ? 'selected' : ''}>الصف ${g}</option>
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
            ` : `
              <div class="si-notice-row">
                <span>🌐</span>
                <span>تشارك كضيف دائم عبر هذا المتصفح. إذا كان لديك حساب بالفعل، يمكنك <a href="login.html">تسجيل الدخول</a> لحفظ نتائجك في سجلك المدرسي الرسمي.</span>
              </div>
            `}
          </div>

          <!-- Action Button: Must Click "موافق" -->
          <div class="si-actions">
            <button type="submit" id="si-submit-btn" class="btn btn-primary si-submit-btn">
              <span>موافق — تأكيد ومتابعة</span>
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
    const radioTypeEls = backdrop.querySelectorAll('input[name="si_school_type"]');
    const abuBox = backdrop.querySelector('#si-abu-obaida-box');
    const otherBox = backdrop.querySelector('#si-other-box');
    const aoGradeSelect = backdrop.querySelector('#si-ao-grade');
    const aoSectionSelect = backdrop.querySelector('#si-ao-section');
    const otherSchoolInput = backdrop.querySelector('#si-other-school-name');
    const otherGradeSelect = backdrop.querySelector('#si-other-grade');
    const otherSectionInput = backdrop.querySelector('#si-other-section');

    // Populate Abu Obaida sections based on initial grade
    const updateAoSections = async (chosenGrade, currentSection) => {
      aoSectionSelect.innerHTML = '<option value="">جاري التحميل...</option>';
      const sections = await this.getSectionsForGrade(chosenGrade);
      
      if (!sections || sections.length === 0) {
        aoSectionSelect.innerHTML = '<option value="1">1</option>';
        return;
      }

      aoSectionSelect.innerHTML = sections.map(s => `
        <option value="${s}" ${String(currentSection) === String(s) ? 'selected' : ''}>شعبة ${s}</option>
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
