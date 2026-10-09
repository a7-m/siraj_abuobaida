/**
 * Scientific Research Submission Handler — سراج مدرسة أبو عبيدة
 * Allows registered students and guests to submit research papers.
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';
import { guestService } from '../utils/guest.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('research-form');
  if (!form) return;

  const nameInput = document.getElementById('res-student-name');
  const gradeInput = document.getElementById('res-student-grade');
  const sectionInput = document.getElementById('res-student-section');
  const emailInput = document.getElementById('res-student-email');
  const userBadge = document.getElementById('res-user-badge');
  const submitBtn = document.getElementById('res-submit-btn');

  let currentUser = null;
  let userProfile = null;

  try {
    const { session } = await authService.getSessionAsync();
    if (session && session.user) {
      currentUser = session.user;
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (prof) {
        userProfile = prof;
        if (nameInput) {
          nameInput.value = prof.full_name || '';
          nameInput.disabled = true;
        }
        if (gradeInput && prof.grade) {
          gradeInput.value = prof.grade;
        }
        if (sectionInput && prof.section) {
          sectionInput.value = prof.section;
        }
        if (emailInput) {
          emailInput.value = session.user.email || '';
          emailInput.disabled = true;
        }
        if (userBadge) {
          userBadge.textContent = 'حساب طالب مسجل';
          userBadge.className = 'badge badge-published';
        }
      }
    } else {
      // Guest mode
      const guest = guestService.getGuestInfo();
      if (nameInput && guest.name) nameInput.value = guest.name;
      if (gradeInput && guest.grade) gradeInput.value = guest.grade;
      if (sectionInput && guest.section) sectionInput.value = guest.section;
      if (userBadge) {
        userBadge.textContent = 'مشاركة كزائر (بدون حساب)';
        userBadge.className = 'badge';
        userBadge.style.background = 'rgba(245, 158, 11, 0.15)';
        userBadge.style.color = '#d97706';
      }
    }
  } catch (err) {
    console.warn('Auth check error in research:', err);
  }

  // Handle Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameVal = nameInput ? nameInput.value.trim() : '';
    const gradeVal = gradeInput ? gradeInput.value : '';
    const sectionVal = sectionInput ? sectionInput.value.trim() : '';
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const titleVal = document.getElementById('res-title')?.value.trim();
    const fieldVal = document.getElementById('res-field')?.value;
    const summaryVal = document.getElementById('res-summary')?.value.trim();
    const fileUrlVal = document.getElementById('res-file-url')?.value.trim() || null;

    if (!titleVal) {
      Toast.error('يرجى كتابة عنوان البحث.');
      return;
    }
    if (!nameVal) {
      Toast.error('يرجى كتابة اسم الطالب.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري إرسال البحث...';
    }

    try {
      const payload = {
        title: titleVal,
        field: fieldVal || 'العلوم والتكنولوجيا',
        summary: summaryVal || '',
        file_url: fileUrlVal,
        status: 'submitted'
      };

      if (currentUser) {
        payload.student_id = currentUser.id;
      } else {
        const guest = guestService.setGuestInfo({
          name: nameVal,
          grade: gradeVal,
          section: sectionVal,
          email: emailVal
        });
        payload.student_id = null;
        payload.guest_name = guest.name;
        payload.guest_grade = guest.grade || null;
        payload.guest_section = guest.section || null;
        payload.guest_email = emailVal || null;
        payload.guest_session_id = guest.sessionId;
      }

      const { data, error } = await supabase
        .from('research_submissions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      Toast.success('تم إرسال البحث بنجاح! سيتم مراجعته من قبل لجنة التحكيم.');

      // Update UI to show submission confirmation
      const statusBox = document.getElementById('res-status-display');
      if (statusBox) {
        statusBox.innerHTML = `
          <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: var(--border-radius); padding: 1rem; color: #16a34a; text-align: center;">
            <strong>تم تسليم البحث بنجاح!</strong>
            <p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--color-text);">عنوان البحث: <em>${titleVal}</em> — الحالة: قيد التحكيم</p>
          </div>
        `;
      }

      form.reset();
      if (currentUser && userProfile) {
        if (nameInput) nameInput.value = userProfile.full_name || '';
        if (gradeInput) gradeInput.value = userProfile.grade || '';
        if (sectionInput) sectionInput.value = userProfile.section || '';
      }
    } catch (err) {
      console.error('Research submit error:', err);
      Toast.error('تعذر إرسال البحث، يرجى المحاولة مرة أخرى.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إرسال البحث والمشاركة';
      }
    }
  });
});
