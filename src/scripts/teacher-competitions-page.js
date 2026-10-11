/**
 * Teacher Competitions Page Controller
 * منصة السراج – مدرسة أبو عبيدة
 */

import { initTeacherAdmin } from './teacher-nav.js';
import { setupCompetitions } from './teacher-competitions.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('competitions');
    setupCompetitions();
  } catch (err) {
    console.error('Competitions page init error:', err);
  }
});
