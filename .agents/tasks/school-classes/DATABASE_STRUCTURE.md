# بنية قاعدة البيانات - إدارة شعب المدرسة

## نظرة عامة

تم تصميم بنية قاعدة البيانات لإدارة الصفوف والشعب الدراسية في مدرسة أبو عبيدة بطريقة مرنة وبسيطة.

## الجداول الرئيسية

### 1. `school_sections` - جدول الشعب الدراسية

يحتوي على جميع الصفوف والشعب المتاحة في المدرسة.

```sql
CREATE TABLE public.school_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,              -- الصف: 'العاشر'، 'الحادي عشر'، 'الثاني عشر'
  section_name TEXT NOT NULL,       -- اسم الشعبة: '1'، '2'، '3'، إلخ
  is_active BOOLEAN DEFAULT true,   -- حالة التفعيل
  sort_order INTEGER DEFAULT 0,     -- ترتيب العرض
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (grade, section_name)      -- منع التكرار
);
```

**الأعمدة:**
- `id`: المعرف الفريد للشعبة (UUID)
- `grade`: الصف الدراسي كنص (العاشر، الحادي عشر، الثاني عشر)
- `section_name`: اسم الشعبة كنص (عادة أرقام: 1، 2، 3)
- `is_active`: حالة التفعيل (true = نشط، false = معطل)
- `sort_order`: رقم الترتيب لعرض الشعب بترتيب معين
- `created_at`: تاريخ إنشاء السجل

**القيود (Constraints):**
- `UNIQUE (grade, section_name)`: يمنع إنشاء شعبتين بنفس الاسم في نفس الصف

### 2. `profiles` - جدول المستخدمين

يحتوي على بيانات جميع المستخدمين (طلاب ومعلمين)، بما في ذلك ارتباطهم بالصف والشعبة.

```sql
-- الأعمدة المهمة لإدارة الشعب:
grade TEXT,              -- صف الطالب (يطابق school_sections.grade)
section TEXT,            -- شعبة الطالب (يطابق school_sections.section_name)
role TEXT,               -- الدور: 'student' أو 'teacher'
```

**ملاحظات مهمة:**
- `profiles.grade` و `profiles.section` هما أعمدة نصية (TEXT)
- لا يوجد Foreign Key constraint بينهما وبين `school_sections`
- هذا التصميم متعمد للمرونة وسهولة إدخال البيانات
- التحقق من الصحة يتم في طبقة التطبيق (Frontend validation)

## الفهارس (Indexes) - Migration 10

تم إضافة الفهارس التالية لتحسين الأداء:

### 1. فهرس على profiles(grade, section)
```sql
CREATE INDEX idx_profiles_grade_section 
  ON public.profiles(grade, section);
```
**الاستخدام:** تسريع استعلامات عدد الطلاب لكل شعبة
```sql
SELECT COUNT(*) FROM profiles 
WHERE grade='العاشر' AND section='1';
```

### 2. فهرس على profiles(grade, section, role)
```sql
CREATE INDEX idx_profiles_grade_section_role 
  ON public.profiles(grade, section, role);
```
**الاستخدام:** تسريع استعلامات الطلاب فقط في شعبة معينة
```sql
SELECT * FROM profiles 
WHERE grade='العاشر' AND section='1' AND role='student';
```

### 3. فهرس على school_sections(grade)
```sql
CREATE INDEX idx_school_sections_grade 
  ON public.school_sections(grade);
```
**الاستخدام:** تسريع الفلترة حسب الصف
```sql
SELECT * FROM school_sections WHERE grade='العاشر';
```

### 4. فهرس على school_sections(is_active)
```sql
CREATE INDEX idx_school_sections_active 
  ON public.school_sections(is_active);
```
**الاستخدام:** تحميل الشعب النشطة فقط
```sql
SELECT * FROM school_sections WHERE is_active=true;
```

### 5. فهرس على school_sections(grade, is_active)
```sql
CREATE INDEX idx_school_sections_grade_active 
  ON public.school_sections(grade, is_active);
```
**الاستخدام:** تحميل الشعب النشطة لصف معين (مثل: في modal النقل)
```sql
SELECT * FROM school_sections 
WHERE grade='العاشر' AND is_active=true;
```

### 6. فهرس على school_sections(sort_order)
```sql
CREATE INDEX idx_school_sections_sort_order 
  ON public.school_sections(sort_order);
```
**الاستخدام:** ترتيب الشعب حسب sort_order
```sql
SELECT * FROM school_sections ORDER BY sort_order;
```

## سياسات الأمان (RLS Policies)

### سياسات `school_sections`:

#### 1. "Anyone can read active sections"
```sql
CREATE POLICY "Anyone can read active sections" 
ON public.school_sections
FOR SELECT 
USING (is_active = true OR get_user_role() = 'teacher');
```
**المعنى:**
- الطلاب يستطيعون قراءة الشعب النشطة فقط (`is_active=true`)
- المعلمون يستطيعون قراءة جميع الشعب (نشطة ومعطلة)

#### 2. "Teachers manage sections"
```sql
CREATE POLICY "Teachers manage sections" 
ON public.school_sections
FOR ALL 
USING (get_user_role() = 'teacher');
```
**المعنى:**
- المعلمون فقط يستطيعون إضافة وتعديل وحذف الشعب
- الطلاب لا يستطيعون إجراء أي عمليات كتابة على `school_sections`

### اختبار الأمان:

**كطالب:**
```sql
-- ✅ يعمل: قراءة الشعب النشطة
SELECT * FROM school_sections WHERE is_active=true;

-- ❌ يفشل: قراءة الشعب المعطلة
SELECT * FROM school_sections WHERE is_active=false;

-- ❌ يفشل: إضافة شعبة
INSERT INTO school_sections (grade, section_name) VALUES ('العاشر', '7');

-- ❌ يفشل: تعديل شعبة
UPDATE school_sections SET section_name='8' WHERE id='...';

-- ❌ يفشل: حذف شعبة
DELETE FROM school_sections WHERE id='...';
```

**كمعلم:**
```sql
-- ✅ يعمل: قراءة جميع الشعب
SELECT * FROM school_sections;

-- ✅ يعمل: إضافة شعبة
INSERT INTO school_sections (grade, section_name) VALUES ('العاشر', '7');

-- ✅ يعمل: تعديل شعبة
UPDATE school_sections SET section_name='8' WHERE id='...';

-- ✅ يعمل: حذف شعبة
DELETE FROM school_sections WHERE id='...';
```

## قرار التصميم: لماذا لا يوجد جدول `school_grades`؟

بعد تقييم شامل، قررنا **عدم** إنشاء جدول منفصل للصفوف الدراسية. الأسباب:

### 1. البساطة والكفاية
- الصفوف محدودة وثابتة (10، 11، 12)
- لا توجد بيانات إضافية (metadata) معقدة للصفوف
- البنية الحالية (grade كنص) بسيطة وواضحة

### 2. المرونة
- التحقق يتم في Frontend (JavaScript validation)
- سهولة إضافة صفوف جديدة مستقبلاً إذا لزم
- عدم وجود Foreign Key يسهل إدخال البيانات

### 3. الأداء
- استعلامات مباشرة وسريعة
- لا حاجة لـ JOINs إضافية
- الفهارس على grade تحسن الأداء بشكل كافي

### 4. قابلية التطوير المستقبلي
إذا احتجنا مستقبلاً لإضافة بيانات معقدة للصفوف (مثل: order، display_name، metadata)، يمكننا:
- إنشاء جدول `school_grades` في migration جديد
- إضافة Foreign Key constraint
- ترحيل البيانات الحالية
- كل هذا بدون فقدان بيانات

## الاستعلامات الشائعة

### 1. عدد الطلاب في شعبة معينة
```sql
SELECT COUNT(*) 
FROM profiles 
WHERE grade = 'العاشر' 
  AND section = '1' 
  AND role = 'student';
```
**الفهرس المستخدم:** `idx_profiles_grade_section_role`

### 2. قائمة الطلاب في شعبة
```sql
SELECT id, full_name, email, created_at
FROM profiles 
WHERE grade = 'العاشر' 
  AND section = '1' 
  AND role = 'student'
ORDER BY full_name;
```
**الفهرس المستخدم:** `idx_profiles_grade_section_role`

### 3. جميع الشعب لصف معين (نشطة فقط)
```sql
SELECT id, section_name, is_active, sort_order
FROM school_sections 
WHERE grade = 'العاشر' 
  AND is_active = true
ORDER BY sort_order;
```
**الفهرس المستخدم:** `idx_school_sections_grade_active`

### 4. إضافة شعبة جديدة
```sql
INSERT INTO school_sections (grade, section_name, is_active, sort_order)
VALUES ('العاشر', '7', true, 7)
ON CONFLICT (grade, section_name) 
DO NOTHING;
```
**الـ constraint المستخدم:** `UNIQUE (grade, section_name)`

### 5. نقل طالب من شعبة إلى أخرى
```sql
UPDATE profiles 
SET grade = 'الحادي عشر', 
    section = '2', 
    updated_at = NOW()
WHERE id = '<student_id>';
```

### 6. تعطيل شعبة (soft delete)
```sql
UPDATE school_sections 
SET is_active = false, 
    updated_at = NOW()
WHERE grade = 'العاشر' 
  AND section_name = '6';
```

### 7. منع حذف شعبة بها طلاب
```sql
-- في Frontend، قبل الحذف:
SELECT COUNT(*) FROM profiles 
WHERE grade = 'العاشر' 
  AND section = '6' 
  AND role = 'student';

-- إذا كان العدد > 0، امنع الحذف واعرض رسالة تحذير
```

## أفضل الممارسات

### 1. استخدام soft delete بدلاً من hard delete
```sql
-- ✅ جيد: تعطيل الشعبة
UPDATE school_sections SET is_active = false WHERE id = '...';

-- ⚠️ تجنب: حذف الشعبة نهائياً
DELETE FROM school_sections WHERE id = '...';
```

### 2. التحقق من وجود طلاب قبل الحذف
```javascript
// في Frontend
async function deleteSection(grade, section) {
  const count = await getStudentCount(grade, section);
  if (count > 0) {
    Toast.warning(`لا يمكن حذف الشعبة. يوجد ${count} طالب مرتبط بها.`);
    return;
  }
  // proceed with deletion
}
```

### 3. استخدام ON CONFLICT للتعامل مع التكرار
```javascript
const { error } = await supabase
  .from('school_sections')
  .upsert(
    { grade, section_name, is_active, sort_order },
    { onConflict: 'grade,section_name' }
  );
```

### 4. تحميل الشعب النشطة فقط للطلاب
```javascript
// للطلاب: تحميل الشعب النشطة فقط
const { data } = await supabase
  .from('school_sections')
  .select('*')
  .eq('is_active', true)
  .order('sort_order');

// للمعلمين: تحميل جميع الشعب (RLS يسمح)
const { data } = await supabase
  .from('school_sections')
  .select('*')
  .order('sort_order');
```

## الخلاصة

البنية الحالية:
- ✅ بسيطة وواضحة
- ✅ آمنة بفضل RLS policies
- ✅ محسّنة للأداء بفضل الفهارس
- ✅ مرنة وقابلة للتطوير
- ✅ تمنع التكرار بفضل UNIQUE constraint
- ✅ تدعم soft delete عبر is_active

لا حاجة لتعقيد إضافي في الوقت الحالي. إذا تطلب الأمر مستقبلاً، يمكن إضافة جدول `school_grades` دون فقدان بيانات.
