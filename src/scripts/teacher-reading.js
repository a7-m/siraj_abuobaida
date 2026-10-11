/**
 * Teacher Reading Challenges Module ("طوّر نفسك")
 * منصة السراج – مدرسة أبو عبيدة
 */

import { initTeacherAdmin } from './teacher-nav.js';
import { setupChallenges } from './teacher-challenges.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('reading');
    setupChallenges();
  } catch (err) {
    console.error('Teacher reading module init error:', err);
  }
});
