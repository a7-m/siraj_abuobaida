# سراج – مدرسة أبو عبيدة (Siraj Platform)

> منصة تعليمية تفاعلية حديثة لمدرسة أبو عبيدة، مصممة بلغة بصرية راقية مستوحاة من أحدث معايير تصميم المنصات التعليمية (Modern Education / SaaS Aesthetic).

---

## 📖 نظرة عامة على المشروع (Project Overview)

منصة **سراج** هي بيئة تعليمية تفاعلية مخصصة للطلاب والمعلمين، تربط المحتوى التعليمي بالموسوعة العمانية وتدعم مسابقات البحث العلمي والابتكار وتعزيز الهوية الوطنية والتحديات الفكرية، مع توفير لوحة تحكم متقدمة لإدارة الأنشطة والتقييم.

المنصة مبنية بـ **HTML + Vanilla CSS + Vanilla JavaScript** بالكامل (بدون أي فريمورك) مع **Supabase** خلفيةً لقاعدة البيانات والمصادقة والتخزين. تدعم المنصة نوعين من المستخدمين: **الطلاب المسجلون** و**الزوار (Guests)** الذين يمكنهم المشاركة دون إنشاء حساب.

---

## ✨ أبرز الميزات الفعلية

- 🔐 **نظام مصادقة كامل** – تسجيل دخول بالبريد أو اسم المستخدم أو Google OAuth، واسترداد كلمة المرور
- 👤 **دعم الزوار (Guest Mode)** – المشاركة في المسابقات وتحديات القراءة والأبحاث دون حساب
- 🏆 **مسابقات السراج** – مسابقات بمؤقت زمني وأسئلة متعددة الأنواع وتتبع النتائج
- 📚 **تحديات القراءة (طوّر نفسك)** – مستويات قرائية متدرجة مع أسئلة اختبار وتقدم قابل للمزامنة
- 🔬 **إدارة الأبحاث العلمية** – تقديم ومراجعة الأبحاث مع نظام تحكيم شامل للمعلمين
- 🎓 **لوحة تحكم الطالب** – إحصائيات شخصية وبادجات إنجاز وسجل نشاط متكامل
- 📊 **لوحة تحكم المعلم** – 12 وحدة إدارية شاملة لجميع جوانب المنصة
- 📑 **نظام التقارير المتقدم** – تقارير حية مع Chart.js وتصدير PDF/CSV
- 🌓 **دعم الوضع الفاتح والداكن** – مع حفظ التفضيلات ومنع الوميض
- 💠 **مكوّن DotGrid تفاعلي** – شبكة نقاط متحركة مبنية بـ Canvas خالص

---

## 🛠️ التقنيات والمكتبات المستخدمة

| الفئة | التقنية |
|---|---|
| الواجهة الأمامية | HTML5, Vanilla CSS, Vanilla JavaScript (ES Modules) |
| قاعدة البيانات والمصادقة | Supabase (PostgreSQL + Auth + Storage) |
| SDK الخارجي | `@supabase/supabase-js` (via CDN jsDelivr ESM) |
| المخططات البيانية | Chart.js (في صفحة التقارير) |
| الخطوط | Cairo (Google Fonts) |
| لا يوجد | أي فريمورك JS (لا React, لا Vue, لا Angular) |
| لا يوجد | Tailwind CSS أو أي مكتبة CSS خارجية |

---

## 📁 هيكل المشروع الكامل

```text
siraj-abuobaida/
│
├── index.html                    # الصفحة الرئيسية (نبذة عن المنصة وأهدافها)
├── login.html                    # تسجيل الدخول (بريد/اسم مستخدم/Google)
├── signup.html                   # إنشاء حساب جديد
├── forgot-password.html          # طلب استعادة كلمة المرور
├── reset-password.html           # تعيين كلمة مرور جديدة
├── complete-profile.html         # إكمال الملف الشخصي (الصف والشعبة)
├── dashboard.html                # لوحة تحكم الطالب
├── develop.html                  # صفحة "طوّر نفسك" — تحديات القراءة
├── competition.html              # مسابقة السراج
├── research.html                 # تقديم الأبحاث العلمية
├── identity.html                 # مسارات تعزيز الهوية الوطنية والتراث
├── page.html                     # صفحة عرض المحتوى التعليمي الديناميكي
│
├── teacher-dashboard.html        # لوحة تحكم المعلم – الإحصائيات العامة
├── teacher-competitions.html     # إدارة المسابقات
├── teacher-reading.html          # إدارة تحديات القراءة
├── teacher-challenges.html       # (مدمج مع صفحة القراءة)
├── teacher-questions.html        # بنك الأسئلة المركزي
├── teacher-research.html         # مراجعة وتحكيم الأبحاث
├── teacher-reports.html          # إنشاء التقارير والتحليلات
├── teacher-participants.html     # سجل جميع المشاركين
├── teacher-users.html            # إدارة المستخدمين والطلاب
├── teacher-classes.html          # إدارة الشعب الدراسية
├── teacher-content.html          # الصفحات التعليمية (CMS)
├── teacher-media.html            # إدارة الملفات والوسائط
├── teacher-profile.html          # الملف الشخصي للمعلم
├── teacher-analytics.html        # التحليلات الأكاديمية وتصدير CSV
│
├── check-teacher-permissions.html  # أداة تشخيص صلاحيات المعلم
├── test-identity-fix.html          # صفحة اختبار نظام الهوية
├── test-transitions.html           # صفحة اختبار انتقالات الصفحات
│
├── src/
│   ├── assets/
│   │   └── images/               # شعارات المنصة (logo.svg, logo-mark.svg, ...)
│   │
│   ├── scripts/
│   │   ├── main.js               # نقطة الدخول: قائمة الجوال + Scroll Reveal
│   │   ├── theme.js              # ThemeManager: Light/Dark Mode
│   │   ├── page-transitions.js   # انتقالات الصفحات الانسيابية
│   │   ├── dotgrid.js            # مكوّن DotGrid التفاعلي بـ Canvas
│   │   ├── footer.js             # الفوتر العام
│   │   ├── page.js               # صفحة عرض المحتوى الديناميكي
│   │   ├── identity.js           # صفحة تعزيز الهوية الوطنية
│   │   ├── research.js           # صفحة تقديم الأبحاث (الطالب)
│   │   ├── competition.js        # صفحة مسابقة السراج (الطالب)
│   │   ├── develop.js            # صفحة تحديات القراءة (الطالب)
│   │   ├── student-dashboard.js  # لوحة تحكم الطالب
│   │   │
│   │   ├── teacher-nav.js            # الوحدة الأساسية المشتركة لجميع صفحات المعلم
│   │   ├── teacher-dashboard.js      # إحصائيات لوحة تحكم المعلم
│   │   ├── teacher-competitions.js   # إدارة المسابقات
│   │   ├── teacher-competitions-page.js  # نقطة تهيئة الصفحة
│   │   ├── teacher-challenges.js     # إدارة تحديات القراءة
│   │   ├── teacher-questions.js      # بنك الأسئلة المركزي
│   │   ├── teacher-research.js       # مراجعة وتحكيم الأبحاث
│   │   ├── teacher-reports.js        # التقارير والتحليلات (Chart.js)
│   │   ├── teacher-participants.js   # سجل المشاركين الموحد
│   │   ├── teacher-users.js          # إدارة المستخدمين والأدوار
│   │   ├── teacher-classes.js        # إدارة الشعب الدراسية
│   │   ├── teacher-content.js        # إدارة الصفحات التعليمية
│   │   ├── teacher-media.js          # إدارة التخزين والوسائط
│   │   ├── teacher-profile.js        # الملف الشخصي للمعلم
│   │   ├── teacher-sections.js       # مساعد إدارة الأقسام
│   │   ├── teacher-analytics.js      # التحليلات الأكاديمية وCSV
│   │   └── teacher-reading.js        # (وحدة القراءة)
│   │
│   ├── services/
│   │   ├── supabase.js           # تهيئة Supabase Client (ESM CDN)
│   │   ├── auth.js               # AuthService: تسجيل دخول/خروج/إدارة جلسة
│   │   └── school-classes.js     # خدمة جلب بيانات الشعب الدراسية
│   │
│   ├── styles/
│   │   ├── variables.css         # متغيرات التصميم: الألوان، المقاسات، الظلال
│   │   ├── global.css            # تنسيقات عامة وخط Cairo
│   │   ├── layout.css            # أنظمة التخطيط (Grid/Flex)
│   │   ├── components.css        # مكونات: أزرار، بطاقات، هيدر، فوتر، مدخلات
│   │   ├── dotgrid.css           # نمط DotGrid التفاعلي
│   │   ├── page-transitions.css  # انتقالات الصفحات
│   │   ├── student-dashboard.css # تنسيقات لوحة تحكم الطالب
│   │   ├── teacher-dashboard.css # تنسيقات لوحة تحكم المعلم
│   │   ├── teacher-reports.css   # تنسيقات صفحة التقارير
│   │   └── footer.css            # تنسيقات الفوتر
│   │
│   └── utils/
│       ├── toast.js              # نظام إشعارات Toast
│       ├── guest.js              # إدارة جلسات الزوار (localStorage)
│       ├── student-identity.js   # نظام الهوية الموحد (مسجل + زائر)
│       ├── progress-sync.js      # مزامنة التقدم بين localStorage وSupabase
│       └── question-picker.js    # مكوّن اختيار الأسئلة من البنك
│
└── supabase/
    └── migrations/               # 14 migration منظمة تاريخيًا
        ├── 01_initial_schema.sql
        ├── 02_update_profile_trigger.sql
        ├── 03_security_patch_roles.sql
        ├── 04_competitions_enhancements.sql
        ├── 05_participants_system.sql
        ├── 06_unified_identity_and_tracks.sql
        ├── 07_seed_fictional_data.sql
        ├── 08_challenge_statuses.sql
        ├── 09_teacher_admin_rls.sql
        ├── 10_school_classes_enhancements.sql
        ├── 11_delete_user_by_teacher_rpc.sql
        ├── 12_add_username_column.sql
        ├── 13_get_email_by_username_rpc.sql
        └── 14_allow_teacher_role_update.sql
```

---

## 🗄️ قاعدة البيانات (Database Schema)

قاعدة البيانات مبنية على **PostgreSQL** عبر Supabase مع تفعيل **Row Level Security (RLS)** على جميع الجداول.

### الجداول الرئيسية

| الجدول | الوصف |
|---|---|
| `profiles` | ملفات المستخدمين (الطلاب والمعلمون) مرتبطة بـ `auth.users` |
| `questions` | بنك الأسئلة المركزي القابل لإعادة الاستخدام |
| `challenges` | تحديات "طوّر نفسك" (برنامج القراءة) |
| `challenge_levels` | مستويات كل تحدي قرائي |
| `challenge_questions` | ربط الأسئلة بمستويات التحديات |
| `challenge_categories` | تصنيفات التحديات (نحو، فهم، إبداع، تراث عماني) |
| `student_progress` | تقدم الطالب في كل مستوى قرائي |
| `competitions` | مسابقات السراج المؤقتة |
| `competition_questions` | ربط الأسئلة بالمسابقات |
| `competition_attempts` | محاولات الطلاب والزوار في المسابقات |
| `attempt_answers` | إجابات كل محاولة |
| `competition_leaderboard` | لوحة صدارة المسابقات المحسوبة |
| `research_submissions` | تقديمات الأبحاث العلمية |
| `research_evaluations` | تقييمات الأبحاث من قبل المعلمين |
| `content_pages` | الصفحات التعليمية المنشورة (CMS) |
| `school_sections` | إدارة الشعب الدراسية لمدرسة أبو عبيدة |

### العمود الرئيسي لجدول `profiles`

| العمود | النوع | الوصف |
|---|---|---|
| `id` | UUID | مرتبط بـ `auth.users` |
| `full_name` | TEXT | الاسم الكامل |
| `username` | TEXT | اسم مستخدم اختياري للدخول |
| `email` | TEXT | البريد الإلكتروني |
| `grade` | TEXT | الصف الدراسي |
| `section` | TEXT | الشعبة |
| `role` | TEXT | `student` أو `teacher` |
| `school_type` | TEXT | `abu_obaida` أو `other` |
| `school_name` | TEXT | اسم المدرسة |

### أنواع الأسئلة المدعومة في `questions`

| النوع | الوصف |
|---|---|
| `mcq` | اختيار من متعدد |
| `tf` | صح أو خطأ |
| `multi` | اختيار متعدد |
| `order` | ترتيب تسلسلي |
| `match` | مطابقة وتوصيل |

### Views (مشاهد مجمعة)

| المشهد | الوصف |
|---|---|
| `all_participants_view` | مشهد موحد يجمع المشاركين من المسابقات والقراءة والأبحاث (للمعلمين فقط) |

### الدوال (Stored Procedures / RPCs)

| الدالة | الوصف |
|---|---|
| `get_user_role()` | استرداد دور المستخدم الحالي |
| `handle_new_user()` | Trigger: إنشاء ملف شخصي تلقائياً عند التسجيل |
| `set_updated_at()` | Trigger: تحديث `updated_at` عند تعديل السجل |
| `get_email_by_username(p_username)` | البحث عن البريد الإلكتروني بواسطة اسم المستخدم |
| `delete_user_by_teacher(target_user_id)` | حذف حساب طالب بواسطة معلم (مع حماية متعددة) |
| `update_user_role(target_user_id, new_role)` | تعديل دور المستخدم بواسطة المعلم |
| `restrict_role_update()` | Trigger: منع تعديل الأدوار إلا من قبل المعلمين |

### علاقات الجداول الرئيسية

```
auth.users ──── profiles (1:1, CASCADE DELETE)
profiles ──┬── student_progress (1:N)
           ├── competition_attempts (1:N)
           ├── research_submissions (1:N)
           ├── research_evaluations (1:N)
           └── content_pages (1:N, author_id)

challenges ──── challenge_levels (1:N, CASCADE DELETE)
                ├── challenge_questions (N:M ←→ questions)
                └── student_progress (1:N)

competitions ──── competition_questions (N:M ←→ questions)
                  ├── competition_attempts (1:N)
                  │   └── attempt_answers (1:N)
                  └── competition_leaderboard (1:N)

research_submissions ──── research_evaluations (1:1)
school_sections (مستقلة، تُحدد قيم grade وsection في profiles)
challenge_categories ──── challenges (1:N, SET NULL)
```

### Storage Buckets

| الـ Bucket | الوصف | الوصول |
|---|---|---|
| `public_assets` | صور الشعارات والتغطيات | عام للقراءة، المعلمون فقط للرفع |
| `research_files` | ملفات الأبحاث المرفوعة | الطلاب لملفاتهم الخاصة، المعلمون لكل الملفات |

---

## 🔐 المصادقة والأدوار والصلاحيات

### طرق تسجيل الدخول

1. **بريد إلكتروني + كلمة مرور** (الطريقة الأساسية)
2. **اسم مستخدم** – يُحوَّل تلقائياً إلى البريد عبر `get_email_by_username()` RPC
3. **Google OAuth** – التوجيه يعود إلى `dashboard.html`
4. **استرداد كلمة المرور** – عبر رابط يُرسل للبريد الإلكتروني

### الأدوار (Roles)

| الدور | الوصف | الصلاحيات |
|---|---|---|
| `student` | الطالب المسجل | قراءة/تعديل ملفه الشخصي، المشاركة في الأنشطة، عرض تقدمه الخاص |
| `teacher` | المعلم | إدارة كاملة لجميع البيانات، لوحة تحكم المعلم، تقارير، حذف الحسابات |
| زائر (Guest) | بدون تسجيل | المشاركة في المسابقات والقراءة وتقديم الأبحاث بجلسة مؤقتة في localStorage |

### Row Level Security (RLS)

كل جدول محمي بـ RLS. المبدأ العام:
- الطلاب يرون ويعدلون بياناتهم الخاصة فقط
- المعلمون يملكون صلاحيات كاملة على جميع البيانات
- الزوار يمكنهم الإدراج فقط (بدون `student_id`)
- الصفحات والتحديات المنشورة مرئية للجميع

### حماية صفحات المعلم

جميع صفحات المعلم تستدعي `initTeacherAdmin()` التي:
1. تتحقق من وجود جلسة صالحة
2. تتحقق من أن `profile.role === 'teacher'`
3. تُعيد التوجيه إلى `login.html` عند الفشل

### حماية إضافية في قاعدة البيانات

- `delete_user_by_teacher`: لا يمكن حذف معلم آخر، ولا الحساب الشخصي، ولا مستخدم له صفحات محتوى مرتبطة
- `update_user_role`: لا يمكن للمعلم إلغاء صلاحيته عن نفسه
- `restrict_role_update` trigger: يمنع تعديل الأدوار من خارج المسار الرسمي

---

## 📄 الصفحات والوحدات الوظيفية

### صفحات الطالب / العام

| الصفحة | الوصف | الوحدة البرمجية |
|---|---|---|
| `index.html` | الصفحة الرئيسية التسويقية | `main.js` |
| `login.html` | تسجيل الدخول | مدمج في الصفحة |
| `signup.html` | إنشاء حساب | مدمج في الصفحة |
| `forgot-password.html` | استعادة كلمة المرور | مدمج |
| `reset-password.html` | تعيين كلمة مرور جديدة | مدمج |
| `complete-profile.html` | إكمال الملف الشخصي بعد التسجيل | مدمج |
| `dashboard.html` | لوحة تحكم الطالب | `student-dashboard.js` |
| `develop.html` | تحديات القراءة "طوّر نفسك" | `develop.js` |
| `competition.html` | مسابقة السراج | `competition.js` |
| `research.html` | تقديم الأبحاث العلمية | `research.js` |
| `identity.html` | تعزيز الهوية الوطنية والتراث | `identity.js` |
| `page.html` | عرض محتوى تعليمي ديناميكي | `page.js` |

### صفحات المعلم (Admin Panel)

| الصفحة | الوصف | الوحدة البرمجية |
|---|---|---|
| `teacher-dashboard.html` | إحصائيات عامة لجميع الأنشطة | `teacher-dashboard.js` |
| `teacher-competitions.html` | إنشاء/تعديل/حذف المسابقات والأسئلة | `teacher-competitions.js` |
| `teacher-reading.html` | إدارة تحديات القراءة ومستوياتها | `teacher-challenges.js` |
| `teacher-questions.html` | بنك الأسئلة المركزي (CRUD كامل) | `teacher-questions.js` |
| `teacher-research.html` | مراجعة الأبحاث وتحكيمها بمعايير تقييم | `teacher-research.js` |
| `teacher-reports.html` | تقارير حية مع رسوم بيانية وتصدير | `teacher-reports.js` |
| `teacher-participants.html` | سجل جميع المشاركين من مصادر متعددة | `teacher-participants.js` |
| `teacher-users.html` | إدارة المستخدمين: تعديل، رفع دور، حذف | `teacher-users.js` |
| `teacher-classes.html` | إدارة الشعب الدراسية ونقل الطلاب | `teacher-classes.js` |
| `teacher-content.html` | إنشاء وتعديل الصفحات التعليمية (CMS) | `teacher-content.js` |
| `teacher-media.html` | تصفح/رفع/حذف الملفات في Storage | `teacher-media.js` |
| `teacher-profile.html` | عرض وتعديل الملف الشخصي للمعلم | `teacher-profile.js` |
| `teacher-analytics.html` | تحليلات أكاديمية وتصدير CSV | `teacher-analytics.js` |

---

## 🔧 الوحدات والخدمات الأساسية

### `src/services/auth.js` — AuthService

يوفر الدوال التالية:
- `signup(email, password, userData)` – تسجيل مستخدم جديد مع metadata
- `login(identifier, password)` – دخول بالبريد أو اسم المستخدم
- `loginWithGoogle()` – OAuth عبر Google
- `sendPasswordResetEmail(email)` – إرسال رابط الاسترداد
- `updatePassword(newPassword)` – تحديث كلمة المرور
- `logout()` – مسح الجلسة من كل المصادر
- `checkProfileCompletion()` – التحقق من اكتمال الملف الشخصي
- `requireCompleteProfile()` – Middleware للتوجيه إلى `complete-profile.html`

### `src/utils/student-identity.js` — نظام الهوية الموحد

يدعم الطلاب المسجلين والزوار معاً بـ 3 مستويات تخزين: ذاكرة → localStorage → Supabase. يعرض modal لإدخال البيانات فقط عند الحاجة (زوار، ملفات ناقصة، أو طلب صريح).

### `src/utils/progress-sync.js` — مزامنة التقدم

يحل التعارض بين التقدم المحلي (localStorage) والتقدم في قاعدة البيانات عند تسجيل الدخول، مع عرض modal اختيار للطالب.

### `src/utils/question-picker.js` — منتقي الأسئلة

Modal يتيح للمعلم تصفح بنك الأسئلة وإضافة أسئلة مباشرة إلى أي مسابقة أو تحدي قرائي.

### `src/utils/toast.js` — إشعارات Toast

نظام إشعارات خفيف بأنواع: success / error / warning / info.

### `src/scripts/teacher-nav.js` — وحدة المعلم المشتركة

- `initTeacherAdmin(activePageKey)` – تهيئة كاملة لكل صفحة معلم
- `checkTeacherAccess()` – التحقق من الصلاحيات
- `renderSidebar(activePageKey)` – بناء شريط التنقل الجانبي
- `showConfirmModal(...)` – نافذة تأكيد قابلة لإعادة الاستخدام
- `renderPagination(...)` – مكوّن الترقيم
- `escapeHtml(str)` – حماية XSS
- `formatDate(dateStr)` – تنسيق التواريخ
- `debounce(fn, delay)` – تقليل تكرار استدعاء الدوال

### `src/scripts/teacher-reports.js` — التقارير والتحليلات

- فلترة بيانات حية بفترات زمنية (7 أيام / 30 يوم / 90 يوم / كل الوقت)
- فلترة بالنشاط (مسابقات / قراءة / أبحاث) وبالصف والشعبة
- 4 مخططات بيانية (Chart.js): timeline، donut، bar مقارنة، grades
- أفضل 10 طلاب وأفضل 3 شعب
- تصدير PDF (طباعة متخصصة) وCSV
- سجل تدقيق مع بحث وترقيم

---

## 🎨 نظام التصميم (Design System)

### 1. لوحة الألوان

| المتغير | القيمة (فاتح / داكن) | الاستخدام |
|---|---|---|
| `--color-primary` | `#127547` / `#10b981` | الأزرار، الروابط النشطة |
| `--color-primary-light` | `#1b8e57` | حالات Hover |
| `--color-primary-dark` | `#0d5c37` | حالات Active |
| `--color-secondary` | `#4a755b` | العناصر الثانوية |
| `--color-accent` | `#c29938` | شارات الإنجاز |
| `--color-bg` | `#ffffff` / `#090b0a` | خلفية الصفحة |
| `--color-text` | `#0e1711` / `#ffffff` | النصوص |
| `--color-border` | `#e2ede5` | الحدود |

### 2. الطباعة (Typography)

- الخط الأساسي: **Cairo** (Google Fonts)
- العناوين الكبرى: `2.75rem`, وزن `700/800`
- نصوص القراءة: `16px`, `line-height: 1.7–1.8`

### 3. نظام السمات (Theme System)

مبني على `ThemeManager` في `src/scripts/theme.js`:
- **كشف التفضيل التلقائي** عبر `prefers-color-scheme`
- **الحفظ الدائم** في `localStorage` بمفتاح `siraj-theme`
- **منع الوميض** عبر script فوري في `<head>` كل صفحة
- **انتقال ناعم** بإضافة كلاس `.theme-transitioning` مؤقتاً

### 4. DotGrid — شبكة النقاط التفاعلية

مكوّن Canvas خالص في `src/scripts/dotgrid.js`:
- **تفاعل الاقتراب**: تغيير لون النقاط تدريجياً عند اقتراب المؤشر
- **قصور ذاتي**: اهتزاز النقاط عند التحريك السريع مع إرجاع مرن (Elastic Spring Physics)
- **موجة الصدمة (Click Ripple)**: موجة دائرية عند النقر
- يعمل بـ 60 FPS مع `pointer-events: none` لضمان عدم حجب التفاعلات

---

## ⚙️ متطلبات التشغيل

### متطلبات البيئة

المشروع **لا يتطلب أي بناء (build) أو تثبيت حزم** محلياً. يكفي:

1. **خادم ويب محلي** (لأن الملفات تستخدم ES Modules)
2. **مشروع Supabase** فعّال مع تطبيق الـ migrations
3. **(اختياري)** Google OAuth مُفعَّل في إعدادات Supabase

> ⚠️ **لا تفتح الملفات مباشرة بـ `file://`** في المتصفح — OAuth لن يعمل وقد تحدث مشاكل في ES Modules.

### تشغيل المشروع محلياً

```bash
# الخيار 1: VS Code Live Server
# ثبّت امتداد "Live Server" وانقر "Go Live"

# الخيار 2: Python
python -m http.server 3000

# الخيار 3: npx serve
npx serve .

# الخيار 4: npx http-server
npx http-server . -p 3000
```

---

## 🗂️ متغيرات البيئة والإعداد

المشروع لا يستخدم ملف `.env` — بدلاً من ذلك، يتم تعريف مفاتيح Supabase مباشرة في `src/services/supabase.js`:

```javascript
const SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
const SUPABASE_KEY = '<your-anon-public-key>';
```

> 🔒 **ملاحظة أمان**: `SUPABASE_KEY` هو مفتاح `anon` العام — مقصود أن يكون مرئياً. الحماية الحقيقية تأتي من RLS في قاعدة البيانات. **لا تضع مفتاح `service_role` في كود العميل أبداً.**

### تفعيل Google OAuth (اختياري)

في لوحة تحكم Supabase:
1. `Authentication` → `Providers` → `Google`
2. أضف `Client ID` و`Client Secret` من Google Cloud Console
3. أضف `https://<your-domain>/dashboard.html` في Redirect URLs

---

## 🚀 تطبيق Migrations قاعدة البيانات

```bash
# عبر Supabase CLI (مُوصى به)
supabase login
supabase link --project-ref <your-project-ref>
supabase db push

# أو تطبيق يدوي عبر SQL Editor في لوحة Supabase
# طبّق كل ملف بالترتيب: 01 → 02 → 03 → ... → 14
```

---

## 🧪 الاختبارات

### صفحات الاختبار المدمجة

| الملف | الغرض |
|---|---|
| `test-identity-fix.html` | اختبار نظام التعرف على هوية الطالب |
| `test-transitions.html` | اختبار انتقالات الصفحات |
| `check-teacher-permissions.html` | تشخيص صلاحيات المعلم في RLS |

### ملفات التوثيق الداخلي

| الملف | المحتوى |
|---|---|
| `AUTH_SETUP.md` | إعداد المصادقة والبيئة |
| `TESTING_GUIDE.md` | دليل اختبار الوظائف |
| `TEST_SCENARIOS.md` | سيناريوهات اختبار تفصيلية |
| `STUDENT_DASHBOARD_AUDIT.md` | مراجعة لوحة تحكم الطالب |
| `CHANGELOG_TRANSITIONS.md` | سجل تغييرات انتقالات الصفحات |

---

## ⚠️ القيود والملاحظات الحالية

1. **لا بناء (Build)**: المشروع بدون bundler — الملفات تُحمَّل مباشرة في المتصفح عبر ES Modules.
2. **مفاتيح Supabase مدمجة في الكود**: المفتاح `anon` العام مرئي — الأمان يعتمد كلياً على RLS.
3. **لا اختبارات آلية**: لا توجد مجموعة Unit/Integration Tests مؤتمتة حتى الآن.
4. **صفحة `teacher-reading.html`**: الوحدة `teacher-reading.js` مجردة حالياً — الوظائف الفعلية في `teacher-challenges.js`.
5. **بيانات تجريبية**: `07_seed_fictional_data.sql` فارغة — لا توجد بيانات seed رسمية جاهزة.
6. **دعم الجوال**: الواجهة متجاوبة لكن بعض جداول لوحة المعلم قد لا تعمل بشكل مثالي على الشاشات الصغيرة جداً.
7. **تكامل Supabase CDN**: المشروع يستخدم CDN مباشرة، مما يعني اعتماداً على الشبكة الخارجية دون أي caching محلي.

---

## 🏷️ الشعار والهوية البصرية

حزمة ملفات الشعار المتوفرة في `src/assets/images/`:
- `logo.svg` — الشعار الكامل (الرمز + "السراج" + "مدرسة أبو عبيدة")
- `logo-mark.svg` — الرمز فقط (للأيقونات وشاشات الجوال)
- `logo-monochrome.svg` — النسخة أحادية اللون للطباعة الرسمية
- `siraj-logo.png` — أيقونة المتصفح (favicon)
- `logo-original.svg` — النسخة الأصلية الاحتياطية

---

**سراج – مدرسة أبو عبيدة © 2026**
