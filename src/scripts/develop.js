/**
 * Develop Yourself — Sequential Reading Challenges System (v2)
 * سراج – مدرسة أبو عبيدة
 * ─────────────────────────────────────────────────────────────
 * UX Improvements (v2):
 * • Hero section with mission statement
 * • Visual journey map (step dots)
 * • Prominent current-level card (spotlight effect)
 * • Locked levels feel like "coming soon" not "forbidden"
 * • Reading optimized: max-width 680px, 1.95 line-height, generous padding
 * • Per-question feedback after submission (correct/incorrect revealed)
 * • Best-score logic: only saves if new score >= old score
 * • Animated confetti-like result screen
 * • Smooth card entrance stagger
 * • Progress persists across sessions (Supabase + localStorage fallback)
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

// ─── Fallback data matching Supabase schema exactly ───────────
const DEFAULT_CHALLENGE = {
  id: 'c1000000-0000-0000-0000-000000000001',
  title: 'برنامج القراءة المتدرج – إشراقات عُمانية',
  description: 'رحلة معرفية متدرجة عبر تاريخ عُمان وحضارتها؛ اقرأ، استوعب، وأثبت فهمك.',
  challenge_levels: [
    {
      id: 'l1000000-0000-0000-0000-000000000001',
      level_number: 1,
      title: 'القلاع والحصون في سلطنة عُمان',
      paragraph: `تُعدّ القلاع والحصون في سلطنة عُمان شواهد حيّة على عبقرية العمارة الدفاعية وتاريخ البلاد العريق. شُيّدت هذه الحصون عبر القرون لتكون مراكز إدارية وعسكرية متكاملة لحماية المدن والواحات السكنية من الغزاة. وقد تميّزت بقدرتها الفائقة على التكيّف مع التضاريس الجبلية والساحلية الشاهقة، إذ احتوت على منظومات دفاعية متطورة تشمل الأبراج الدائرية المتعددة المستويات، والممرات السرية المتشعّبة، وآبار المياه العذبة المحفورة في باطن الصخر، إضافة إلى مخازن المؤن الضخمة التي كانت تكفي الحاميات لأشهر طويلة من الحصار.`,
      challenge_questions: [
        {
          order_num: 1,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000001',
            type: 'mcq',
            text: 'ما هو الدور الرئيسي الذي شُيّدت من أجله القلاع والحصون في عُمان تاريخياً؟',
            points: 1,
            metadata: {
              options: [
                'مراكز إدارية وعسكرية لحماية المدن والواحات',
                'مستودعات تجارية مخصصة للبضائع المستوردة',
                'موانئ بحرية لاستقبال السفن التجارية',
                'أسواق شعبية موسمية للمزارعين'
              ],
              correct_answer: 'مراكز إدارية وعسكرية لحماية المدن والواحات'
            }
          }
        },
        {
          order_num: 2,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000002',
            type: 'tf',
            text: 'تميّزت القلاع والحصون العمانية بتكيّفها مع التضاريس الطبيعية المحيطة بها.',
            points: 1,
            metadata: { options: ['صح', 'خطأ'], correct_answer: 'صح' }
          }
        },
        {
          order_num: 3,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000003',
            type: 'mcq',
            text: 'ما الذي ساعد قلاع عُمان على الصمود لفترات طويلة أثناء الحصار؟',
            points: 1,
            metadata: {
              options: [
                'آبار المياه العذبة ومخازن المؤن داخلها',
                'مدرجات خشبية مؤقتة خارج الأسوار',
                'أبواب زجاجية للإنارة الطبيعية',
                'أسقف مفتوحة غير مسقوفة'
              ],
              correct_answer: 'آبار المياه العذبة ومخازن المؤن داخلها'
            }
          }
        }
      ]
    },
    {
      id: 'l1000000-0000-0000-0000-000000000002',
      level_number: 2,
      title: 'نظام الأفلاج العُماني وهندسة الري',
      paragraph: `يمثّل نظام الأفلاج في سلطنة عُمان واحداً من أقدم وأعظم أنظمة هندسة الري التقليدية في العالم، إذ يعود تاريخه إلى ما قبل آلاف السنين. يعتمد الفلج على شقّ قنوات مائية دقيقة الانحدار تُجلب عبرها المياه الجوفية من منابعها في أعماق الجبال لتصل بشكل طبيعي دون ضخّ إلى المزارع والأحياء السكنية، حيث تُوزَّع بعدالة متناهية بين المزارعين وفق أعراف وقوانين موروثة أتقنها الأجداد. وقد أدرجت منظمة اليونسكو للعلوم والثقافة خمسة أفلاج عمانية رئيسية في قائمة التراث العالمي الإنساني اعترافاً بقيمتها البيئية والهندسية والاجتماعية الفريدة.`,
      challenge_questions: [
        {
          order_num: 1,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000004',
            type: 'mcq',
            text: 'كم عدد الأفلاج العمانية المدرجة في قائمة التراث العالمي لليونسكو؟',
            points: 1,
            metadata: {
              options: ['خمسة أفلاج', 'عشرة أفلاج', 'فلجان اثنان', 'ثمانية أفلاج'],
              correct_answer: 'خمسة أفلاج'
            }
          }
        },
        {
          order_num: 2,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000005',
            type: 'tf',
            text: 'يعتمد نظام الأفلاج على قنوات مائية طبيعية الانحدار لجلب المياه دون الحاجة إلى مضخات ميكانيكية.',
            points: 1,
            metadata: { options: ['صح', 'خطأ'], correct_answer: 'صح' }
          }
        },
        {
          order_num: 3,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000006',
            type: 'mcq',
            text: 'تُجسّد قوانين إدارة الأفلاج التقليدية في عُمان قيمة اجتماعية عليا تتمثّل في:',
            points: 1,
            metadata: {
              options: [
                'العدالة في توزيع المياه واستدامة الموارد',
                'التنافس الفردي غير المنظّم بين المزارعين',
                'حصر المياه للأغراض التجارية الخاصة',
                'الهدر المائي الموسمي المقصود'
              ],
              correct_answer: 'العدالة في توزيع المياه واستدامة الموارد'
            }
          }
        }
      ]
    },
    {
      id: 'l1000000-0000-0000-0000-000000000003',
      level_number: 3,
      title: 'رواد العلوم واللغة من أرض عُمان',
      paragraph: `أنجبت سلطنة عُمان عبر تاريخها الطويل نخبة من العلماء الأفذاذ الذين تركوا بصمات راسخة في صرح الحضارة العربية والإسلامية. ومن أبرز هؤلاء الإمام الخليل بن أحمد الفراهيدي البصري العُماني الأصل، الذي وضع أول معجم منهجي شامل للغة العربية وهو "كتاب العين"، وابتكر في الوقت ذاته علم العروض الذي ضبط موازين الشعر العربي لقرون متعاقبة. وكذلك العلامة اللغوي المبدع ابن دريد الأزدي العُماني صاحب معجم "جمهرة اللغة" الموسوعي. فضلاً عن الطبيب والعالم راشد بن عميرة الرستاقي الذي رسّخ معرفة الطب والجراحة التقليدية في المنطقة.`,
      challenge_questions: [
        {
          order_num: 1,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000007',
            type: 'mcq',
            text: 'من هو العالم العماني مؤلف أول معجم للغة العربية ومبتكر علم العروض الشعري؟',
            points: 1,
            metadata: {
              options: ['الخليل بن أحمد الفراهيدي', 'ابن بطوطة', 'الجاحظ', 'أحمد بن ماجد'],
              correct_answer: 'الخليل بن أحمد الفراهيدي'
            }
          }
        },
        {
          order_num: 2,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000008',
            type: 'tf',
            text: 'ابن دريد الأزدي العُماني هو مؤلف المعجم اللغوي الموسوعي المعروف بـ"جمهرة اللغة".',
            points: 1,
            metadata: { options: ['صح', 'خطأ'], correct_answer: 'صح' }
          }
        }
      ]
    },
    {
      id: 'l1000000-0000-0000-0000-000000000004',
      level_number: 4,
      title: 'أسد البحار — الملاحة العُمانية',
      paragraph: null,
      challenge_questions: [
        {
          order_num: 1,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000009',
            type: 'mcq',
            text: 'ما اللقب التاريخي الشهير الذي أُطلق على الملاح العماني الكبير أحمد بن ماجد؟',
            points: 1,
            metadata: {
              options: ['أسد البحار', 'سندباد الشرق', 'أمير القوافل', 'ربّان الخليج'],
              correct_answer: 'أسد البحار'
            }
          }
        },
        {
          order_num: 2,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000010',
            type: 'tf',
            text: 'برع أحمد بن ماجد في رسم خرائط المسارات البحرية عبر رصد دقيق لحركة النجوم والفلك.',
            points: 1,
            metadata: { options: ['صح', 'خطأ'], correct_answer: 'صح' }
          }
        }
      ]
    }
  ]
};

// Level icons per topic index (decorative, no semantic meaning in data)
const LEVEL_ICONS = ['🏰', '🌊', '📜', '⚓', '🌙', '🦅', '🕌', '🌿'];

// ─── Application State ─────────────────────────────────────────
class DevelopController {
  constructor() {
    this.user = null;
    this.challenge = null;
    this.levels = [];
    this.progressMap = {};
    this.currentOpenLevelId = null;
    this.selectedAnswers = {};
    this.container = null;
    this._quizResults = null; // store graded results for feedback rendering
  }

  async init(containerId = 'develop-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.renderLoading();

    const { session } = await authService.getSessionAsync();
    this.user = session?.user || null;

    await this.loadChallengesData();
    await this.loadProgressData();

    this.renderLevelsList();
  }

  // ── Data Loading ───────────────────────────────────────────
  async loadChallengesData() {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            id, title, description, image_url, status, created_at,
            challenge_levels (
              id, level_number, title, paragraph, created_at,
              challenge_questions (
                order_num,
                questions ( id, type, text, image_url, points, metadata )
              )
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          this.challenge = data[0];
          this.levels = (this.challenge.challenge_levels || []).sort(
            (a, b) => (a.level_number || 0) - (b.level_number || 0)
          );
          return;
        }
      }
    } catch (err) {
      console.warn('Supabase challenges unavailable, using fallback:', err);
    }

    this.challenge = DEFAULT_CHALLENGE;
    this.levels = DEFAULT_CHALLENGE.challenge_levels;
  }

  async loadProgressData() {
    this.progressMap = {};

    if (this.user && supabase) {
      try {
        const { data, error } = await supabase
          .from('student_progress')
          .select('challenge_level_id, status, score, completed_at')
          .eq('student_id', this.user.id);

        if (!error && data) {
          data.forEach(p => {
            this.progressMap[p.challenge_level_id] = {
              status: p.status,
              score: p.score || 0
            };
          });
          return;
        }
      } catch (err) {
        console.warn('Could not load Supabase progress, using local storage:', err);
      }
    }

    try {
      const stored = localStorage.getItem('siraj_student_progress');
      if (stored) this.progressMap = JSON.parse(stored);
    } catch (e) {
      this.progressMap = {};
    }
  }

  /**
   * Best-score logic: only update if the new score is >= stored score.
   * This rewards improvement without punishing retries.
   */
  async saveLevelProgress(levelId, score) {
    const existing = this.progressMap[levelId];
    const bestScore = existing ? Math.max(existing.score || 0, score) : score;

    this.progressMap[levelId] = { status: 'completed', score: bestScore };

    if (this.user && supabase) {
      try {
        await supabase
          .from('student_progress')
          .upsert({
            student_id: this.user.id,
            challenge_level_id: levelId,
            status: 'completed',
            score: bestScore,
            completed_at: new Date().toISOString()
          }, { onConflict: 'student_id, challenge_level_id' });
      } catch (err) {
        console.error('Failed to save progress to Supabase:', err);
      }
    }

    try {
      localStorage.setItem('siraj_student_progress', JSON.stringify(this.progressMap));
    } catch (e) {}
  }

  // ── Level State Logic ──────────────────────────────────────
  getLevelStatus(index) {
    const level = this.levels[index];
    const progress = this.progressMap[level.id];

    if (progress && progress.status === 'completed') return 'completed';
    if (index === 0) return 'current';

    const prevProgress = this.progressMap[this.levels[index - 1].id];
    if (prevProgress && prevProgress.status === 'completed') return 'current';

    return 'locked';
  }

  // ── Render: Loading Screen ─────────────────────────────────
  renderLoading() {
    this.container.innerHTML = `
      <div class="dev-loading">
        <div class="dev-loading-icon">📖</div>
        <div class="dev-loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>جاري تحميل مسار التعلم...</p>
      </div>
    `;
  }

  // ── Render: Levels Overview ────────────────────────────────
  renderLevelsList() {
    this.currentOpenLevelId = null;
    this.selectedAnswers = {};
    this._quizResults = null;

    let completedCount = 0;
    let currentIndex = -1;

    this.levels.forEach((_, idx) => {
      const s = this.getLevelStatus(idx);
      if (s === 'completed') completedCount++;
      if (s === 'current' && currentIndex === -1) currentIndex = idx;
    });

    const totalCount = this.levels.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isFinished = completedCount === totalCount;

    // ── Journey Dots ──
    const dots = this.levels.map((_, idx) => {
      const s = this.getLevelStatus(idx);
      const cls = s === 'completed' ? 'journey-dot dot-done'
                : s === 'current'   ? 'journey-dot dot-current'
                                    : 'journey-dot dot-locked';
      return `<span class="${cls}" title="المستوى ${idx + 1}"></span>`;
    }).join('<span class="journey-connector"></span>');

    let html = `
      <!-- ── Hero / Intro ── -->
      <div class="dev-hero">
        <div class="dev-hero-text">
          <div class="dev-hero-label">برنامج التطوير المعرفي</div>
          <h1 class="dev-hero-title">طوّر نفسك</h1>
          <p class="dev-hero-desc">${this.challenge.description || 'رحلة قراءة متدرجة تبني معرفتك خطوة بخطوة'}</p>
        </div>

        <!-- Journey Tracker -->
        <div class="dev-journey-card">
          <div class="journey-dots-row">${dots}</div>
          <div class="journey-stats">
            <div class="journey-stat">
              <strong>${completedCount}</strong>
              <span>مكتملة</span>
            </div>
            <div class="journey-stat-divider"></div>
            <div class="journey-stat">
              <strong>${totalCount - completedCount}</strong>
              <span>متبقية</span>
            </div>
            <div class="journey-stat-divider"></div>
            <div class="journey-stat">
              <strong>${progressPercent}%</strong>
              <span>إنجاز</span>
            </div>
          </div>
          <div class="journey-progress-wrap">
            <div class="journey-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          ${isFinished ? `<div class="journey-complete-badge">🏆 أتممت البرنامج كاملاً، أحسنت!</div>` : ''}
        </div>

        ${!this.user ? `
          <div class="dev-guest-notice">
            <span class="dev-guest-icon">💡</span>
            <span>تتصفح كضيف — <a href="login.html">سجّل الدخول</a> لحفظ تقدمك في سجلك المدرسي الدائم.</span>
          </div>
        ` : ''}
      </div>

      <!-- ── Levels List ── -->
      <div class="dev-levels-grid">
    `;

    this.levels.forEach((level, index) => {
      const status = this.getLevelStatus(index);
      const progress = this.progressMap[level.id];
      const questionsCount = (level.challenge_questions || []).length;
      const icon = LEVEL_ICONS[index % LEVEL_ICONS.length];
      const levelScore = progress?.score ?? null;

      if (status === 'completed') {
        html += `
          <div class="dev-level-card dev-level-done" id="level-card-${level.id}" style="--stagger: ${index * 0.07}s">
            <div class="dev-level-done-check">✓</div>
            <div class="dev-level-icon">${icon}</div>
            <div class="dev-level-number">المستوى ${level.level_number}</div>
            <h3 class="dev-level-title">${level.title}</h3>
            <div class="dev-level-meta">
              ${level.paragraph ? '<span>📖 نص قرائي</span>' : '<span>💬 أسئلة مباشرة</span>'}
              <span>📝 ${questionsCount} أسئلة</span>
            </div>
            ${levelScore !== null ? `
              <div class="dev-level-score">
                <span class="dev-score-label">أفضل درجة</span>
                <span class="dev-score-value">${levelScore} / ${questionsCount}</span>
              </div>
            ` : ''}
            <button class="dev-btn-review btn btn-outline btn-level-action" data-level-id="${level.id}">
              مراجعة المرحلة
            </button>
          </div>
        `;
      } else if (status === 'current') {
        html += `
          <div class="dev-level-card dev-level-current" id="level-card-${level.id}" style="--stagger: ${index * 0.07}s">
            <div class="dev-level-pulse-ring"></div>
            <div class="dev-level-icon dev-level-icon-active">${icon}</div>
            <div class="dev-level-current-badge">جاهز للبدء 🔓</div>
            <div class="dev-level-number">المستوى ${level.level_number}</div>
            <h3 class="dev-level-title">${level.title}</h3>
            <div class="dev-level-meta">
              ${level.paragraph ? '<span>📖 نص قرائي</span>' : '<span>💬 أسئلة مباشرة</span>'}
              <span>📝 ${questionsCount} أسئلة</span>
            </div>
            <button class="btn btn-primary dev-btn-start btn-level-action" data-level-id="${level.id}">
              ابدأ المرحلة ←
            </button>
          </div>
        `;
      } else {
        // Locked — show curiosity, not rejection
        html += `
          <div class="dev-level-card dev-level-locked" id="level-card-${level.id}" style="--stagger: ${index * 0.07}s">
            <div class="dev-level-icon dev-level-icon-locked">${icon}</div>
            <div class="dev-level-locked-badge">🔒</div>
            <div class="dev-level-number">المستوى ${level.level_number}</div>
            <h3 class="dev-level-title dev-level-title-blurred">${level.title}</h3>
            <div class="dev-level-lock-hint">أكمل المرحلة السابقة لتفتح هذه المرحلة</div>
            <button class="btn dev-btn-locked btn-level-action" data-level-id="${level.id}" disabled>
              في انتظارك...
            </button>
          </div>
        `;
      }
    });

    html += `</div>`;
    this.container.innerHTML = html;

    // Animate cards in
    requestAnimationFrame(() => {
      this.container.querySelectorAll('.dev-level-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.07}s`;
        card.classList.add('dev-card-animate');
      });
    });

    // Event listeners
    this.container.querySelectorAll('.btn-level-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const levelId = btn.getAttribute('data-level-id');
        this.handleOpenLevel(levelId);
      });
    });
  }

  // ── Security Gate ──────────────────────────────────────────
  handleOpenLevel(levelId) {
    const levelIndex = this.levels.findIndex(l => l.id === levelId);
    if (levelIndex === -1) return;

    if (this.getLevelStatus(levelIndex) === 'locked') {
      Toast.error('🔒 أكمل المرحلة السابقة أولاً لفتح هذه المرحلة.');
      return;
    }

    this.renderLevelDetail(this.levels[levelIndex]);
  }

  // ── Render: Level Detail (Reading + Quiz) ─────────────────
  renderLevelDetail(level) {
    this.currentOpenLevelId = level.id;
    this.selectedAnswers = {};
    this._quizResults = null;

    const questions = (level.challenge_questions || [])
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
      .map(cq => cq.questions)
      .filter(Boolean);

    const levelIndex = this.levels.findIndex(l => l.id === level.id);
    const icon = LEVEL_ICONS[levelIndex % LEVEL_ICONS.length];
    const existingProgress = this.progressMap[level.id];

    let html = `
      <div class="dev-detail-view">
        <!-- Breadcrumb Nav -->
        <nav class="dev-breadcrumb">
          <button id="btn-back-to-list" class="dev-back-btn">
            <span class="dev-back-arrow">→</span>
            <span>العودة إلى المراحل</span>
          </button>
          <span class="dev-breadcrumb-sep">/</span>
          <span class="dev-breadcrumb-current">المستوى ${level.level_number}</span>
        </nav>

        <!-- Level Header -->
        <div class="dev-level-header">
          <div class="dev-level-header-icon">${icon}</div>
          <div class="dev-level-header-info">
            <div class="dev-level-header-label">المستوى ${level.level_number} من ${this.levels.length}</div>
            <h2 class="dev-level-header-title">${level.title}</h2>
            <div class="dev-level-header-meta">
              <span>${questions.length} أسئلة</span>
              ${existingProgress ? `<span>· أفضل درجة سابقة: <strong>${existingProgress.score} / ${questions.length}</strong></span>` : ''}
            </div>
          </div>
        </div>
    `;

    // ── Reading Passage ────────────────────────────────────
    if (level.paragraph && level.paragraph.trim().length > 0) {
      html += `
        <section class="dev-reading-section">
          <div class="dev-reading-header">
            <span class="dev-reading-icon">📖</span>
            <h3 class="dev-reading-title">نص القراءة</h3>
          </div>
          <div class="dev-reading-body">
            <div class="dev-reading-content">
              ${level.paragraph.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
            </div>
          </div>
          <div class="dev-reading-footer">
            <span>✅ اقرأ النص جيداً قبل الانتقال إلى الأسئلة أدناه</span>
          </div>
        </section>
      `;
    }

    // ── Questions Section ──────────────────────────────────
    html += `
      <section class="dev-quiz-section">
        <div class="dev-quiz-header">
          <span class="dev-reading-icon">📝</span>
          <h3 class="dev-reading-title">أسئلة الفهم والاستيعاب</h3>
          <span class="dev-quiz-count">${questions.length} أسئلة</span>
        </div>

        <form id="quiz-form" class="dev-quiz-form" novalidate>
    `;

    questions.forEach((q, qIdx) => {
      const options = q.metadata?.options || [];

      html += `
        <div class="dev-question-card" id="q-card-${q.id}">
          <div class="dev-question-header">
            <span class="dev-question-num">${qIdx + 1}</span>
            <p class="dev-question-text">${q.text}</p>
          </div>
          <div class="dev-options-list" role="radiogroup" aria-label="خيارات السؤال ${qIdx + 1}">
      `;

      options.forEach((optText, optIdx) => {
        const inputId = `q_${q.id}_opt_${optIdx}`;
        html += `
          <label class="dev-option" for="${inputId}" id="opt-label-${q.id}-${optIdx}">
            <input type="radio" id="${inputId}" name="q_${q.id}" value="${optText}" data-q-id="${q.id}">
            <span class="dev-option-indicator"></span>
            <span class="dev-option-text">${optText}</span>
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
          <div class="dev-submit-row">
            <div class="dev-submit-hint" id="submit-hint"></div>
            <button type="submit" id="btn-submit-quiz" class="btn btn-primary dev-btn-submit">
              <span>تسليم الإجابات</span>
              <span class="dev-submit-arrow">←</span>
            </button>
          </div>
        </form>
      </section>
    </div>
    `;

    this.container.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Back button
    document.getElementById('btn-back-to-list').addEventListener('click', () => {
      this.renderLevelsList();
    });

    // Radio change handlers
    this.container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const qId = radio.getAttribute('data-q-id');
        this.selectedAnswers[qId] = radio.value;

        // Update visual selection within the question card
        const card = document.getElementById(`q-card-${qId}`);
        card.querySelectorAll('.dev-option').forEach(lbl => lbl.classList.remove('dev-option-selected'));
        radio.closest('.dev-option').classList.add('dev-option-selected');

        // Clear error highlight
        card.classList.remove('dev-question-unanswered');

        // Update submit hint
        this.updateSubmitHint(questions);
      });
    });

    // Form submit
    document.getElementById('quiz-form').addEventListener('submit', e => {
      e.preventDefault();
      this.handleQuizSubmit(level, questions);
    });
  }

  updateSubmitHint(questions) {
    const answeredCount = Object.keys(this.selectedAnswers).length;
    const total = questions.length;
    const hint = document.getElementById('submit-hint');
    if (!hint) return;

    if (answeredCount === total) {
      hint.textContent = '✅ جميع الأسئلة تمت الإجابة عليها — يمكنك التسليم';
      hint.className = 'dev-submit-hint dev-hint-ready';
    } else {
      hint.textContent = `${answeredCount} من ${total} أسئلة تمت الإجابة عليها`;
      hint.className = 'dev-submit-hint dev-hint-pending';
    }
  }

  // ── Quiz Grading ───────────────────────────────────────────
  handleQuizSubmit(level, questions) {
    const unanswered = questions.filter(q => !this.selectedAnswers[q.id]);

    if (unanswered.length > 0) {
      // Shake and highlight unanswered
      unanswered.forEach(q => {
        const card = document.getElementById(`q-card-${q.id}`);
        if (card) {
          card.classList.add('dev-question-unanswered');
          setTimeout(() => card.classList.remove('dev-question-unanswered'), 600);
        }
      });
      Toast.error(`${unanswered.length} سؤال لم تُجب عليه بعد.`);

      // Scroll to first unanswered
      const firstCard = document.getElementById(`q-card-${unanswered[0].id}`);
      if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Grade
    let earnedScore = 0;
    let totalScore = 0;
    const results = [];

    questions.forEach(q => {
      const pts = q.points || 1;
      totalScore += pts;
      const studentAnswer = (this.selectedAnswers[q.id] || '').trim();
      const correctAnswer = (q.metadata?.correct_answer || '').trim();
      const isCorrect = studentAnswer === correctAnswer;
      if (isCorrect) earnedScore += pts;

      results.push({
        questionId: q.id,
        questionText: q.text,
        studentAnswer,
        correctAnswer,
        isCorrect,
        options: q.metadata?.options || []
      });
    });

    this._quizResults = results;

    // Save best score
    this.saveLevelProgress(level.id, earnedScore);

    // Show feedback inline first, then result screen
    this.renderQuizFeedback(level, results, earnedScore, totalScore, questions.length);
  }

  // ── Render: Per-Question Feedback ─────────────────────────
  renderQuizFeedback(level, results, earnedScore, totalScore, totalQuestions) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const pct = Math.round((earnedScore / totalScore) * 100);

    // Highlight each option in-place
    results.forEach(r => {
      const card = document.getElementById(`q-card-${r.questionId}`);
      if (!card) return;

      // Add feedback class to card
      card.classList.add(r.isCorrect ? 'dev-q-correct' : 'dev-q-wrong');

      // Mark each option
      card.querySelectorAll('.dev-option').forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (!radio) return;
        const val = radio.value.trim();

        if (val === r.correctAnswer) {
          label.classList.add('dev-opt-correct');
        } else if (val === r.studentAnswer && !r.isCorrect) {
          label.classList.add('dev-opt-wrong');
        }

        // Disable all radios
        radio.disabled = true;
      });

      // Add explanation chip
      const feedbackChip = document.createElement('div');
      feedbackChip.className = r.isCorrect ? 'dev-q-feedback-chip dev-chip-correct' : 'dev-q-feedback-chip dev-chip-wrong';
      feedbackChip.innerHTML = r.isCorrect
        ? `<span>✓</span> إجابة صحيحة`
        : `<span>✕</span> الإجابة الصحيحة: <strong>${r.correctAnswer}</strong>`;
      card.appendChild(feedbackChip);
    });

    // Replace submit button with result summary bar + go-to-result btn
    const submitRow = this.container.querySelector('.dev-submit-row');
    if (submitRow) {
      submitRow.innerHTML = `
        <div class="dev-result-bar ${pct >= 60 ? 'dev-result-bar-pass' : 'dev-result-bar-low'}">
          <div class="dev-result-bar-left">
            <span class="dev-result-bar-score">${earnedScore} / ${totalScore}</span>
            <span class="dev-result-bar-label">
              ${pct >= 100 ? 'درجة مثالية 🏆' : pct >= 60 ? 'أحسنت ✅' : 'يمكنك المحاولة مجدداً'}
            </span>
          </div>
          <button id="btn-see-result" class="btn btn-primary">
            ${pct >= 60 ? 'عرض صفحة الإنجاز' : 'إعادة المحاولة'}
          </button>
        </div>
      `;

      document.getElementById('btn-see-result').addEventListener('click', () => {
        if (pct >= 60) {
          this.renderResultView(level, correctCount, totalQuestions, earnedScore, totalScore);
        } else {
          // Re-render the level for retry
          this.renderLevelDetail(level);
        }
      });
    }

    // Scroll to first wrong answer if any
    const firstWrong = results.find(r => !r.isCorrect);
    if (firstWrong) {
      const wrongCard = document.getElementById(`q-card-${firstWrong.questionId}`);
      if (wrongCard) {
        setTimeout(() => wrongCard.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
      }
    } else {
      // All correct — scroll to result bar
      setTimeout(() => submitRow?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }

  // ── Render: Celebration Result Screen ─────────────────────
  renderResultView(level, correctCount, totalQuestions, earnedScore, totalScore) {
    const levelIndex = this.levels.findIndex(l => l.id === level.id);
    const hasNextLevel = levelIndex >= 0 && levelIndex < this.levels.length - 1;
    const nextLevel = hasNextLevel ? this.levels[levelIndex + 1] : null;
    const isPerfect = correctCount === totalQuestions;
    const pct = Math.round((earnedScore / totalScore) * 100);

    const stars = pct >= 100 ? '⭐⭐⭐'
                : pct >= 70  ? '⭐⭐'
                             : '⭐';

    const badge = isPerfect
      ? { emoji: '🏆', title: 'إنجاز ممتاز!', sub: 'أجبت على جميع الأسئلة بشكل صحيح.' }
      : pct >= 70
      ? { emoji: '🌟', title: 'أحسنت!', sub: 'أتممت المرحلة بنجاح وحققت نتيجة جيدة.' }
      : { emoji: '✅', title: 'تم الإنجاز', sub: 'أكملت المرحلة. يمكنك المراجعة لاحقاً للتحسين.' };

    this.container.innerHTML = `
      <div class="dev-result-view">
        <!-- Confetti (CSS-only, respects prefers-reduced-motion) -->
        <div class="dev-confetti-wrap" aria-hidden="true">
          ${Array.from({length: 12}, (_, i) => `<div class="dev-confetti-piece" style="--i:${i};"></div>`).join('')}
        </div>

        <div class="dev-result-card">
          <!-- Stars -->
          <div class="dev-result-stars">${stars}</div>

          <!-- Badge -->
          <div class="dev-result-emoji">${badge.emoji}</div>
          <h2 class="dev-result-title">${badge.title}</h2>
          <p class="dev-result-sub">${badge.sub}</p>

          <!-- Score Ring -->
          <div class="dev-score-ring-wrap">
            <svg class="dev-score-ring" viewBox="0 0 100 100" role="presentation">
              <circle class="dev-score-ring-track" cx="50" cy="50" r="42"/>
              <circle class="dev-score-ring-fill" cx="50" cy="50" r="42"
                stroke-dasharray="${2 * Math.PI * 42}"
                stroke-dashoffset="${2 * Math.PI * 42 * (1 - pct / 100)}"
              />
            </svg>
            <div class="dev-score-ring-text">
              <strong>${pct}%</strong>
              <span>${earnedScore}/${totalScore}</span>
            </div>
          </div>

          <!-- Stats -->
          <div class="dev-result-stats">
            <div class="dev-result-stat">
              <strong>${correctCount}</strong>
              <span>إجابة صحيحة</span>
            </div>
            <div class="dev-result-stat-div"></div>
            <div class="dev-result-stat">
              <strong>${totalQuestions - correctCount}</strong>
              <span>خاطئة</span>
            </div>
            <div class="dev-result-stat-div"></div>
            <div class="dev-result-stat">
              <strong>${totalQuestions}</strong>
              <span>مجموع الأسئلة</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="dev-result-actions">
            <button id="btn-back-to-levels" class="btn btn-outline">
              قائمة المراحل
            </button>
            ${hasNextLevel ? `
              <button id="btn-next-level" class="btn btn-primary">
                المرحلة التالية 🔓
              </button>
            ` : `
              <button id="btn-finish" class="btn btn-primary">
                🏁 أتممت البرنامج!
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('btn-back-to-levels').addEventListener('click', () => {
      this.renderLevelsList();
    });

    if (hasNextLevel) {
      document.getElementById('btn-next-level').addEventListener('click', () => {
        this.renderLevelDetail(nextLevel);
      });
    } else {
      document.getElementById('btn-finish')?.addEventListener('click', () => {
        this.renderLevelsList();
      });
    }
  }
}

// ── Export & Init ──────────────────────────────────────────────
export const developController = new DevelopController();

document.addEventListener('DOMContentLoaded', () => {
  developController.init('develop-container');
});
