# الدليل الإرشادي: إعدادات المصادقة (Google Login & Password Reset)

يتصل موقع **سراج – مدرسة أبو عبيدة** بخدمات Supabase للتوثيق باستخدام حسابات جوجل والبريد الإلكتروني الأساسي.
يرجى اتباع الخطوات التالية من الخادم لضمان الربط الصحيح.

---

## الجزء الأول: تجهيز Google Cloud Platform (GCP)

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com).
2. قم بإنشاء مشروع جديد (New Project) أو اختر مشروعاً موجوداً.
3. افتح القائمة الجانبية واذهب إلى **APIs & Services** ثم **OAuth consent screen** (شاشة الموافقة).
4. اختر نوع التطبيق (من الأفضل جعله **External** إذا كانت المدرسة تمنح إيميلات غير تابعة لـ Google Workspace، أو **Internal** إذا كان الجميع يستخدم إيميل المدرسة الرسمي).
5. قم بتعبئة البيانات الأساسية وفي قسم "Scopes" لا تحتاج سوى للمعلومات الأساسية (email, profile, openid).
6. اذهب إلى قائمة **Credentials**.
7. اضغط على `Create Credentials` ثم اختر `OAuth client ID`.
8. حدد نوع المنصة: **Web application**.
9. في خانة **Authorized JavaScript origins**، أضف روابط موقعك (مثلاً: `http://127.0.0.1:5500` أو نطاق الموقع الفعلي لاحقاً مثل `https://siraj-school.com`).
10. في خانة **Authorized redirect URIs** أضف الرابط الخاص بتطبيقك في Supabase.

---

## الجزء الثاني: الربط داخل Supabase

1. سجل الدخول إلى [Supabase Dashboard](https://supabase.com/dashboard) وافتح مشروع `siraj-abuobaida`.
2. اذهب إلى قسم **Authentication** من القائمة اليسرى، ثم اختر **Providers**.
3. ابحث عن **Google** وضع قيمة الـ **Client ID** والـ **Client Secret**.

---

## الجزء الثالث: روابط إعادة التوجيه (Site URL & Redirect URLs)

حتى لا يقوم Supabase بحظر محاولات وتسجيل الدخول واستعادة كلمات المرور بحجة أن الموقع "غير آمن":

1. داخل Supabase، اذهب إلى قسم **Authentication** > **URL Configuration**.
2. في حقل **Site URL**، ضع الرابط الأساسي (مثلاً `http://127.0.0.1:5500` أو عنوان الإنترنت الحقيقي).
3. في حقل **Redirect URLs**، أضف الروابط المهمة:
   - `http://127.0.0.1:5500/dashboard.html` (لعودة Google Login)
   - `http://127.0.0.1:5500/reset-password.html` (لعودة Password Reset)

---

## الجزء الرابع: إعدادات قوالب الإيميل (Email Templates)

1. من نافذة **Authentication** اختر **Email Templates**.
2. راجع قالب **Reset Password**.
3. تأكد أن الرابط للموقع يستخدم المتغير الآمن `{{ .ConfirmationURL }}` وهو ما سيفوم بتوجيه الطالب لصفحة `reset-password.html` حاملاً رمز الأمان.

**ملاحظة أمنية مدمجة:** كافة الـ Triggers وحلول الـ RLS ضمن الجداول جاهزة لصد أية محاولات اختراق أو تغيير للأدوار (Roles) بقوة خلفية مباشرة.
