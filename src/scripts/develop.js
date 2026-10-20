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
import { studentIdentity } from '../utils/student-identity.js';

// ─── Fallback data matching Supabase schema exactly ───────────
const DEFAULT_CHALLENGE = {
  id: 'c1000000-0000-0000-0000-000000000001',
  title: 'برنامج القراءة المتدرج – إشراقات عُمانية',
  description: 'رحلة معرفية متدرجة عبر تاريخ عُمان وحضارتها؛ اقرأ، استوعب، وأثبت فهمك.',
  category_name: 'التاريخ والتراث العماني',
  challenge_levels: [
    {
      id: 'b1000000-0000-0000-0000-000000000001',
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
            type: 'multi',
            text: 'ما الميزات المعمارية والدفاعية التي احتوت عليها الحصون العمانية؟ (حدد جميع الإجابات الصحيحة)',
            points: 1,
            metadata: {
              options: [
                'الأبراج الدائرية المتعددة المستويات',
                'الممرات السرية المتشعبة',
                'آبار المياه العذبة المحفورة في الصخر',
                'المباني الزجاجية الحديثة'
              ],
              correct_answers: [
                'الأبراج الدائرية المتعددة المستويات',
                'الممرات السرية المتشعبة',
                'آبار المياه العذبة المحفورة في الصخر'
              ]
            }
          }
        },
        {
          order_num: 4,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000004_ord',
            type: 'order',
            text: 'رتّب تسلسل عناصر الحصن الدفاعية من المحيط الخارجي إلى الداخل:',
            points: 1,
            metadata: {
              items: [
                'الأسوار والأبراج الدفاعية الخارجية',
                'البوابات الضخمة والمداخل المتعرجة',
                'الساحات والممرات السرية الداخلية',
                'مخازن المؤن وآبار المياه الحصينة'
              ],
              correct_order: [
                'الأسوار والأبراج الدفاعية الخارجية',
                'البوابات الضخمة والمداخل المتعرجة',
                'الساحات والممرات السرية الداخلية',
                'مخازن المؤن وآبار المياه الحصينة'
              ]
            }
          }
        },
        {
          order_num: 5,
          questions: {
            id: 'q1000000-0000-0000-0000-000000000005_mat',
            type: 'match',
            text: 'صِل كل عنصر دفاعي بوظيفته الأساسية في القلعة العمانية:',
            points: 1,
            metadata: {
              pairs: [
                { left: 'الأبراج الدائرية', right: 'كشف المحيط والمراقبة العسكرية' },
                { left: 'الممرات السرية', right: 'المناورة والإخلاء أثناء الحصار' },
                { left: 'الآبار والمخازن', right: 'تأمين المياه والمؤن لأشهر الحصار' }
              ]
            }
          }
        }
      ]
    },
    {
      id: 'b1000000-0000-0000-0000-000000000002',
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
      id: 'b1000000-0000-0000-0000-000000000003',
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
    this.allChallenges = [];
    this.categories = [];
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

    // If not logged in, show login methods panel instead of identity form
    if (!this.user) {
      this.renderLoginModal('برنامج طوّر نفسك');
      return;
    }

    await this.loadChallengesData();
    await this.loadProgressData();

    this.renderLevelsList();

    // Silently verify student identity on page entry (won't show modal if data exists)
    await studentIdentity.requireVerification({ activityName: 'برنامج طوّر نفسك' });
  }

  // ── Render: Login Methods Panel (for unauthenticated visitors) ─
  renderLoginModal(activityName = 'هذا النشاط') {
    this.container.innerHTML = `
      <div class="dev-login-wall" style="
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 60vh; padding: 2rem 1rem;
      ">
        <div class="card" style="
          width: 100%; max-width: 480px; padding: 2.5rem 2rem;
          text-align: center; border: 1px solid var(--color-border);
        ">
          <!-- Icon & Title -->
          <div style="font-size: 2.8rem; margin-bottom: 0.75rem;">📖</div>
          <h2 style="margin: 0 0 0.5rem; color: var(--color-text); font-size: 1.4rem;">${activityName}</h2>
          <p style="color: var(--color-text-muted); font-size: 0.93rem; margin: 0 0 2rem;">
            سجّل دخولك للوصول إلى مسار التعلم وحفظ تقدمك.
          </p>

          <!-- Email / Password Login -->
          <form id="dlw-login-form" style="margin-bottom: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 0.75rem;">
              <input
                id="dlw-identifier"
                type="text"
                placeholder="البريد الإلكتروني أو اسم المستخدم"
                autocomplete="username"
                dir="ltr"
                style="
                  padding: 0.75rem 1rem; border: 1px solid var(--color-border);
                  border-radius: var(--border-radius); background: var(--color-bg);
                  color: var(--color-text); font-family: inherit; text-align: right;
                  width: 100%; box-sizing: border-box;
                "
              >
              <div style="position: relative;">
                <input
                  id="dlw-password"
                  type="password"
                  placeholder="كلمة المرور"
                  autocomplete="current-password"
                  dir="ltr"
                  style="
                    padding: 0.75rem 2.75rem 0.75rem 1rem; border: 1px solid var(--color-border);
                    border-radius: var(--border-radius); background: var(--color-bg);
                    color: var(--color-text); font-family: inherit; text-align: right;
                    width: 100%; box-sizing: border-box;
                  "
                >
                <button type="button" id="dlw-toggle-pwd" style="
                  position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
                  background: none; border: none; cursor: pointer; font-size: 1.1rem;
                  color: var(--color-text-muted); padding: 0;
                " tabindex="-1" aria-label="إظهار/إخفاء كلمة المرور">👁️</button>
              </div>
            </div>
            <div style="text-align: left; margin-bottom: 1rem;">
              <a href="forgot-password.html" style="font-size: 0.82rem; color: var(--color-accent);">نسيت كلمة المرور؟</a>
            </div>
            <button id="dlw-login-btn" type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 0.75rem;">
              دخول
            </button>
          </form>

          <!-- Divider -->
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem;">
            <hr style="flex: 1; border: none; border-top: 1px solid var(--color-border);">
            <span style="font-size: 0.83rem; color: var(--color-text-muted); white-space: nowrap;">أو</span>
            <hr style="flex: 1; border: none; border-top: 1px solid var(--color-border);">
          </div>

          <!-- Google Login -->
          <button id="dlw-google-btn" type="button" class="btn btn-outline flex items-center justify-center gap-1" style="width: 100%; margin-bottom: 0.65rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
              <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
              <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
              <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            <span>الدخول باستخدام Google</span>
          </button>

          <!-- Quick Student (Guest) Login -->
          <button id="dlw-guest-btn" type="button" class="btn btn-outline flex items-center justify-center gap-2" style="
            width: 100%; margin-bottom: 1.25rem;
            border: 1.5px dashed var(--color-primary); color: var(--color-primary);
            font-weight: 700; background: rgba(79,70,229,0.04);
          ">
            <span style="font-size: 1.2rem;">🎓</span>
            <span>الدخول السريع كطالب (بدون حساب)</span>
          </button>

          <!-- Sign up link -->
          <p style="font-size: 0.88rem; color: var(--color-text-muted); margin: 0;">
            ليس لديك حساب؟
            <a href="signup.html?redirect=develop.html" style="color: var(--color-accent); font-weight: 600;">إنشاء حساب جديد</a>
          </p>
        </div>
      </div>
    `;

    // ── Wire up login form ──────────────────────────────────────
    const loginForm = this.container.querySelector('#dlw-login-form');
    const loginBtn  = this.container.querySelector('#dlw-login-btn');
    const togglePwd = this.container.querySelector('#dlw-toggle-pwd');
    const pwdInput  = this.container.querySelector('#dlw-password');

    if (togglePwd && pwdInput) {
      togglePwd.addEventListener('click', () => {
        const show = pwdInput.type === 'password';
        pwdInput.type = show ? 'text' : 'password';
        togglePwd.textContent = show ? '🙈' : '👁️';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = this.container.querySelector('#dlw-identifier').value.trim();
        const password   = this.container.querySelector('#dlw-password').value;
        if (!identifier || !password) { Toast.warning('أدخل بيانات الدخول.'); return; }
        loginBtn.disabled = true;
        loginBtn.textContent = 'جاري تسجيل الدخول...';
        try {
          await authService.login(identifier, password);
          Toast.success('تم تسجيل الدخول! جاري التحديث...');
          setTimeout(() => window.location.reload(), 600);
        } catch (err) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'دخول';
          Toast.error(err.message?.includes('Invalid login') ? 'بيانات الدخول غير صحيحة.' : (err.message || 'حدث خطأ.'));
        }
      });
    }

    // ── Google Login ────────────────────────────────────────────
    const googleBtn = this.container.querySelector('#dlw-google-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        const orig = googleBtn.innerHTML;
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<span>⏳</span><span> جاري التحويل إلى Google...</span>';
        try {
          await authService.loginWithGoogle();
        } catch (err) {
          googleBtn.disabled = false;
          googleBtn.innerHTML = orig;
          Toast.error(err.message === 'FILE_PROTOCOL'
            ? 'لتسجيل الدخول بجوجل، يرجى تشغيل الموقع عبر خادم محلي (مثل Live Server).'
            : (err.message || 'تعذر الاتصال بخدمة Google.'));
        }
      });
    }

    // ── Guest (Quick Student) Login ─────────────────────────────
    const guestBtn = this.container.querySelector('#dlw-guest-btn');
    if (guestBtn) {
      guestBtn.addEventListener('click', () => {
        studentIdentity.showGuestLoginModal({
          redirectUrl: 'develop.html',
          onSuccess: () => {}
        });
      });
    }
  }

  // ── Data Loading ───────────────────────────────────────────
  async loadChallengesData() {
    try {
      if (supabase) {
        // Load active categories
        const { data: catData } = await supabase
          .from('challenge_categories')
          .select('*')
          .order('sort_order', { ascending: true });
        this.categories = catData || [];

        // Load all active challenges
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            id, title, description, image_url, status, order_num, category_id, category_name, created_at,
            challenge_levels (
              id, level_number, title, paragraph, passing_score, created_at,
              challenge_questions (
                order_num,
                questions ( id, type, text, image_url, points, metadata )
              )
            )
          `)
          .eq('status', 'active')
          .order('order_num', { ascending: true });

        if (!error && data && data.length > 0) {
          this.allChallenges = data;
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
    this.allChallenges = [DEFAULT_CHALLENGE];
    this.levels = DEFAULT_CHALLENGE.challenge_levels;
  }

  switchChallenge(challengeId) {
    const ch = this.allChallenges.find(c => c.id === challengeId);
    if (!ch) return;
    this.challenge = ch;
    this.levels = (ch.challenge_levels || []).sort(
      (a, b) => (a.level_number || 0) - (b.level_number || 0)
    );
    this.renderLevelsList();
  }

  async loadProgressData() {
    this.progressMap = {};

    if (this.user && supabase) {
      try {
        const { syncOrResolveProgressConflict } = await import('../utils/progress-sync.js');
        const resolved = await syncOrResolveProgressConflict(this.user.id);
        if (resolved && typeof resolved === 'object' && Object.keys(resolved).length > 0) {
          this.progressMap = resolved;
          return;
        }
      } catch (err) {
        console.warn('Progress sync/conflict check error:', err);
      }

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
    } else if (!this.user && supabase) {
      // Load guest progress from Supabase
      try {
        const iden = studentIdentity.getStoredIdentity() || {};
        const sessionId = iden.sessionId;
        
        if (sessionId) {
          const { data, error } = await supabase
            .from('student_progress')
            .select('challenge_level_id, status, score, completed_at')
            .is('student_id', null)
            .eq('guest_session_id', sessionId);

          if (!error && data) {
            data.forEach(p => {
              this.progressMap[p.challenge_level_id] = {
                status: p.status,
                score: p.score || 0
              };
            });
            // Also save to localStorage as backup
            try {
              localStorage.setItem('siraj_student_progress', JSON.stringify(this.progressMap));
            } catch (e) {}
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load guest progress from Supabase:', err);
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
  /**
   * Best-score logic: only update if the new score is >= stored score.
   * Checks passing score before marking as 'completed'.
   */
  async saveLevelProgress(level, score, totalScore) {
    const levelId = level.id;
    const passingScore = level.passing_score || Math.ceil(totalScore * 0.6);
    const passed = score >= passingScore;
    const existing = this.progressMap[levelId];
    const bestScore = existing ? Math.max(existing.score || 0, score) : score;
    const status = (passed || (existing && existing.status === 'completed')) ? 'completed' : 'in_progress';
    let persistedToSupabase = false;

    this.progressMap[levelId] = { status, score: bestScore };

    if (this.user && supabase) {
      try {
        const { error } = await supabase
          .from('student_progress')
          .upsert({
            student_id: this.user.id,
            challenge_level_id: levelId,
            status,
            score: bestScore,
            completed_at: new Date().toISOString()
          }, { onConflict: 'student_id,challenge_level_id' });
        if (error) throw error;
        persistedToSupabase = true;
      } catch (err) {
        console.error('Failed to save progress to Supabase:', err);
      }
    } else if (supabase) {
      try {
        const iden = studentIdentity.getStoredIdentity() || {};
        const sessionId = iden.sessionId || ('guest_' + Math.random().toString(36).substring(2, 9));
        
        // For guests, try to find existing progress by session and level
        const { data: existingProgress } = await supabase
          .from('student_progress')
          .select('id')
          .is('student_id', null)
          .eq('guest_session_id', sessionId)
          .eq('challenge_level_id', levelId)
          .single();

        if (existingProgress) {
          // Update existing record
          const { error } = await supabase
            .from('student_progress')
            .update({
              guest_name: iden.name || 'مشارك زائر',
              guest_username: iden.username || null,
              guest_grade: iden.grade || null,
              guest_section: iden.section || null,
              guest_school_type: iden.schoolType || iden.school_type || 'abu_obaida',
              guest_school_name: iden.schoolName || iden.school_name || (iden.schoolType === 'abu_obaida' ? 'مدرسة أبو عبيدة  ' : 'مدرسة أخرى'),
              status,
              score: bestScore,
              completed_at: new Date().toISOString()
            })
            .eq('id', existingProgress.id);
          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from('student_progress')
            .insert({
              student_id: null,
              guest_name: iden.name || 'مشارك زائر',
              guest_username: iden.username || null,
              guest_grade: iden.grade || null,
              guest_section: iden.section || null,
              guest_school_type: iden.schoolType || iden.school_type || 'abu_obaida',
              guest_school_name: iden.schoolName || iden.school_name || (iden.schoolType === 'abu_obaida' ? 'مدرسة أبو عبيدة  ' : 'مدرسة أخرى'),
              guest_session_id: sessionId,
              challenge_level_id: levelId,
              status,
              score: bestScore,
              completed_at: new Date().toISOString()
            });
          if (error) throw error;
        }
        persistedToSupabase = true;
      } catch (err) {
        console.error('Failed to save guest reading progress:', err);
        Toast.error('تعذر حفظ السؤال في هذه المرحلة. بقيت بياناتك في المحرر؛ تحقق من الاتصال والصلاحيات وحاول مرة أخرى.');
      }
    }

    try {
      localStorage.setItem('siraj_student_progress', JSON.stringify(this.progressMap));
    } catch (e) {}

    if (supabase && !persistedToSupabase) {
      Toast.error('تم تصحيح إجاباتك، لكن تعذر حفظ التقدم على الخادم. حُفظ على هذا الجهاز مؤقتًا.');
    }
    return passed;
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

    // Challenge switcher pills
    const pillsHtml = (this.allChallenges && this.allChallenges.length > 1) ? `
      <div class="dev-challenge-pills-wrap" style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap; margin-bottom:1.5rem;">
        ${this.allChallenges.map(c => `
          <button type="button" class="btn btn-sm ${c.id === this.challenge.id ? 'btn-primary' : 'btn-outline'} dev-challenge-pill" data-challenge-id="${c.id}" style="border-radius:999px; padding:0.4rem 1rem;">
            ${c.title}
            ${c.category_name ? `<span style="opacity:0.8; font-size:0.75rem; margin-right:0.35rem;">(${c.category_name})</span>` : ''}
          </button>
        `).join('')}
      </div>
    ` : '';

    let html = `
      <!-- ── Hero / Intro ── -->
      <div class="dev-hero">
        <div class="dev-hero-text">
          <div class="dev-hero-label">
            ${this.challenge.category_name ? `<span>${this.challenge.category_name} · </span>` : ''}
            <span>برنامج التطوير المعرفي</span>
          </div>
          <h1 class="dev-hero-title">${this.challenge.title || 'طوّر نفسك'}</h1>
          <p class="dev-hero-desc">${this.challenge.description || 'رحلة قراءة متدرجة تبني معرفتك خطوة بخطوة'}</p>
        </div>

        ${pillsHtml}

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
            <span>تتصفح كضيف — سيتم حفظ نتائجك باسمك المسجل في هويتك الحالية. <a href="login.html">سجّل الدخول</a> لحفظ تقدمك الدائم.</span>
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
      const passReq = level.passing_score || Math.ceil(questionsCount * 0.6);

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
              <span>🎯 شرط الاجتياز: ${passReq}</span>
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
              <span>🎯 شرط الاجتياز: ${passReq}</span>
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
            <div class="dev-level-lock-hint">اجتز المرحلة السابقة بدرجة لا تقل عن شرط الاجتياز لفتح هذه المرحلة</div>
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

    // Challenge pills listener
    this.container.querySelectorAll('.dev-challenge-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-challenge-id');
        this.switchChallenge(cId);
      });
    });

    // Event listeners
    this.container.querySelectorAll('.btn-level-action:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const levelId = btn.getAttribute('data-level-id');
        this.handleOpenLevel(levelId);
      });
    });
  }

  // ── Security Gate ──────────────────────────────────────────
  async handleOpenLevel(levelId) {
    const verified = await studentIdentity.requireVerification({ activityName: 'برنامج طوّر نفسك' });
    if (!verified) return;

    const levelIndex = this.levels.findIndex(l => l.id === levelId);
    if (levelIndex === -1) return;

    if (this.getLevelStatus(levelIndex) === 'locked') {
      Toast.error('🔒 أكمل المرحلة السابقة وحقق درجة الاجتياز أولاً لفتح هذه المرحلة.');
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
    const typeLabels = {
      mcq: 'اختيار من متعدد',
      tf: 'صح أو خطأ',
      multi: 'متعدد الخيارات',
      order: 'ترتيب تسلسلي',
      match: 'مطابقة وتوصيل'
    };

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
      const qType = q.type || 'mcq';
      const meta = q.metadata || {};

      let bodyHtml = '';

      if (qType === 'mcq') {
        const options = meta.options || [];
        bodyHtml = `
          <div class="dev-options-list" role="radiogroup" aria-label="خيارات السؤال ${qIdx + 1}">
            ${options.map((optText, optIdx) => {
              const inputId = `q_${q.id}_opt_${optIdx}`;
              return `
                <label class="dev-option" for="${inputId}">
                  <input type="radio" id="${inputId}" name="q_${q.id}" value="${escapeHtml(optText)}" data-q-id="${q.id}">
                  <span class="dev-option-indicator"></span>
                  <span class="dev-option-text">${escapeHtml(optText)}</span>
                </label>
              `;
            }).join('')}
          </div>
        `;
      } else if (qType === 'tf') {
        bodyHtml = `
          <div class="dev-tf-wrap" role="radiogroup" aria-label="صح أو خطأ للسؤال ${qIdx + 1}">
            <label class="dev-tf-opt" for="q_${q.id}_tf_true">
              <input type="radio" id="q_${q.id}_tf_true" name="q_${q.id}" value="صح" data-q-id="${q.id}">
              <span class="dev-tf-dot"></span>
              <span>صح ✓</span>
            </label>
            <label class="dev-tf-opt" for="q_${q.id}_tf_false">
              <input type="radio" id="q_${q.id}_tf_false" name="q_${q.id}" value="خطأ" data-q-id="${q.id}">
              <span class="dev-tf-dot"></span>
              <span>خطأ ✕</span>
            </label>
          </div>
        `;
      } else if (qType === 'multi') {
        const options = meta.options || [];
        bodyHtml = `
          <p style="font-size: 0.85rem; color: var(--color-primary); font-weight: 700; margin-bottom: 0.75rem;">
            ☑️ حدد كل الإجابات الصحيحة (يمكن اختيار أكثر من إجابة):
          </p>
          <div class="dev-options-list">
            ${options.map((optText, optIdx) => {
              const inputId = `q_${q.id}_multi_${optIdx}`;
              return `
                <label class="dev-option" for="${inputId}">
                  <input type="checkbox" id="${inputId}" name="q_${q.id}" value="${escapeHtml(optText)}" data-q-id="${q.id}">
                  <span class="dev-option-checkbox">✓</span>
                  <span class="dev-option-text">${escapeHtml(optText)}</span>
                </label>
              `;
            }).join('')}
          </div>
        `;
      } else if (qType === 'order') {
        const items = meta.correct_order || meta.items || [];
        const instruction = meta.instruction || 'رتّب العناصر بالترتيب الصحيح المتسلسل (استخدم الأسهم أو السحب):';
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        bodyHtml = `
          <p class="dev-order-instr">📋 ${escapeHtml(instruction)}</p>
          <ul class="dev-order-list" data-q-id="${q.id}">
            ${shuffled.map(item => `
              <li class="dev-order-item" draggable="true" data-val="${escapeHtml(item)}">
                <span class="dev-order-handle" aria-hidden="true">⠿</span>
                <span class="dev-order-txt">${escapeHtml(item)}</span>
                <div class="dev-order-btns">
                  <button class="dev-ord-up" type="button" aria-label="للأعلى">▲</button>
                  <button class="dev-ord-dn" type="button" aria-label="للأسفل">▼</button>
                </div>
              </li>
            `).join('')}
          </ul>
        `;
      } else if (qType === 'match') {
        const pairs = meta.pairs || [];
        const rightOptions = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);
        bodyHtml = `
          <p class="dev-order-instr">🔗 صِل كل عنصر في العمود الأيمن بما يناسبه من القائمة المقابلة:</p>
          <div class="dev-match-list" data-q-id="${q.id}">
            ${pairs.map((p, pIdx) => `
              <div class="dev-match-row" data-left="${escapeHtml(p.left)}">
                <div class="dev-match-left">
                  <span style="color: var(--color-primary); margin-left: 0.35rem;">${pIdx + 1}.</span> ${escapeHtml(p.left)}
                </div>
                <div class="dev-match-arrow">⇄</div>
                <div class="dev-match-right-wrap">
                  <select class="dev-match-select" data-left="${escapeHtml(p.left)}" data-q-id="${q.id}">
                    <option value="">-- اختر الإجابة المناسبة --</option>
                    ${rightOptions.map(ro => `<option value="${escapeHtml(ro)}">${escapeHtml(ro)}</option>`).join('')}
                  </select>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      html += `
        <div class="dev-question-card" id="q-card-${q.id}" data-q-id="${q.id}" data-q-type="${qType}">
          <div class="dev-question-header">
            <span class="dev-question-num">${qIdx + 1}</span>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                <span class="dev-q-type-badge">${typeLabels[qType] || qType}</span>
                <span class="dev-q-pts-badge">${q.points || 1} نقطة</span>
              </div>
              <p class="dev-question-text">${escapeHtml(q.text)}</p>
            </div>
          </div>
          ${q.image_url ? `
            <div class="dev-q-img-wrap">
              <img src="${escapeHtml(q.image_url)}" alt="صورة السؤال" class="dev-q-img" onerror="this.parentElement.style.display='none'">
            </div>
          ` : ''}
          <div class="dev-question-body">
            ${bodyHtml}
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

    // Attach interactive handlers for each question
    questions.forEach(q => {
      const qType = q.type || 'mcq';
      const card = document.getElementById(`q-card-${q.id}`);
      if (!card) return;

      if (qType === 'mcq') {
        card.querySelectorAll('input[type="radio"]').forEach(radio => {
          radio.addEventListener('change', () => {
            this.selectedAnswers[q.id] = radio.value;
            card.querySelectorAll('.dev-option').forEach(lbl => lbl.classList.remove('dev-option-selected'));
            radio.closest('.dev-option')?.classList.add('dev-option-selected');
            card.classList.remove('dev-question-unanswered');
            this.updateSubmitHint(questions);
          });
        });

      } else if (qType === 'tf') {
        card.querySelectorAll('input[type="radio"]').forEach(radio => {
          radio.addEventListener('change', () => {
            this.selectedAnswers[q.id] = radio.value;
            card.querySelectorAll('.dev-tf-opt').forEach(lbl => lbl.classList.remove('dev-tf-opt-sel'));
            radio.closest('.dev-tf-opt')?.classList.add('dev-tf-opt-sel');
            card.classList.remove('dev-question-unanswered');
            this.updateSubmitHint(questions);
          });
        });

      } else if (qType === 'multi') {
        card.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.addEventListener('change', () => {
            cb.closest('.dev-option')?.classList.toggle('dev-option-selected', cb.checked);
            const checkedVals = Array.from(card.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
            this.selectedAnswers[q.id] = checkedVals.length > 0 ? checkedVals : null;
            card.classList.remove('dev-question-unanswered');
            this.updateSubmitHint(questions);
          });
        });

      } else if (qType === 'order') {
        const list = card.querySelector('.dev-order-list');
        if (list) {
          // Pre-populate with current order so it is considered answered
          this.selectedAnswers[q.id] = Array.from(list.querySelectorAll('.dev-order-item')).map(li => li.dataset.val);

          // Arrow buttons
          list.addEventListener('click', e => {
            const item = e.target.closest('.dev-order-item');
            if (!item) return;
            if (e.target.closest('.dev-ord-up')) {
              const p = item.previousElementSibling;
              if (p) list.insertBefore(item, p);
            }
            if (e.target.closest('.dev-ord-dn')) {
              const n = item.nextElementSibling;
              if (n) list.insertBefore(n, item);
            }
            this.selectedAnswers[q.id] = Array.from(list.querySelectorAll('.dev-order-item')).map(li => li.dataset.val);
            card.classList.remove('dev-question-unanswered');
            this.updateSubmitHint(questions);
          });

          // Drag and drop
          let dragged = null;
          list.querySelectorAll('.dev-order-item').forEach(item => {
            item.addEventListener('dragstart', () => {
              dragged = item;
              setTimeout(() => item.classList.add('dev-dragging'), 0);
            });
            item.addEventListener('dragend', () => {
              dragged = null;
              item.classList.remove('dev-dragging');
              list.querySelectorAll('.dev-order-item').forEach(i => i.classList.remove('dev-drag-over'));
              this.selectedAnswers[q.id] = Array.from(list.querySelectorAll('.dev-order-item')).map(li => li.dataset.val);
              card.classList.remove('dev-question-unanswered');
              this.updateSubmitHint(questions);
            });
            item.addEventListener('dragover', e => {
              e.preventDefault();
              if (!dragged || dragged === item) return;
              item.classList.add('dev-drag-over');
              const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
              list.insertBefore(dragged, e.clientY < mid ? item : item.nextSibling);
            });
            item.addEventListener('dragleave', () => item.classList.remove('dev-drag-over'));
          });
        }

      } else if (qType === 'match') {
        card.querySelectorAll('.dev-match-select').forEach(sel => {
          sel.addEventListener('change', () => {
            const rows = card.querySelectorAll('.dev-match-row');
            const chosen = [];
            let allFilled = true;
            rows.forEach(r => {
              const left = r.dataset.left;
              const val = r.querySelector('.dev-match-select')?.value.trim();
              if (!val) allFilled = false;
              chosen.push({ left, right: val });
            });
            this.selectedAnswers[q.id] = allFilled ? chosen : null;
            card.classList.remove('dev-question-unanswered');
            this.updateSubmitHint(questions);
          });
        });
      }
    });

    this.updateSubmitHint(questions);

    // Form submit
    document.getElementById('quiz-form').addEventListener('submit', async e => {
      e.preventDefault();
      const submitButton = document.getElementById('btn-submit-quiz');
      if (submitButton) submitButton.disabled = true;
      try {
        await this.handleQuizSubmit(level, questions);
      } finally {
        if (submitButton?.isConnected) submitButton.disabled = false;
      }
    });
  }

  isQuestionAnswered(q) {
    const ans = this.selectedAnswers[q.id];
    if (ans === undefined || ans === null) return false;
    const type = q.type || 'mcq';
    if (type === 'mcq' || type === 'tf') return Boolean(String(ans).trim());
    if (type === 'multi') return Array.isArray(ans) && ans.length > 0;
    if (type === 'order') return Array.isArray(ans) && ans.length > 0;
    if (type === 'match') {
      const pairs = q.metadata?.pairs || [];
      if (!Array.isArray(ans) || ans.length !== pairs.length) return false;
      return ans.every(p => Boolean(p.right));
    }
    return false;
  }

  updateSubmitHint(questions) {
    const answeredCount = questions.filter(q => this.isQuestionAnswered(q)).length;
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
  async handleQuizSubmit(level, questions) {
    const unanswered = questions.filter(q => !this.isQuestionAnswered(q));

    if (unanswered.length > 0) {
      // Shake and highlight unanswered
      unanswered.forEach(q => {
        const card = document.getElementById(`q-card-${q.id}`);
        if (card) {
          card.classList.add('dev-question-unanswered');
          setTimeout(() => card.classList.remove('dev-question-unanswered'), 600);
        }
      });
      Toast.error(`${unanswered.length} سؤال لم تُجب عليه بعد بصورة كاملة.`);

      // Scroll to first unanswered
      const firstCard = document.getElementById(`q-card-${unanswered[0].id}`);
      if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Grade each question based on type
    let earnedScore = 0;
    let totalScore = 0;
    const results = [];

    questions.forEach(q => {
      const qType = q.type || 'mcq';
      const pts = q.points || 1;
      totalScore += pts;
      const ans = this.selectedAnswers[q.id];
      let isCorrect = false;

      if (qType === 'mcq' || qType === 'tf') {
        const studentAnswer = String(ans || '').trim();
        const correctAnswer = (q.metadata?.correct_answer || (qType === 'tf' ? 'صح' : '')).trim();
        isCorrect = studentAnswer === correctAnswer;
      } else if (qType === 'multi') {
        const correctArr = (q.metadata?.correct_answers || []).map(s => String(s).trim()).sort();
        const studentArr = Array.isArray(ans) ? ans.map(s => String(s).trim()).sort() : [];
        isCorrect = correctArr.length > 0 &&
                    correctArr.length === studentArr.length &&
                    correctArr.every((v, i) => v === studentArr[i]);
      } else if (qType === 'order') {
        const correctOrder = q.metadata?.correct_order || q.metadata?.items || [];
        isCorrect = Array.isArray(ans) &&
                    ans.length === correctOrder.length &&
                    ans.every((v, i) => String(v).trim() === String(correctOrder[i]).trim());
      } else if (qType === 'match') {
        const pairs = q.metadata?.pairs || [];
        isCorrect = Array.isArray(ans) &&
                    ans.length === pairs.length &&
                    ans.every(a => pairs.some(p => p.left === a.left && p.right === a.right));
      }

      if (isCorrect) earnedScore += pts;

      results.push({
        questionId: q.id,
        question: q,
        studentAnswer: ans,
        isCorrect
      });
    });

    this._quizResults = results;

    const passingScore = level.passing_score || Math.ceil(totalScore * 0.6);
    const passed = earnedScore >= passingScore;

    // Save best score and get status
    await this.saveLevelProgress(level, earnedScore, totalScore);

    // Show feedback inline first, then result screen
    this.renderQuizFeedback(level, results, earnedScore, totalScore, questions.length, passed, passingScore);
  }

  // ── Render: Per-Question Feedback ─────────────────────────
  renderQuizFeedback(level, results, earnedScore, totalScore, totalQuestions, passed, passingScore) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const pct = Math.round((earnedScore / totalScore) * 100);

    // Highlight each question in-place
    results.forEach(r => {
      const q = r.question;
      const qType = q.type || 'mcq';
      const card = document.getElementById(`q-card-${r.questionId}`);
      if (!card) return;

      // Add feedback class to card
      card.classList.add(r.isCorrect ? 'dev-q-correct' : 'dev-q-wrong');

      let feedbackText = '';

      if (qType === 'mcq') {
        const corrAns = (q.metadata?.correct_answer || '').trim();
        card.querySelectorAll('.dev-option').forEach(label => {
          const radio = label.querySelector('input[type="radio"]');
          if (!radio) return;
          const val = radio.value.trim();
          if (val === corrAns) {
            label.classList.add('dev-opt-correct');
          } else if (val === String(r.studentAnswer).trim() && !r.isCorrect) {
            label.classList.add('dev-opt-wrong');
          }
          radio.disabled = true;
        });
        feedbackText = r.isCorrect
          ? `<span>✓</span> إجابة صحيحة`
          : `<span>✕</span> الإجابة الصحيحة: <strong>${escapeHtml(corrAns)}</strong>`;

      } else if (qType === 'tf') {
        const corrAns = (q.metadata?.correct_answer || 'صح').trim();
        card.querySelectorAll('.dev-tf-opt').forEach(label => {
          const radio = label.querySelector('input[type="radio"]');
          if (!radio) return;
          const val = radio.value.trim();
          if (val === corrAns) {
            label.classList.add('dev-tf-opt-sel', 'dev-opt-correct');
          } else if (val === String(r.studentAnswer).trim() && !r.isCorrect) {
            label.classList.add('dev-opt-wrong');
          }
          radio.disabled = true;
        });
        feedbackText = r.isCorrect
          ? `<span>✓</span> إجابة صحيحة`
          : `<span>✕</span> الإجابة الصحيحة: <strong>${escapeHtml(corrAns)}</strong>`;

      } else if (qType === 'multi') {
        const correctAnswers = q.metadata?.correct_answers || [];
        const studentAns = Array.isArray(r.studentAnswer) ? r.studentAnswer : [];
        card.querySelectorAll('.dev-option').forEach(label => {
          const cb = label.querySelector('input[type="checkbox"]');
          if (!cb) return;
          const val = cb.value.trim();
          if (correctAnswers.includes(val)) {
            label.classList.add('dev-opt-correct');
          } else if (studentAns.includes(val)) {
            label.classList.add('dev-opt-wrong');
          }
          cb.disabled = true;
        });
        feedbackText = r.isCorrect
          ? `<span>✓</span> أحسنت! حددت جميع الإجابات الصحيحة`
          : `<span>✕</span> الإجابات الصحيحة هي: <strong>${escapeHtml(correctAnswers.join('، '))}</strong>`;

      } else if (qType === 'order') {
        const correctOrder = q.metadata?.correct_order || q.metadata?.items || [];
        card.querySelectorAll('.dev-ord-up, .dev-ord-dn').forEach(btn => btn.disabled = true);
        card.querySelectorAll('.dev-order-item').forEach(it => it.setAttribute('draggable', 'false'));
        feedbackText = r.isCorrect
          ? `<span>✓</span> ترتيب تسلسلي متقن وصحيح`
          : `<span>✕</span> الترتيب الصحيح: <strong>${escapeHtml(correctOrder.join(' ← '))}</strong>`;

      } else if (qType === 'match') {
        const pairs = q.metadata?.pairs || [];
        card.querySelectorAll('.dev-match-select').forEach(sel => sel.disabled = true);
        card.querySelectorAll('.dev-match-row').forEach(row => {
          const left = row.dataset.left;
          const matchedRight = row.querySelector('.dev-match-select')?.value.trim();
          const targetPair = pairs.find(p => p.left === left);
          const isRowCorrect = targetPair && targetPair.right === matchedRight;
          row.style.borderColor = isRowCorrect ? 'var(--color-primary)' : '#e53935';
          row.style.background = isRowCorrect ? 'rgba(18, 117, 71, 0.08)' : 'rgba(229, 57, 53, 0.08)';
        });
        feedbackText = r.isCorrect
          ? `<span>✓</span> جميع أزواج التوصيل صحيحة`
          : `<span>✕</span> التوصيل الصحيح: <strong>${escapeHtml(pairs.map(p => `${p.left} ⇄ ${p.right}`).join(' | '))}</strong>`;
      }

      // Add feedback chip
      const feedbackChip = document.createElement('div');
      feedbackChip.className = r.isCorrect ? 'dev-q-feedback-chip dev-chip-correct' : 'dev-q-feedback-chip dev-chip-wrong';
      feedbackChip.innerHTML = feedbackText;
      card.appendChild(feedbackChip);

      // Add explanation chip if exists
      if (q.metadata?.explanation) {
        const expChip = document.createElement('div');
        expChip.style.cssText = 'margin-top:0.5rem; font-size:0.83rem; color:var(--color-text-muted); background:var(--color-bg-secondary); padding:0.4rem 0.75rem; border-radius:6px; border-right:3px solid var(--color-primary);';
        expChip.innerHTML = `💡 <strong>شرح وتوضيح:</strong> ${escapeHtml(q.metadata.explanation)}`;
        card.appendChild(expChip);
      }
    });

    // Replace submit button with result summary bar + go-to-result btn
    const submitRow = this.container.querySelector('.dev-submit-row');
    if (submitRow) {
      submitRow.innerHTML = `
        <div class="dev-result-bar ${passed ? 'dev-result-bar-pass' : 'dev-result-bar-low'}">
          <div class="dev-result-bar-left">
            <span class="dev-result-bar-score">${earnedScore} / ${totalScore}</span>
            <span class="dev-result-bar-label">
              ${passed ? (pct >= 100 ? 'درجة كاملة متميزة! 🏆 اجتزت المرحلة' : 'أحسنت! ✅ حققت شرط الاجتياز') : `تحتاج إلى ${passingScore} من ${totalScore} لاجتياز المرحلة ⚠️`}
            </span>
          </div>
          <button id="btn-see-result" class="btn btn-primary">
            ${passed ? 'عرض بطاقة الإنجاز ←' : 'إعادة محاولة المرحلة ↺'}
          </button>
        </div>
      `;

      document.getElementById('btn-see-result').addEventListener('click', () => {
        if (passed) {
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
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const developController = new DevelopController();

document.addEventListener('DOMContentLoaded', () => {
  developController.init('develop-container');
});
