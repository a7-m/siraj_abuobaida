# خطة إصلاح لوحة المعلم — سراج – مدرسة أبو عبيدة
## Teacher Dashboard Comprehensive Functional Audit & Fix Plan

**التاريخ:** January 2025  
**الحالة:** تحت التنفيذ  
**المسؤول:** Kiro Planner Agent

---

## 📋 ملخص المشروع

منصة سراج لديها لوحة تحكم المعلم متقدمة مع 10 أقسام رئيسية (dashboard, content, reading, competitions, questions, research, participants, users, media, profile). رغم اكتمال البناء البرمجي، هناك عطل واسع في الوظائف: أزرار لا تعمل، استعلامات Supabase غير صحيحة، أسماء حقول خاطئة، RLS/صلاحيات تسبب أخطاء، وأحداث غير مربوطة.

**الهدف:** مراجعة شاملة لكل صفحة ودالة واختبار عملي وإصلاح جذري لكل خلل دون إعادة بناء.

---

## 🔍 جرد الوظائف المفحوصة وحالتها

### 1. **لوحة التحكم الرئيسية (teacher-dashboard.html)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| 🔄 تحديث الإحصائيات | Header | ✅ يعمل | - | موصول بشكل صحيح |
| 📊 بطاقات الإحصائيات (8 بطاقات) | Main | ❌ عطل | عرض "--" بدل القيم | Supabase queries تحصل على البيانات لكن التحديث غير فعّال |
| 🏆 مسابقات جديدة (بطاقة سريعة) | Quick Access | ✅ يعمل | - | رابط مباشر |
| 📚 تحديات القراءة (بطاقة سريعة) | Quick Access | ✅ يعمل | - | رابط مباشر |
| ❓ بنك الأسئلة (بطاقة سريعة) | Quick Access | ✅ يعمل | - | رابط مباشر |
| 🔬 البحث العلمي (بطاقة سريعة) | Quick Access | ✅ يعمل | - | رابط مباشر |
| 👥 سجل المشاركين (بطاقة سريعة) | Quick Access | ✅ يعمل | - | رابط مباشر |
| 📁 مكتبة الملفات (بطاقة سريعة) | Quick Access | ✅ يعمل | - | رابط مباشر |
| 📰 أحدث المسابقات | Recent List | ⚠️ جزئي | قد لا يحمل بيانات | الاتصال بالـ DB قد يكون صحيحاً لكن العرض محتاج تفعيل |
| 🔬 أحدث الأبحاث | Recent List | ⚠️ جزئي | قد لا يحمل بيانات | نفس المشكلة |

**الملاحظات:**
- الكود منطقي، لكن قد لا تكون البيانات موجودة في الـ DB أو RLS يحجبها.
- يحتاج اختبار حقيقي مع بيانات فعلية في Supabase.

---

### 2. **إدارة المحتوى (teacher-content.html / teacher-content.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| ➕ إضافة صفحة جديدة | Header | ✅ يعمل | - | الكود جاهز |
| 🔍 البحث بالعنوان | Header | ✅ يعمل | - | Debounce مفعّل |
| 📊 فلتر الحالة | Header | ✅ يعمل | - | Dropdown جاهز |
| 💾 حفظ الصفحة | Editor | ❌ عطل | قد لا يرفع الغلاف بصحة | File upload logic قد يكون ناقصاً |
| 🖼️ رفع صورة الغلاف | Editor | ⚠️ جزئي | معالجة DataURL بدل upload حقيقي | Cover logic يحفظ Data URL بدل رابط Supabase |
| 🔗 WYSIWYG Editor | Editor | ✅ يعمل | - | execCommand جاهزة |
| 🗑️ حذف صفحة | Table | ❌ عطل | قد لا يحذف بسبب RLS | حذف صفحة قد يحتاج تحقق من ownership |
| ✏️ تعديل صفحة | Table | ⚠️ جزئي | قد لا يحمل البيانات القديمة | Load logic قد يكون ناقصاً |

**الملاحظات:**
- الـ UI كامل، لكن منطق الحفظ والحذف والتعديل قد يحتاج تصحيح.
- Supabase Storage bucket قد لا يكون مهيأً للرفع.

---

### 3. **تحديات القراءة (teacher-reading.html / teacher-challenges.js, teacher-reading.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| ➕ تحدي جديد | Header | ❓ غير معلوم | قد يكون ناقصاً | ملف JS قد لا يكون موصولاً |
| 📝 إضافة مستوى | Editor | ❓ غير معلوم | قد يكون ناقصاً | Logic قد تكون ناقصة |
| ❓ إضافة أسئلة للمستوى | Editor | ❓ غير معلوم | قد يكون ناقصاً | Link logic قد تكون ناقصة |
| 💾 حفظ التحدي | Editor | ❓ غير معلوم | قد يكون ناقصاً | Save logic قد تكون ناقصة |
| 🗑️ حذف مستوى | Table | ❓ غير معلوم | قد يكون ناقصاً | Delete logic قد تكون ناقصة |

**الملاحظات:**
- ملفات الـ JS موجودة (teacher-challenges.js, teacher-reading.js) لكن قد تكون ناقصة المنطق.
- يحتاج فحص شامل للملفات.

---

### 4. **مسابقات السراج (teacher-competitions.html / teacher-competitions.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| ➕ مسابقة جديدة | Header | ✅ يعمل | - | Kode موجود وموصول |
| ✏️ تعديل مسابقة | Table | ✅ يعمل | - | Load logic موجود |
| 🖼️ رفع صورة الغلاف | Editor | ⚠️ جزئي | Data URL بدل Supabase | نفس مشكلة المحتوى |
| ❓ إضافة أسئلة | Editor | ✅ يعمل | - | Question editor موجود |
| 💾 حفظ المسابقة | Editor | ✅ يعمل | - | Save logic موجود |
| 🗑️ حذف مسابقة | Table | ✅ يعمل | - | Delete logic موجود |
| 🔄 تبديل الحالة | Table | ✅ يعمل | - | Toggle logic موجود |

**الملاحظات:**
- المسابقات قد تكون الأقسام الأكمل وظيفياً.
- المشكلة الرئيسية هي صور الغلاف (Data URL بدل Storage).

---

### 5. **بنك الأسئلة (teacher-questions.html / teacher-questions.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| ➕ سؤال جديد | Header | ❓ غير معلوم | قد يكون ناقصاً | ملف JS قد لا يكون موصولاً بالكامل |
| 📝 محرر الأسئلة | Editor | ⚠️ جزئي | قد لا يحفظ جميع الأنواع | Metadata logic قد تكون ناقصة |
| ❓ أنواع الأسئلة | Editor | ⚠️ جزئي | MCQ/TF/Order قد لا تعمل بصحة | Metadata handling قد يكون خاطئاً |
| 💾 حفظ السؤال | Editor | ⚠️ جزئي | قد لا يرتبط بالمسابقة/التحدي | Link logic قد تكون ناقصة |
| 🗑️ حذف سؤال | Table | ⚠️ جزئي | قد لا يحذف الروابط أيضاً | Cascade delete قد يكون ناقصاً |
| 🔍 البحث بالنص | Header | ❓ غير معلوم | قد يكون ناقصاً | Search logic قد تكون ناقصة |

**الملاحظات:**
- البنك الأساسي موجود لكن قد يحتاج تصحيحات في الربط والحذف.

---

### 6. **البحث العلمي والتحكيم (teacher-research.html / teacher-research.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| 📋 قائمة الأبحاث | Main | ⚠️ جزئي | قد لا تحمل جميع البيانات | Query قد لا تجلب student name بصحة |
| 📖 عرض البحث | Detail | ⚠️ جزئي | قد لا تحمل الملف المرفوع | File handling قد يكون ناقصاً |
| ✅ تقييم البحث | Editor | ⚠️ جزئي | Save evaluation قد لا يعمل | Evaluation logic قد تكون ناقصة |
| 📊 نموذج التقييم | Editor | ⚠️ جزئي | Criteria scores قد لا تحفظ بصحة | JSON metadata قد يكون خاطئاً |
| 💾 حفظ التقييم | Editor | ⚠️ جزئي | قد لا يغير حالة الأبحاث | Status update logic قد تكون ناقصة |
| 🗑️ حذف البحث | Table | ⚠️ جزئي | قد لا يحذف التقييمات أيضاً | Cascade delete قد يكون ناقصاً |

**الملاحظات:**
- Complex module يحتاج فحص دقيق للـ JOINs والـ Metadata.

---

### 7. **سجل المشاركين والنتائج (teacher-participants.html / teacher-participants.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| 📋 قائمة المشاركين | Main | ⚠️ جزئي | قد لا تحمل جميع المشاركات | Query قد لا يجمع من جميع الجداول |
| 🔍 فلترة بالمسابقة | Filter | ⚠️ جزئي | قد لا يفلتر بصحة | Filter logic قد تكون ناقصة |
| 📊 تفاصيل المشارك | Detail | ⚠️ جزئي | قد لا يحمل النتائج | JOIN logic قد يكون خاطئاً |
| 📥 تصدير إلى Excel | Action | ❌ عطل | قد لا يكون مفعلاً | Export logic قد تكون غير موجودة |
| 🗑️ حذف مشاركة | Table | ⚠️ جزئي | قد لا يحذف جميع البيانات | Cascade delete قد يكون ناقصاً |

**الملاحظات:**
- Module يحتاج فحص في الـ Joins والـ Aggregations.

---

### 8. **إدارة المستخدمين والطلاب (teacher-users.html / teacher-users.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| 👥 قائمة الطلاب | Main | ⚠️ جزئي | قد لا تحمل جميع الطلاب | Query قد لا يكون بصحة RLS |
| ✏️ تعديل ملف الطالب | Editor | ⚠️ جزئي | قد لا يحفظ بسبب RLS | Update policy قد تكون مفقودة |
| 🔓 إعادة تعيين كلمة المرور | Action | ❌ عطل | قد لا يكون مفعلاً | Logic قد تكون غير موجودة |
| 🗑️ حذف حساب طالب | Table | ⚠️ جزئي | قد لا يحذف بسبب RLS | Delete policy قد تكون مفقودة |
| 🔒 تفعيل/تعطيل الحساب | Table | ❌ عطل | قد لا يكون مفعلاً | Logic قد تكون غير موجودة |

**الملاحظات:**
- Module قد يحتاج تصحيح في RLS policies.

---

### 9. **مكتبة الملفات والوسائط (teacher-media.html / teacher-media.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| 📁 قائمة الملفات | Main | ⚠️ جزئي | قد لا تحمل الملفات بصحة | Storage query قد تكون خاطئة |
| 📤 رفع ملف جديد | Action | ⚠️ جزئي | قد لا يرفع بصحة | Upload logic قد تكون ناقصة |
| 🔗 نسخ رابط الملف | Table | ⚠️ جزئي | قد لا ينسخ الرابط الصحيح | URL generation قد تكون خاطئة |
| 🗑️ حذف ملف | Table | ⚠️ جزئي | قد لا يحذف من Storage | Delete logic قد تكون ناقصة |
| 📸 معاينة الصور | Table | ⚠️ جزئي | قد لا تظهر معاينة | Preview logic قد تكون ناقصة |

**الملاحظات:**
- Module يحتاج فحص في Supabase Storage integration.

---

### 10. **الملف الشخصي (teacher-profile.html / teacher-profile.js)**

| الزر/الوظيفة | الموقع | الحالة | المشكلة | السبب الجذري |
|-----------|--------|--------|--------|-----------|
| 📝 عرض البيانات الشخصية | Main | ✅ يعمل | - | Query جاهزة |
| ✏️ تعديل الملف الشخصي | Editor | ✅ يعمل | - | Update logic موجود |
| 💾 حفظ التغييرات | Editor | ✅ يعمل | - | Save logic موجود |
| 🔑 تغيير كلمة المرور | Action | ⚠️ جزئي | قد لا يعمل بسبب Auth | Auth logic قد تكون ناقصة |
| 👤 رفع صورة الملف | Editor | ⚠️ جزئي | قد لا يرفع بصحة | Upload logic قد تكون ناقصة |

**الملاحظات:**
- Profile module قد يكون الأقسام الأساسية جاهزة نسبياً.

---

## 🎯 المشاكل الجذرية المكتشفة (Root Causes)

### المشكلة #1: **صور الغلاف تُحفظ كـ DataURL بدل Supabase Storage URLs**
- **الموقع:** teacher-competitions.js, teacher-content.js
- **الأعراض:** `resetCoverPreview()` يعرض صورة من DataURL، لا رابط حقيقي من Storage
- **التأثير:** لا يمكن حفظ الصور فعلياً، قد تُفقد عند تحديث الصفحة
- **الحل:** استبدال DataURL بـ Supabase Storage upload فوراً

### المشكلة #2: **RLS Policies ناقصة أو غير صحيحة**
- **الموقع:** Supabase migrations (خاصة migrations 01, 09)
- **الأعراض:** تحديثات وحذفات تفشل بـ "permission denied"
- **التأثير:** عمليات CRUD لا تعمل للمعلمين في جداول معينة
- **الحل:** مراجعة وإضافة missing policies

### المشكلة #3: **Upload handlers غير موصولة أو ناقصة**
- **الموقع:** teacher-media.js, teacher-research.js, teacher-content.js
- **الأعراض:** أزرار "رفع ملف" لا تفعل شيء
- **التأثير:** لا يمكن رفع ملفات البحث أو الصور أو الوثائق
- **الحل:** تطوير upload handlers صحيحة مع validation

### المشكلة #4: **أسماء الحقول في Supabase غير متطابقة مع الكود**
- **الموقع:** Multiple files - competition_questions, research_evaluations, etc.
- **الأعراض:** استعلامات Supabase تفشل بـ "column not found"
- **التأثير:** بيانات لا تحمل بصحة
- **الحل:** تصحيح أسماء الحقول في الكود أو Migrations

### المشكلة #5: **JOINs غير صحيحة في الاستعلامات**
- **الموقع:** teacher-research.js, teacher-participants.js
- **الأعراض:** بيانات student name أو teacher info لا تظهر
- **التأثير:** جداول تعرض بيانات ناقصة
- **الحل:** إصلاح `.select()` queries مع `.eq().select()`

### المشكلة #6: **Cascade deletes ناقصة في Migrations**
- **الموقع:** Supabase schema - competition_questions, challenge_questions
- **الأعراض:** حذف سؤال لا يحذف الروابط من المسابقات
- **التأثير:** بيانات يتيمة (orphaned records)
- **الحل:** إضافة `ON DELETE CASCADE` في Migrations

### المشكلة #7: **Event listeners غير مربوطة أو محذوفة**
- **الموقع:** Multiple HTML files و JS files
- **الأعراض:** أزرار لا تستجيب للنقر
- **التأثير:** وظائف كاملة معطلة
- **الحل:** فحص شامل وإعادة ربط جميع الأحداث

### المشكلة #8: **Toast/notification system قد يكون غير موصول**
- **الموقع:** Multiple JS files
- **الأعراض:** لا توجد رسائل نجاح/خطأ
- **التأثير:** المستخدم لا يعرف إذا نجح الإجراء
- **الحل:** التأكد من استيراد Toast وتفعيلها

---

## 🚀 خطة الإصلاح مرتبة حسب الأولوية

### **المرحلة 1: التشخيص والإعداد الأساسي**

1. ✅ **فحص الاتصال بـ Supabase والمصادقة**
   - التأكد من أن الـ client يتصل بـ Supabase بصحة
   - التحقق من أن المعلم مصرح له بالوصول
   - تفعيل رسائل الأخطاء لمساعدة التصحيح

2. ✅ **فحص Storage buckets وPolicies**
   - تأكد أن `public_assets` و `research_files` موجودة
   - تأكد أن RLS policies صحيحة للتحميل والحذف

3. ✅ **إضافة/تعديل Migrations اللازمة**
   - إضافة `ON DELETE CASCADE` حيث لزم
   - إضافة missing RLS policies للمعلمين
   - تصحيح أسماء الحقول إذا لزم

---

### **المرحلة 2: إصلاح مكونات الـ Upload والملفات**

4. 🔧 **إصلاح صور الغلاف (teacher-competitions.js, teacher-content.js)**
   - استبدال DataURL handling بـ Supabase Storage upload
   - إضافة validation للحجم والنوع
   - تصحيح `resetCoverPreview()` لاستخدام Storage URLs

5. 🔧 **بناء Upload Handler في teacher-media.js**
   - تطوير `uploadFileToStorage()` function
   - إضافة progress tracking
   - إضافة error handling صحيح

6. 🔧 **إصلاح Research File Upload (teacher-research.js)**
   - تطوير `uploadResearchFile()` function
   - ربط الملف برسالة البحث في Supabase

---

### **المرحلة 3: إصلاح CRUD Operations**

7. 🔧 **إصلاح save/update functions**
   - teacher-competitions.js: تصحيح `saveCompetition()`
   - teacher-content.js: تصحيح `savePage()`
   - teacher-questions.js: تصحيح `saveQuestion()`
   - إضافة proper error handling والتحقق من RLS

8. 🔧 **إصلاح delete functions**
   - التأكد من حذف الروابط أيضاً (cascade)
   - إضافة confirmation dialogs
   - إضافة proper error handling

9. 🔧 **إصلاح query functions**
   - تصحيح JOINs في teacher-research.js
   - تصحيح JOINs في teacher-participants.js
   - تصحيح field names في جميع الاستعلامات

---

### **المرحلة 4: إصلاح UI والأحداث**

10. 🔧 **فحص وإصلاح Event Listeners**
    - teacher-dashboard.html: إضافة event listeners للأزرار
    - teacher-competitions.html: التأكد من ربط جميع الأزرار
    - teacher-content.html: التأكد من ربط WYSIWYG
    - جميع الصفحات الأخرى: فحص شامل

11. 🔧 **تصحيح Toast/Notifications**
    - التأكد من استيراد Toast في جميع الملفات
    - إضافة Toast messages لجميع العمليات
    - تصحيح رسائل الأخطاء

12. 🔧 **إصلاح Pagination وFiltering**
    - التأكد من عمل pagination في جميع القوائم
    - التأكد من عمل search/filter في جميع الصفحات

---

### **المرحلة 5: اختبار شامل**

13. ✅ **Regression Testing**
    - اختبار كل وظيفة CRUD في كل صفحة
    - اختبار الرفع والحذف والتعديل
    - اختبار البحث والفلترة والتصفح
    - اختبار الأخطاء والإشعارات

---

## 📝 تفاصيل الإصلاح لكل ملف

### **1. supabase/migrations/09_teacher_admin_rls.sql (تحديث)**
**المشكلة:** قد تكون policies ناقصة لبعض جداول المعلمين

**الحل:**
- فحص وإضافة missing policies للـ content_pages, challenges, research_submissions
- التأكد من أن المعلمين يستطيعون حذف وتحديث جميع السجلات

**الملفات المتأثرة:** migrations folder

---

### **2. src/scripts/teacher-competitions.js**
**المشاكل:**
- صور الغلاف تُحفظ كـ DataURL
- قد تكون cover upload logic ناقصة

**الحل:**
- استبدال `resetCoverPreview()` بحفظ فعلي في Storage
- إضافة `uploadCoverToStorage()` function جديدة
- تصحيح `saveCompetition()` لحفظ Storage URL

---

### **3. src/scripts/teacher-content.js**
**المشاكل:**
- نفس مشاكل الغلاف كما في competitions
- قد تكون delete logic غير صحيحة

**الحل:**
- استبدال cover handling بـ Storage upload
- تصحيح `deletePage()` للتحقق من RLS
- إضافة proper error handling

---

### **4. src/scripts/teacher-media.js**
**المشاكل:**
- قد لا يكون موجوداً أو ناقص
- لا توجد upload handler

**الحل:**
- بناء ملف كامل مع:
  - `uploadFile()` function
  - `loadFiles()` function
  - `deleteFile()` function
  - `copyFileURL()` function

---

### **5. src/scripts/teacher-research.js**
**المشاكل:**
- قد تكون JOINs خاطئة
- قد لا تكون file upload موصولة
- قد تكون evaluation save logic ناقصة

**الحل:**
- تصحيح `.select('*', profiles(*))` queries
- إضافة `uploadResearchFile()` function
- تصحيح `saveEvaluation()` للحفظ الصحيح
- إضافة proper error handling

---

### **6. src/scripts/teacher-participants.js**
**المشاكل:**
- قد تكون JOINs خاطئة
- قد لا يكون export موجوداً

**الحل:**
- تصحيح queries لجلب بيانات المشاركين من جميع المصادر
- إضافة `exportToExcel()` function إذا كانت مطلوبة
- إضافة proper aggregation للنتائج

---

### **7. src/scripts/teacher-users.js**
**المشاكل:**
- قد تكون update logic غير صحيحة
- قد لا تكون reset password موجودة

**الحل:**
- تصحيح RLS check في update
- إضافة `resetStudentPassword()` function إذا كانت مطلوبة
- تصحيح delete logic

---

### **8. src/scripts/teacher-questions.js**
**المشاكل:**
- قد تكون metadata handling خاطئة
- قد تكون delete logic ناقصة

**الحل:**
- تصحيح JSON metadata handling
- إضافة proper cascade delete
- تصحيح query للحصول على الأسئلة بصحة

---

### **9. src/scripts/teacher-challenges.js, teacher-reading.js**
**المشاكل:**
- قد تكون ملفات ناقصة أو غير كاملة

**الحل:**
- فحص وإكمال جميع CRUD functions
- إضافة proper question linking
- تصحيح cascade delete

---

### **10. جميع الملفات: Event Listener Fixes**
**المشاكل:**
- أزرار قد لا تكون موصولة بـ event listeners

**الحل:**
- فحص شامل لجميع HTML files
- التأكد من أن جميع أزرار CRUD موصولة
- إضافة error handlers لجميع الأحداث

---

## 📋 متطلبات الإعداد اليدوي من المستخدم

### **1. Supabase Configuration**
- ✅ تأكد أن URL و Key صحيحة في `src/services/supabase.js`
- ✅ تأكد أن Google OAuth مفعل في Supabase Authentication
- ✅ تأكد أن URL configuration صحيحة (Site URL, Redirect URLs)

### **2. Storage Buckets**
- ✅ تأكد أن `public_assets` bucket موجود وعام
- ✅ تأكد أن `research_files` bucket موجود وخاص
- ✅ تأكد أن RLS policies صحيحة للـ buckets

### **3. Database RLS**
- ✅ فعل RLS على جميع الجداول
- ✅ تأكد أن المعلم له role="teacher" في profiles
- ✅ تطبيق جميع migrations

### **4. Test Data**
- ✅ أضف معلم test بـ role="teacher"
- ✅ أضف بعض البيانات التجريبية (مسابقات، أسئلة، صفحات)
- ✅ اختبر جميع العمليات يدوياً

---

## 📊 الوظائف المستقبلية غير المنفذة

### **1. Export to Excel**
- **الوصف:** تصدير قائمة المشاركين والنتائج إلى ملف Excel
- **الحالة:** غير موجود
- **التوصية:** ضمن الأولويات - تطبيق باستخدام library مثل `SheetJS`

### **2. Reset Student Password**
- **الوصف:** إعادة تعيين كلمة مرور الطالب من قبل المعلم
- **الحالة:** غير موجود
- **التوصية:** ضمن الأولويات - تطبيق مع إرسال بريد إلى الطالب

### **3. Live Analytics**
- **الوصف:** تحديث الإحصائيات في الوقت الفعلي (WebSockets)
- **الحالة:** غير موجود
- **التوصية:** مستقبلي - يحتاج Supabase Realtime

### **4. Mail Notifications**
- **الوصف:** إرسال بريد للطلاب عند إضافة مسابقة جديدة
- **الحالة:** غير موجود
- **التوصية:** مستقبلي - يحتاج بناء email service

### **5. Activity Logs**
- **الوصف:** تسجيل جميع إجراءات المعلم
- **الحالة:** غير موجود
- **التوصية:** أمني - تطبيق جدول audit_logs

### **6. Bulk Upload**
- **الوصف:** رفع أسئلة متعددة دفعة واحدة من CSV
- **الحالة:** غير موجود
- **التوصية:** ضمن الأولويات - تطبيق CSV parser

### **7. Advanced Search**
- **الوصف:** بحث متقدم بمعايير متعددة
- **الحالة:** موجود لكن بسيط
- **التوصية:** تحسين - إضافة معايير متعددة

### **8. Scheduled Competitions**
- **الوصف:** جدولة المسابقات بتاريخ/وقت محدد
- **الحالة:** موجود جزئياً
- **التوصية:** تحسين - إضافة scheduler

---

## ✅ Regression Check - الوظائف السابقة المطلوب اختبارها

بعد الإصلاح، يجب اختبار:

1. ✅ تسجيل دخول المعلم (Google Login و Email/Password)
2. ✅ لوحة التحكم الرئيسية تحمل الإحصائيات بصحة
3. ✅ إضافة/تعديل/حذف مسابقات
4. ✅ إضافة/تعديل/حذف أسئلة
5. ✅ ربط الأسئلة بالمسابقات
6. ✅ إضافة/تعديل/حذف محتوى
7. ✅ إضافة/تعديل/حذف تحديات قراءة
8. ✅ رفع وإدارة الملفات
9. ✅ عرض وتقييم الأبحاث
10. ✅ عرض المشاركين والنتائج
11. ✅ تغيير كلمة المرور
12. ✅ تسجيل الخروج
13. ✅ تغيير الثيم (Light/Dark)
14. ✅ Navigation والأقسام الجانبية
15. ✅ Responsive design على الهواتف

---

## 📌 ملاحظات مهمة

### **لا تنتهك هذه الضوابط:**
- ❌ **لا تعيد بناء المشروع من الصفر** - إصلاح فقط
- ❌ **لا تحذف وظائف موجودة** - حتى لو كانت غير مستخدمة
- ❌ **لا تنشئ جداول مكررة** - استخدم الموجودة
- ❌ **لا تعطل RLS** - عزز الصلاحيات بدلاً من تعطيلها
- ❌ **لا تمنح الطلاب صلاحيات المعلمين** - احترم الأدوار
- ✅ **احتفظ بالمصادقة و Google Login** و RTL و التصميم المتجاوب

---

## 🎯 الملفات الرئيسية المتأثرة

```
Priority Order:
1. supabase/migrations/09_teacher_admin_rls.sql (تحديث)
2. src/scripts/teacher-competitions.js (إصلاح)
3. src/scripts/teacher-content.js (إصلاح)
4. src/scripts/teacher-media.js (بناء/إصلاح)
5. src/scripts/teacher-research.js (إصلاح)
6. src/scripts/teacher-participants.js (إصلاح)
7. src/scripts/teacher-questions.js (إصلاح)
8. src/scripts/teacher-challenges.js (فحص/إصلاح)
9. src/scripts/teacher-reading.js (فحص/إصلاح)
10. src/scripts/teacher-users.js (إصلاح)
11. جميع HTML files: teacher-*.html (فحص event listeners)
```

---

**الحالة:** تم إنشاء الخطة  
**التاريخ:** January 2025  
**الخطوة التالية:** تنفيذ الإصلاحات مرحلة بمرحلة
