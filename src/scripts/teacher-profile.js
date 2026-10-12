/**
 * Teacher Profile Management Controller
 * منصة السراج – مدرسة أبو عبيدة
 * Allows the teacher to update personal information, school details,
 * and securely change their account password.
 */

import { initTeacherAdmin, showConfirmModal, logoutTeacher, escapeHtml, formatDate } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { authService } from '../services/auth.js';
import { Toast } from '../utils/toast.js';

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const adminData = await initTeacherAdmin('profile');
    currentUser = adminData.user;
    currentProfile = adminData.profile;

    populateProfileData();
    setupEvents();
    await loadTeacherActivityStats();
  } catch (err) {
    console.error('Teacher profile init error:', err);
  }
});

function populateProfileData() {
  if (!currentProfile) return;

  const fullName = currentProfile.full_name || 'المعلم';
  const email = currentUser?.email || currentProfile.email || 'غير متوفر';
  const school = currentProfile.school_name || 'مدرسة أبو عبيدة بن الجراح للتعليم ما بعد الأساسي (10-12)';

  // Hero section
  const heroName = document.getElementById('prof-hero-name');
  const heroEmail = document.getElementById('prof-hero-email');
  const heroSchool = document.getElementById('prof-hero-school');
  if (heroName) heroName.textContent = fullName;
  if (heroEmail) heroEmail.textContent = `✉️ ${email}`;
  if (heroSchool) heroSchool.textContent = school;

  // Form inputs
  const inputName = document.getElementById('prof-fullname');
  const inputEmail = document.getElementById('prof-email');
  const inputSchool = document.getElementById('prof-school');
  if (inputName) inputName.value = fullName;
  if (inputEmail) inputEmail.value = email;
  if (inputSchool) inputSchool.value = school;

  // Overview stats
  const joinDateEl = document.getElementById('prof-join-date');
  if (joinDateEl) joinDateEl.textContent = formatDate(currentProfile.created_at);
}

function setupEvents() {
  const formDetails = document.getElementById('form-profile-details');
  const formPassword = document.getElementById('form-change-password');
  const btnHeroLogout = document.getElementById('btn-hero-logout');
  const btnDangerLogout = document.getElementById('btn-danger-logout');

  if (formDetails) {
    formDetails.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfileDetails();
    });
  }

  if (formPassword) {
    formPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      await changePassword();
    });
  }

  const triggerLogout = (e) => {
    if (e) e.preventDefault();
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

  if (btnHeroLogout) btnHeroLogout.addEventListener('click', triggerLogout);
  if (btnDangerLogout) btnDangerLogout.addEventListener('click', triggerLogout);
}

/**
 * Save updated name and school to profiles table
 */
async function saveProfileDetails() {
  const inputName = document.getElementById('prof-fullname');
  const inputSchool = document.getElementById('prof-school');
  const saveBtn = document.getElementById('btn-save-profile');

  const newName = inputName?.value.trim();
  const newSchool = inputSchool?.value.trim() || 'مدرسة أبو عبيدة بن الجراح';

  if (!newName) {
    Toast.error('يرجى إدخال اسم المعلم');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري حفظ التغييرات...';
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: newName,
        school_name: newSchool,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error) throw error;

    currentProfile = data;
    populateProfileData();

    // Update header name display
    const headerName = document.getElementById('header-teacher-name');
    if (headerName) headerName.textContent = newName;
    const sidebarName = document.getElementById('sidebar-teacher-name');
    if (sidebarName) sidebarName.textContent = newName;

    Toast.success('تم تحديث البيانات الشخصية بنجاح');
  } catch (err) {
    console.error('Error updating profile:', err);
    Toast.error('تعذر حفظ التغييرات. يرجى المحاولة مرة أخرى.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 حفظ التغييرات الشخصية';
    }
  }
}

/**
 * Update teacher password securely via Supabase Auth
 */
async function changePassword() {
  const newPassInput = document.getElementById('prof-new-password');
  const confirmPassInput = document.getElementById('prof-confirm-password');
  const updateBtn = document.getElementById('btn-update-password');

  const newPass = newPassInput?.value;
  const confirmPass = confirmPassInput?.value;

  if (!newPass || newPass.length < 6) {
    Toast.error('يجب ألا تقل كلمة المرور عن 6 أحرف');
    return;
  }

  if (newPass !== confirmPass) {
    Toast.error('كلمتا المرور غير متطابقتين');
    return;
  }

  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.textContent = 'جاري التحديث...';
  }

  try {
    await authService.updatePassword(newPass);
    Toast.success('تم تغيير كلمة المرور بنجاح');
    if (newPassInput) newPassInput.value = '';
    if (confirmPassInput) confirmPassInput.value = '';
  } catch (err) {
    console.error('Error changing password:', err);
    Toast.error(err.message || 'تعذر تغيير كلمة المرور');
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '🔑 تحديث كلمة المرور';
    }
  }
}

/**
 * Load teacher platform activity counts
 */
async function loadTeacherActivityStats() {
  try {
    const [compRes, resRes] = await Promise.all([
      supabase.from('competitions').select('*', { count: 'exact', head: true }),
      supabase.from('research_submissions').select('*', { count: 'exact', head: true })
    ]);

    const compStat = document.getElementById('prof-stat-comps');
    if (compStat) compStat.textContent = (compRes.count ?? 0).toLocaleString('ar-OM');

    const resStat = document.getElementById('prof-stat-research');
    if (resStat) resStat.textContent = (resRes.count ?? 0).toLocaleString('ar-OM');
  } catch (e) {
    console.warn('Error loading teacher stats:', e);
  }
}
