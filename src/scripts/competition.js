/**
 * Competition System — سراج مدرسة أبو عبيدة
 * ─────────────────────────────────────────────────────────────
 * Architecture:
 *   CompetitionController  — main orchestrator (list / detail / quiz / result)
 *   QuizEngine             — question flow, progress bar, answer collection
 *   QuestionRenderer       — extensible per-type renderer (mcq | tf | order)
 *   AttemptService         — Supabase CRUD for attempts & answers
 *
 * DB Tables used (no schema changes):
 *   competitions           id, title, description, image_url, start_date, end_date
 *   competition_questions  competition_id, question_id, order_num
 *   questions              id, type, text, image_url, points, metadata
 *   competition_attempts   id, student_id, competition_id, status, total_score, started_at, submitted_at
 *   attempt_answers        attempt_id, question_id, answer_data, score
 *
 * Question types supported:  mcq | tf | order
 * To add a new type later:   add one case to QuestionRenderer.render()
 *
 * Future dashboard notes:
 *   Teachers INSERT competitions/questions via Supabase — RLS already allows it.
 *   No changes needed here when the dashboard is built.
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Derives competition status from start_date / end_date (no 'status' column in schema) */
function deriveStatus(comp) {
  const now = Date.now();
  const start = comp.start_date ? new Date(comp.start_date).getTime() : null;
  const end   = comp.end_date   ? new Date(comp.end_date).getTime()   : null;
  if (!start && !end) return 'open';
  if (start && now < start) return 'upcoming';
  if (end   && now > end)   return 'ended';
  return 'active';
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// QuestionRenderer — Strategy Pattern
// ─────────────────────────────────────────────────────────────
const QuestionRenderer = {

  render(q, idx, total) {
    let body = '';
    switch (q.type) {
      case 'mcq':
      case 'multi': body = QuestionRenderer._mcq(q); break;
      case 'tf':    body = QuestionRenderer._tf(q);  break;
      case 'order': body = QuestionRenderer._order(q); break;
      default:
        body = `<p class="comp-q-unsupported">نوع السؤال غير مدعوم: ${q.type}</p>`;
    }

    const imgHtml = q.image_url
      ? `<div class="comp-q-img-wrap"><img src="${q.image_url}" alt="صورة السؤال" class="comp-q-img" onerror="this.parentElement.style.display='none'"></div>`
      : '';

    return `
      <div class="comp-question" id="comp-q-${q.id}" data-q-id="${q.id}" data-q-type="${q.type}">
        <div class="comp-q-header">
          <span class="comp-q-num">${idx + 1} / ${total}</span>
          <span class="comp-q-pts">${q.points || 1} نقطة</span>
        </div>
        ${imgHtml}
        <p class="comp-q-text">${q.text}</p>
        <div class="comp-q-body">${body}</div>
      </div>`;
  },

  _mcq(q) {
    const opts = q.metadata?.options || [];
    return `<div class="comp-opts" role="radiogroup">
      ${opts.map((o, i) => `
        <label class="comp-opt" for="o_${q.id}_${i}">
          <input type="radio" id="o_${q.id}_${i}" name="q_${q.id}" value="${o}" data-q-id="${q.id}">
          <span class="comp-opt-dot"></span>
          <span class="comp-opt-txt">${o}</span>
        </label>`).join('')}
    </div>`;
  },

  _tf(q) {
    const opts = q.metadata?.options || ['صح', 'خطأ'];
    return `<div class="comp-tf-wrap" role="radiogroup">
      ${opts.map((o, i) => `
        <label class="comp-tf-opt" for="tf_${q.id}_${i}">
          <input type="radio" id="tf_${q.id}_${i}" name="q_${q.id}" value="${o}" data-q-id="${q.id}">
          <span class="comp-tf-dot"></span>
          <span>${o}</span>
        </label>`).join('')}
    </div>`;
  },

  _order(q) {
    const items = q.metadata?.items || [];
    const instruction = q.metadata?.instruction || 'رتّب العناصر بالترتيب الصحيح';
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return `
      <p class="comp-order-instr">📋 ${instruction}</p>
      <ul class="comp-order-list" data-q-id="${q.id}">
        ${shuffled.map(item => `
          <li class="comp-order-item" draggable="true" data-val="${item}">
            <span class="comp-order-handle" aria-hidden="true">⠿</span>
            <span class="comp-order-txt">${item}</span>
            <div class="comp-order-btns">
              <button class="comp-ord-up" type="button" aria-label="للأعلى">▲</button>
              <button class="comp-ord-dn" type="button" aria-label="للأسفل">▼</button>
            </div>
          </li>`).join('')}
      </ul>
      <p class="comp-order-hint">💡 اسحب العناصر أو استخدم الأسهم للترتيب</p>`;
  },

  /** Extract current answer from DOM. Returns null if unanswered. */
  extractAnswer(q) {
    switch (q.type) {
      case 'mcq': case 'multi': case 'tf': {
        const r = document.querySelector(`input[name="q_${q.id}"]:checked`);
        return r ? r.value : null;
      }
      case 'order': {
        const list = document.querySelector(`.comp-order-list[data-q-id="${q.id}"]`);
        if (!list) return null;
        return Array.from(list.querySelectorAll('.comp-order-item')).map(li => li.dataset.val);
      }
      default: return null;
    }
  },

  /** Grade answer. Returns { isCorrect, earnedPoints } */
  grade(q, answer) {
    if (answer === null || answer === undefined) return { isCorrect: false, earnedPoints: 0 };
    const pts = q.points || 1;
    switch (q.type) {
      case 'mcq': case 'multi': case 'tf': {
        const correct = (q.metadata?.correct_answer || '').trim();
        const ok = String(answer).trim() === correct;
        return { isCorrect: ok, earnedPoints: ok ? pts : 0 };
      }
      case 'order': {
        const correctOrder = q.metadata?.correct_order || [];
        if (!Array.isArray(answer) || answer.length !== correctOrder.length) return { isCorrect: false, earnedPoints: 0 };
        const ok = answer.every((v, i) => v === correctOrder[i]);
        return { isCorrect: ok, earnedPoints: ok ? pts : 0 };
      }
      default: return { isCorrect: false, earnedPoints: 0 };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// AttemptService — Supabase persistence
// ─────────────────────────────────────────────────────────────
const AttemptService = {

  async create(studentId, competitionId) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('competition_attempts')
        .insert({ student_id: studentId, competition_id: competitionId, status: 'started', total_score: 0 })
        .select('id').single();
      if (error) throw error;
      return data.id;
    } catch (e) {
      console.error('AttemptService.create:', e);
      return null;
    }
  },

  async submit(attemptId, answers, totalScore) {
    if (!supabase || !attemptId) return false;
    try {
      const rows = answers.map(a => ({
        attempt_id: attemptId,
        question_id: a.questionId,
        answer_data: { answer: a.studentAnswer },
        score: a.earnedPoints
      }));
      if (rows.length > 0) {
        const { error: ae } = await supabase.from('attempt_answers')
          .upsert(rows, { onConflict: 'attempt_id, question_id' });
        if (ae) throw ae;
      }
      const { error: te } = await supabase.from('competition_attempts')
        .update({ status: 'submitted', total_score: totalScore, submitted_at: new Date().toISOString() })
        .eq('id', attemptId);
      if (te) throw te;
      return true;
    } catch (e) {
      console.error('AttemptService.submit:', e);
      return false;
    }
  },

  async getPrevious(studentId, competitionId) {
    if (!supabase || !studentId) return null;
    try {
      const { data, error } = await supabase
        .from('competition_attempts')
        .select('id, status, total_score, submitted_at')
        .eq('student_id', studentId)
        .eq('competition_id', competitionId)
        .order('started_at', { ascending: false })
        .limit(1).maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('AttemptService.getPrevious:', e);
      return null;
    }
  }
};

// ─────────────────────────────────────────────────────────────
// QuizEngine — question-by-question flow
// ─────────────────────────────────────────────────────────────
class QuizEngine {
  constructor(competition, questions, user, container) {
    this.competition = competition;
    this.questions   = questions;
    this.user        = user;
    this.container   = container;
    this.currentIdx  = 0;
    this.answers     = {};   // { [questionId]: answer }
    this.attemptId   = null;
    this._onFinish   = null;
  }

  onFinish(cb) { this._onFinish = cb; return this; }

  async start() {
    if (this.user) this.attemptId = await AttemptService.create(this.user.id, this.competition.id);
    this.renderQ(0);
  }

  // Dynamic progress bar — milestone labels adapt to question count
  _progressBar(current, total) {
    const milestones = QuizEngine._milestones(total);
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;

    const dotsHtml = milestones.map((n, i) => {
      const idx = n - 1;
      const cls = idx < current ? 'qpb-dot qpb-done' : idx === current ? 'qpb-dot qpb-cur' : 'qpb-dot qpb-fut';
      const sep = i < milestones.length - 1 ? '<span class="qpb-line"></span>' : '';
      return `<span class="${cls}" title="السؤال ${n}">${n}</span>${sep}`;
    }).join('');

    return `
      <div class="comp-pb" aria-label="التقدم في المسابقة">
        <div class="qpb-track">
          <div class="qpb-fill" style="width:${pct}%"></div>
          <div class="qpb-dots">${dotsHtml}</div>
        </div>
        <div class="qpb-meta">
          <span>${current} / ${total}</span>
          <span>${total - current} متبقية</span>
        </div>
      </div>`;
  }

  static _milestones(total) {
    if (total <= 1) return [1];
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    const pts = new Set([1, total]);
    const step = Math.ceil(total / 5);
    for (let i = step; i < total; i += step) pts.add(i);
    return Array.from(pts).sort((a, b) => a - b);
  }

  renderQ(idx) {
    this.currentIdx = idx;
    const q = this.questions[idx];
    const isLast = idx === this.questions.length - 1;

    this.container.innerHTML = `
      <div class="comp-quiz-view">
        ${this._progressBar(idx, this.questions.length)}
        ${QuestionRenderer.render(q, idx, this.questions.length)}
        <div class="comp-nav-row">
          ${idx > 0 ? '<button id="cprev" class="btn btn-outline">← السابق</button>' : '<span></span>'}
          <button id="cnext" class="btn btn-primary">
            ${isLast ? 'إنهاء المسابقة ✓' : 'التالي ←'}
          </button>
        </div>
      </div>`;

    this._restoreAnswer(q);
    this._attachHandlers(q);

    document.getElementById('cnext')?.addEventListener('click', () => this._next(q, isLast));
    document.getElementById('cprev')?.addEventListener('click', () => this.renderQ(idx - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _next(q, isLast) {
    const answer = QuestionRenderer.extractAnswer(q);
    if (answer === null) {
      const card = document.getElementById(`comp-q-${q.id}`);
      card?.classList.add('comp-q-shake');
      setTimeout(() => card?.classList.remove('comp-q-shake'), 600);
      Toast.error('يرجى الإجابة على السؤال قبل المتابعة.');
      return;
    }
    this.answers[q.id] = answer;
    isLast ? this._finish() : this.renderQ(this.currentIdx + 1);
  }

  _restoreAnswer(q) {
    const saved = this.answers[q.id];
    if (!saved) return;
    if (['mcq', 'multi', 'tf'].includes(q.type)) {
      const r = document.querySelector(`input[name="q_${q.id}"][value="${saved}"]`);
      if (r) { r.checked = true; r.closest('.comp-opt,.comp-tf-opt')?.classList.add('comp-opt-sel'); }
    }
    if (q.type === 'order' && Array.isArray(saved)) {
      const list = document.querySelector(`.comp-order-list[data-q-id="${q.id}"]`);
      if (list) {
        const map = {};
        list.querySelectorAll('.comp-order-item').forEach(li => { map[li.dataset.val] = li; });
        saved.forEach(v => list.appendChild(map[v]));
      }
    }
  }

  _attachHandlers(q) {
    this.container.querySelectorAll(`input[name="q_${q.id}"]`).forEach(r => {
      r.addEventListener('change', () => {
        document.getElementById(`comp-q-${q.id}`)
          ?.querySelectorAll('.comp-opt,.comp-tf-opt')
          .forEach(l => l.classList.remove('comp-opt-sel'));
        r.closest('.comp-opt,.comp-tf-opt')?.classList.add('comp-opt-sel');
        this.answers[q.id] = r.value;
      });
    });
    if (q.type === 'order') this._initOrderDrag(q.id);
  }

  _initOrderDrag(qId) {
    const list = document.querySelector(`.comp-order-list[data-q-id="${qId}"]`);
    if (!list) return;

    // Arrow buttons
    list.addEventListener('click', e => {
      const item = e.target.closest('.comp-order-item');
      if (!item) return;
      if (e.target.closest('.comp-ord-up')) { const p = item.previousElementSibling; if (p) list.insertBefore(item, p); }
      if (e.target.closest('.comp-ord-dn')) { const n = item.nextElementSibling; if (n) list.insertBefore(n, item); }
    });

    // Drag-and-drop
    let dragged = null;
    list.querySelectorAll('.comp-order-item').forEach(item => {
      item.addEventListener('dragstart', () => { dragged = item; setTimeout(() => item.classList.add('comp-dragging'), 0); });
      item.addEventListener('dragend',   () => {
        dragged = null;
        item.classList.remove('comp-dragging');
        list.querySelectorAll('.comp-order-item').forEach(i => i.classList.remove('comp-drag-over'));
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragged || dragged === item) return;
        item.classList.add('comp-drag-over');
        const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
        list.insertBefore(dragged, e.clientY < mid ? item : item.nextSibling);
      });
      item.addEventListener('dragleave', () => item.classList.remove('comp-drag-over'));
    });
  }

  async _finish() {
    this.container.innerHTML = `
      <div class="comp-submitting">
        <div class="comp-sub-icon">⏳</div>
        <p>جاري حفظ إجاباتك...</p>
      </div>`;

    let totalScore = 0, totalPoints = 0, correctCount = 0;
    const graded = [];

    this.questions.forEach(q => {
      const pts = q.points || 1;
      totalPoints += pts;
      const ans = this.answers[q.id] ?? null;
      const { isCorrect, earnedPoints } = QuestionRenderer.grade(q, ans);
      if (isCorrect) correctCount++;
      totalScore += earnedPoints;
      graded.push({ questionId: q.id, studentAnswer: ans, earnedPoints, isCorrect });
    });

    let saved = false;
    if (this.user) saved = await AttemptService.submit(this.attemptId, graded, totalScore);

    this._onFinish?.({ correctCount, totalQuestions: this.questions.length, totalScore, totalPoints, saved });
  }
}

// ─────────────────────────────────────────────────────────────
// CompetitionController — main orchestrator
// ─────────────────────────────────────────────────────────────
class CompetitionController {
  constructor() {
    this.user         = null;
    this.competitions = [];  // null = error state
    this.container    = null;
  }

  async init(containerId = 'competition-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this._loading('جاري تحميل المسابقات...');
    const { session } = await authService.getSessionAsync();
    this.user = session?.user || null;
    await this._loadAll();
    this.renderList();
  }

  // ── Data ─────────────────────────────────────────────────
  async _loadAll() {
    if (!supabase) { this.competitions = []; return; }
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, title, description, image_url, start_date, end_date, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      this.competitions = (data || []).map(c => ({ ...c, _status: deriveStatus(c) }));
    } catch (e) {
      console.error('Competitions load error:', e);
      this.competitions = null;
    }
  }

  async _loadQuestions(competitionId) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('competition_questions')
        .select('order_num, questions(id, type, text, image_url, points, metadata)')
        .eq('competition_id', competitionId)
        .order('order_num', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => r.questions).filter(Boolean);
    } catch (e) {
      console.error('Questions load error:', e);
      return [];
    }
  }

  // ── Loading ───────────────────────────────────────────────
  _loading(msg = 'جاري التحميل...') {
    this.container.innerHTML = `
      <div class="comp-loading">
        <div class="comp-load-icon">🏆</div>
        <div class="comp-load-dots"><span></span><span></span><span></span></div>
        <p>${msg}</p>
      </div>`;
  }

  // ── List View ─────────────────────────────────────────────
  renderList() {
    if (this.competitions === null) {
      this.container.innerHTML = `
        <div class="comp-err-state">
          <div class="comp-err-icon">⚠️</div>
          <h3>تعذّر تحميل المسابقات</h3>
          <p>تحقق من اتصالك وأعد المحاولة.</p>
          <button class="btn btn-outline" id="comp-retry-btn">إعادة المحاولة</button>
        </div>`;
      document.getElementById('comp-retry-btn')?.addEventListener('click', async () => {
        this._loading(); await this._loadAll(); this.renderList();
      });
      return;
    }

    const active   = this.competitions.filter(c => c._status === 'active' || c._status === 'open');
    const upcoming = this.competitions.filter(c => c._status === 'upcoming');
    const ended    = this.competitions.filter(c => c._status === 'ended');

    let html = `
      <div class="comp-hero">
        <div class="comp-hero-label">التحديات التنافسية</div>
        <h1 class="comp-hero-title">مسابقة السراج</h1>
        <p class="comp-hero-desc">مسابقات دورية ومتنوعة لاختبار معرفتك وإثارة روح التنافس الشريف.</p>
        ${!this.user ? `
          <div class="comp-login-nudge">
            💡 <a href="login.html">سجّل الدخول</a> للمشاركة وحفظ نتائجك.
          </div>` : ''}
      </div>`;

    if (this.competitions.length === 0) {
      html += `
        <div class="comp-empty-state">
          <div class="comp-empty-icon">🏆</div>
          <h3>لا توجد مسابقات حاليًا</h3>
          <p>ترقّب — المسابقات القادمة ستُعلَن هنا قريبًا.</p>
        </div>`;
    } else {
      if (active.length)   html += this._section('مسابقات جارية',  '#22c55e', active);
      if (upcoming.length) html += this._section('مسابقات قادمة', 'var(--color-gold)', upcoming);
      if (ended.length)    html += this._section('مسابقات منتهية', 'var(--color-text-muted)', ended);
    }

    this.container.innerHTML = html;
    this.container.querySelectorAll('[data-cid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const comp = this.competitions.find(c => c.id === btn.dataset.cid);
        if (comp) this.renderDetail(comp);
      });
    });
  }

  _section(label, dotColor, items) {
    return `
      <section class="comp-section">
        <h2 class="comp-section-h">
          <span class="comp-sdot" style="background:${dotColor}"></span>${label}
        </h2>
        <div class="comp-grid">${items.map(c => this._card(c)).join('')}</div>
      </section>`;
  }

  _card(c) {
    const status = c._status;
    const canJoin = status === 'active' || status === 'open';

    const imgHtml = c.image_url ? `
      <div class="comp-card-img-wrap">
        <img src="${c.image_url}" alt="${c.title}" class="comp-card-img"
             onerror="this.parentElement.classList.add('comp-card-img-fb')">
        <div class="comp-card-img-fb-icon" aria-hidden="true">🏆</div>
      </div>` : `
      <div class="comp-card-img-wrap comp-card-img-fb">
        <div class="comp-card-img-fb-icon" aria-hidden="true">🏆</div>
      </div>`;

    const badgeMap = { active: ['جارية','comp-badge-act'], open: ['مفتوحة','comp-badge-act'], upcoming: ['قادمة','comp-badge-up'], ended: ['منتهية','comp-badge-end'] };
    const [badgeText, badgeCls] = badgeMap[status] || ['', ''];

    const dates = [
      c.start_date ? `<span>البداية: ${fmtDate(c.start_date)}</span>` : '',
      c.end_date   ? `<span>النهاية: ${fmtDate(c.end_date)}</span>`   : ''
    ].filter(Boolean).join('');

    const btn = canJoin
      ? `<button class="btn btn-primary comp-card-cta" data-cid="${c.id}">شارك الآن ←</button>`
      : status === 'upcoming'
      ? `<button class="btn btn-outline comp-card-cta" disabled>قادمة قريبًا</button>`
      : `<button class="btn comp-card-cta comp-btn-ended" data-cid="${c.id}">عرض التفاصيل</button>`;

    return `
      <div class="comp-card comp-card-${status}">
        ${imgHtml}
        <div class="comp-card-body">
          <div class="comp-card-top">
            <span class="comp-badge ${badgeCls}">${badgeText}</span>
            ${dates ? `<div class="comp-card-dates">${dates}</div>` : ''}
          </div>
          <h3 class="comp-card-title">${c.title}</h3>
          ${c.description ? `<p class="comp-card-desc">${c.description}</p>` : ''}
          <div class="comp-card-foot">${btn}</div>
        </div>
      </div>`;
  }

  // ── Detail View ───────────────────────────────────────────
  async renderDetail(comp) {
    this._loading('جاري تحميل المسابقة...');
    const [questions, prevAttempt] = await Promise.all([
      this._loadQuestions(comp.id),
      this.user ? AttemptService.getPrevious(this.user.id, comp.id) : Promise.resolve(null)
    ]);

    const canJoin  = comp._status === 'active' || comp._status === 'open';
    const hasEnded = comp._status === 'ended';

    const imgHtml = comp.image_url ? `
      <div class="comp-det-img-wrap">
        <img src="${comp.image_url}" alt="${comp.title}" class="comp-det-img"
             onerror="this.parentElement.classList.add('comp-det-img-fb')">
        <div class="comp-det-img-fb-icon" aria-hidden="true">🏆</div>
      </div>` : `
      <div class="comp-det-img-wrap comp-det-img-fb">
        <div class="comp-det-img-fb-icon" aria-hidden="true">🏆</div>
      </div>`;

    const prevHtml = prevAttempt ? `
      <div class="comp-prev-att">
        <span>📋</span>
        <div>
          <strong>محاولة سابقة</strong>
          <span>الدرجة: ${prevAttempt.total_score}</span>
          ${prevAttempt.submitted_at ? `<span>· ${fmtDate(prevAttempt.submitted_at)}</span>` : ''}
        </div>
      </div>` : '';

    let actionBtn = '';
    if (!this.user) {
      actionBtn = `<a href="login.html" class="btn btn-primary">سجّل الدخول للمشاركة</a>`;
    } else if (canJoin && questions.length > 0) {
      actionBtn = `<button id="btn-start" class="btn btn-primary">${prevAttempt ? '🔄 إعادة المحاولة' : '🚀 ابدأ المسابقة'}</button>`;
    } else if (canJoin && questions.length === 0) {
      actionBtn = `<span class="comp-no-q-msg">لم تُضف أسئلة لهذه المسابقة بعد.</span>`;
    } else if (hasEnded) {
      actionBtn = `<span class="comp-state-label">انتهت المسابقة</span>`;
    } else {
      actionBtn = `<span class="comp-state-label">ستبدأ المسابقة قريبًا</span>`;
    }

    this.container.innerHTML = `
      <div class="comp-detail">
        <button id="btn-back" class="comp-back-btn"><span class="comp-back-arr">→</span> المسابقات</button>
        ${imgHtml}
        <div class="comp-det-body">
          <h2 class="comp-det-title">${comp.title}</h2>
          ${comp.description ? `<p class="comp-det-desc">${comp.description}</p>` : ''}
          <div class="comp-det-facts">
            ${questions.length > 0 ? `<div class="comp-fact">📝 <strong>${questions.length}</strong> سؤال</div>` : ''}
            ${comp.start_date ? `<div class="comp-fact">📅 تبدأ ${fmtDate(comp.start_date)}</div>` : ''}
            ${comp.end_date   ? `<div class="comp-fact">⏳ تنتهي ${fmtDate(comp.end_date)}</div>`   : ''}
          </div>
          ${prevHtml}
          <div class="comp-det-actions">
            <button id="btn-back2" class="btn btn-outline">← المسابقات</button>
            ${actionBtn}
          </div>
        </div>
      </div>`;

    const back = () => this.renderList();
    document.getElementById('btn-back')?.addEventListener('click', back);
    document.getElementById('btn-back2')?.addEventListener('click', back);
    document.getElementById('btn-start')?.addEventListener('click', () => this._startQuiz(comp, questions));
  }

  // ── Quiz ──────────────────────────────────────────────────
  _startQuiz(comp, questions) {
    this.container.innerHTML = '<div id="cqinner"></div>';
    const inner = document.getElementById('cqinner');
    new QuizEngine(comp, questions, this.user, inner)
      .onFinish(result => this._renderResult(comp, result))
      .start();
  }

  // ── Result View ───────────────────────────────────────────
  _renderResult(comp, { correctCount, totalQuestions, totalScore, totalPoints, saved }) {
    const pct = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 60 ? '⭐⭐' : '⭐';
    const badge = pct >= 90
      ? { e: '🏆', t: 'إنجاز ممتاز!',     s: 'أجبت على معظم الأسئلة بشكل صحيح.' }
      : pct >= 60
      ? { e: '🌟', t: 'أحسنت!',           s: 'نتيجة جيدة — واصل التدريب لتحقيق الأفضل.' }
      : { e: '💪', t: 'لا بأس!',          s: 'كل محاولة تعلّمك شيئًا جديدًا.' };

    const C = 2 * Math.PI * 42;

    const confetti = Array.from({ length: 14 }, (_, i) =>
      `<div class="comp-conf-p" style="--ci:${i}"></div>`).join('');

    const savedNote = saved
      ? `<p class="comp-res-saved">✅ تم حفظ نتيجتك</p>`
      : this.user
      ? `<p class="comp-res-warn">⚠️ لم يتم الحفظ بسبب خطأ في الاتصال</p>`
      : `<p class="comp-res-warn">💡 <a href="login.html">سجّل الدخول</a> لحفظ نتائجك</p>`;

    this.container.innerHTML = `
      <div class="comp-result">
        <div class="comp-conf-wrap" aria-hidden="true">${confetti}</div>
        <div class="comp-res-card">
          <div class="comp-res-comp-name">${comp.title}</div>
          <div class="comp-res-stars">${stars}</div>
          <div class="comp-res-emoji">${badge.e}</div>
          <h2 class="comp-res-title">${badge.t}</h2>
          <p class="comp-res-sub">${badge.s}</p>
          <div class="comp-ring-wrap">
            <svg class="comp-ring-svg" viewBox="0 0 100 100" role="presentation">
              <circle class="comp-ring-bg" cx="50" cy="50" r="42"/>
              <circle class="comp-ring-fg" cx="50" cy="50" r="42"
                stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
            </svg>
            <div class="comp-ring-label">
              <strong>${pct}%</strong><span>${totalScore}/${totalPoints}</span>
            </div>
          </div>
          <div class="comp-res-stats">
            <div class="comp-res-stat"><strong>${correctCount}</strong><span>صحيحة</span></div>
            <div class="comp-res-div"></div>
            <div class="comp-res-stat"><strong>${totalQuestions - correctCount}</strong><span>خاطئة</span></div>
            <div class="comp-res-div"></div>
            <div class="comp-res-stat"><strong>${totalQuestions}</strong><span>المجموع</span></div>
          </div>
          ${savedNote}
          <div class="comp-res-actions">
            <button id="btn-comps" class="btn btn-outline">المسابقات</button>
            <button id="btn-retry" class="btn btn-primary">🔄 إعادة المحاولة</button>
          </div>
        </div>
      </div>`;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('btn-comps')?.addEventListener('click', () => this.renderList());
    document.getElementById('btn-retry')?.addEventListener('click', () => this.renderDetail(comp));
  }
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────
export const competitionController = new CompetitionController();
window.competitionController = competitionController;

document.addEventListener('DOMContentLoaded', () => {
  competitionController.init('competition-container');
});
