/**
 * Progress Synchronization & Conflict Resolution Utility
 * منصة السراج – مدرسة أبو عبيدة
 * ─────────────────────────────────────────────────────────────
 * Synchronizes localStorage progress with Supabase student account.
 * When conflicts exist between local device progress and cloud DB progress,
 * prompts the student with a clean modal to choose which progress to keep.
 */

import { supabase } from '../services/supabase.js';
import { Toast } from './toast.js';

const PROGRESS_STORAGE_KEY = 'siraj_student_progress';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Check and synchronize progress between localStorage and Supabase account.
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<Object>} The resolved progress map
 */
export async function syncOrResolveProgressConflict(userId) {
  if (!userId || !supabase) {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  // 1. Read local progress
  let localMap = {};
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) localMap = JSON.parse(raw);
  } catch (_) {
    localMap = {};
  }

  const localKeys = Object.keys(localMap).filter(k => localMap[k] && (localMap[k].status || localMap[k].score));
  const hasLocalProgress = localKeys.length > 0;

  // 2. Fetch database progress for this user
  let dbRows = [];
  try {
    const { data, error } = await supabase
      .from('student_progress')
      .select('challenge_level_id, status, score, completed_at')
      .eq('student_id', userId);
    if (!error && data) dbRows = data;
  } catch (err) {
    console.warn('Error fetching DB progress in sync:', err);
  }

  const dbMap = {};
  dbRows.forEach(r => {
    dbMap[r.challenge_level_id] = {
      status: r.status,
      score: r.score || 0
    };
  });
  const dbKeys = Object.keys(dbMap).filter(k => dbMap[k] && (dbMap[k].status || dbMap[k].score));
  const hasDbProgress = dbKeys.length > 0;

  // Case 1: No local progress at all
  if (!hasLocalProgress) {
    if (hasDbProgress) {
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(dbMap));
      } catch (_) {}
    }
    return dbMap;
  }

  // Case 2: Has local progress, but account has NO progress in database
  if (hasLocalProgress && !hasDbProgress) {
    console.log('🔄 Saving local progress to account in database...');
    try {
      const inserts = localKeys.map(lvlId => ({
        student_id: userId,
        challenge_level_id: lvlId,
        status: localMap[lvlId].status || 'in_progress',
        score: localMap[lvlId].score || 0,
        completed_at: new Date().toISOString()
      }));

      const { error: upsertErr } = await supabase
        .from('student_progress')
        .upsert(inserts, { onConflict: 'student_id,challenge_level_id' });

      if (!upsertErr) {
        Toast.success('تمت مزامنة تقدمك الدراسي السابق وحفظه في حسابك بنجاح! 🎉');
      }
    } catch (err) {
      console.warn('Error saving local progress to DB:', err);
    }
    return localMap;
  }

  // Case 3: Both exist — check if they are identical or have conflict
  const isIdentical = localKeys.length === dbKeys.length && localKeys.every(k => {
    const l = localMap[k];
    const d = dbMap[k];
    return d && l.status === d.status && (l.score || 0) === (d.score || 0);
  });

  if (isIdentical) {
    return dbMap;
  }

  // Conflict exists! Let student choose between local progress and database progress
  console.log('⚠️ Progress conflict detected between local and DB. Prompting student...');

  // Calculate statistics for comparison
  const localStats = {
    completed: localKeys.filter(k => localMap[k]?.status === 'completed').length,
    inProgress: localKeys.filter(k => localMap[k]?.status === 'in_progress').length,
    totalScore: localKeys.reduce((sum, k) => sum + (localMap[k]?.score || 0), 0)
  };

  const dbStats = {
    completed: dbKeys.filter(k => dbMap[k]?.status === 'completed').length,
    inProgress: dbKeys.filter(k => dbMap[k]?.status === 'in_progress').length,
    totalScore: dbKeys.reduce((sum, k) => sum + (dbMap[k]?.score || 0), 0)
  };

  return new Promise((resolve) => {
    renderConflictModal({
      localStats,
      dbStats,
      onChooseLocal: async () => {
        try {
          const inserts = localKeys.map(lvlId => ({
            student_id: userId,
            challenge_level_id: lvlId,
            status: localMap[lvlId].status || 'in_progress',
            score: localMap[lvlId].score || 0,
            completed_at: new Date().toISOString()
          }));

          await supabase
            .from('student_progress')
            .upsert(inserts, { onConflict: 'student_id,challenge_level_id' });

          Toast.success('تم اعتماد التقدم المحلي وحفظه في حسابك السحابي.');
        } catch (e) {
          console.warn('Failed to overwrite DB with local:', e);
        }
        resolve(localMap);
      },
      onChooseDb: () => {
        try {
          localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(dbMap));
        } catch (_) {}
        Toast.success('تم اعتماد التقدم المسجل في حسابك السحابي.');
        resolve(dbMap);
      }
    });
  });
}

function renderConflictModal({ localStats, dbStats, onChooseLocal, onChooseDb }) {
  document.querySelector('.siraj-conflict-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'siraj-conflict-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  backdrop.innerHTML = `
    <div class="siraj-conflict-modal">
      <div class="sc-header">
        <div class="sc-icon">🔄</div>
        <div>
          <h3 class="sc-title">مزامنة التقدم الدراسي</h3>
          <p class="sc-subtitle">وجدنا تقدماً مسجلاً على هذا الجهاز وتقدماً مختلفاً مسجلاً في حسابك السحابي. يرجى اختيار التقدم الذي تود اعتماده والمتابعة به:</p>
        </div>
      </div>

      <div class="sc-cards-grid">
        <!-- Option 1: Local Progress -->
        <div class="sc-card" id="sc-card-local">
          <div class="sc-card-badge">📱 تقدم هذا الجهاز (محلياً)</div>
          <div class="sc-card-stats">
            <div class="sc-stat-item">
              <span class="sc-stat-val">${localStats.completed}</span>
              <span class="sc-stat-lbl">مستويات مكتملة</span>
            </div>
            <div class="sc-stat-item">
              <span class="sc-stat-val">${localStats.inProgress}</span>
              <span class="sc-stat-lbl">قيد الإنجاز</span>
            </div>
            <div class="sc-stat-item">
              <span class="sc-stat-val sc-score">${localStats.totalScore}</span>
              <span class="sc-stat-lbl">مجموع النقاط</span>
            </div>
          </div>
          <p class="sc-card-desc">اختر هذا الخيار إذا كنت قد أنجزت مستويات أثناء الدخول بدون حساب وتريد حفظها في حسابك الآن.</p>
          <button type="button" class="btn btn-primary sc-choice-btn" id="sc-btn-local">
            <span>✓ اعتماد تقدم الجهاز وحفظه في الحساب</span>
          </button>
        </div>

        <!-- Option 2: Cloud DB Progress -->
        <div class="sc-card" id="sc-card-db">
          <div class="sc-card-badge sc-badge-cloud">☁️ تقدم الحساب السحابي (قاعدة البيانات)</div>
          <div class="sc-card-stats">
            <div class="sc-stat-item">
              <span class="sc-stat-val">${dbStats.completed}</span>
              <span class="sc-stat-lbl">مستويات مكتملة</span>
            </div>
            <div class="sc-stat-item">
              <span class="sc-stat-val">${dbStats.inProgress}</span>
              <span class="sc-stat-lbl">قيد الإنجاز</span>
            </div>
            <div class="sc-stat-item">
              <span class="sc-stat-val sc-score">${dbStats.totalScore}</span>
              <span class="sc-stat-lbl">مجموع النقاط</span>
            </div>
          </div>
          <p class="sc-card-desc">اختر هذا الخيار إذا كنت تريد استعادة ما هو محفوظ مسبقاً في حسابك وتجاهل ما تم محلياً على هذا الجهاز.</p>
          <button type="button" class="btn btn-outline sc-choice-btn" id="sc-btn-db">
            <span>✓ الاحتفاظ بتقدم الحساب السحابي</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeWith = (callback) => {
    backdrop.classList.add('sc-closing');
    setTimeout(() => backdrop.remove(), 250);
    callback();
  };

  backdrop.querySelector('#sc-btn-local').addEventListener('click', () => {
    closeWith(onChooseLocal);
  });

  backdrop.querySelector('#sc-btn-db').addEventListener('click', () => {
    closeWith(onChooseDb);
  });
}
