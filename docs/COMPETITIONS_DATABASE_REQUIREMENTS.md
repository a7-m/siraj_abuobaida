# متطلبات قاعدة البيانات المستقبلية — نظام المسابقات
# COMPETITIONS_DATABASE_REQUIREMENTS.md

> **ملاحظة مهمة:** هذا الملف **توثيق فقط**. لم يتم تنفيذ أي من التغييرات أدناه في قاعدة البيانات.  
> كل التعديلات المذكورة هنا تتطلب موافقة وتنفيذاً يدوياً مستقبلاً.

---

## 1. تحليل الوضع الحالي

### الجداول الموجودة (المستخدمة حالياً في صفحة المسابقات)

| الجدول | الأعمدة المستخدمة |
|--------|-------------------|
| `competitions` | `id`, `title`, `description`, `image_url`, `start_date`, `end_date`, `created_at` |
| `competition_questions` | `competition_id`, `question_id`, `order_num` |
| `questions` | `id`, `type`, `text`, `image_url`, `points`, `metadata` |
| `competition_attempts` | `id`, `student_id`, `competition_id`, `status`, `total_score`, `started_at`, `submitted_at` |
| `attempt_answers` | `attempt_id`, `question_id`, `answer_data`, `score` |

### أنواع الأسئلة المدعومة حالياً في جدول `questions`

```sql
type IN ('mcq', 'tf', 'multi', 'order', 'match')
```

الأنواع التي يعرضها الكود الحالي فعلياً: `mcq`, `tf`, `order`

---

## 2. الحقول الناقصة المقترحة

### جدول `competitions` — حقول مقترحة للإضافة

| الحقل | النوع | مطلوب | الغرض | الاستخدام في الصفحة | الاستخدام في الداشبورد |
|-------|-------|--------|-------|---------------------|----------------------|
| `status` | `TEXT` CHECK IN ('draft','active','ended','archived') | نعم | تحكم صريح في حالة المسابقة (بدلاً من الاشتقاق من التواريخ) | فلترة البطاقات بدقة | المعلم يغير الحالة يدوياً |
| `duration_seconds` | `INTEGER` | لا | مدة المسابقة — لعرض عداد زمني | عرض عداد تنازلي أثناء المسابقة | المعلم يحدد وقتاً أو يتركه فارغاً |
| `result_visibility` | `BOOLEAN` DEFAULT `true` | نعم | هل تظهر النتيجة للطالب بعد الانتهاء؟ | شاشة النتيجة: إما تعرض الدرجة أو تعرض "شكراً على مشاركتك" فقط | المعلم يختار نعم/لا |
| `final_note` | `TEXT` | لا | ملاحظة تظهر للطالب عند انتهاء المسابقة | تُعرض في شاشة النتيجة | المعلم يكتبها مسبقاً |
| `max_attempts` | `INTEGER` | لا | الحد الأقصى لعدد المحاولات (null = غير محدود) | منع المحاولات الزائدة | المعلم يحدده |
| `shuffle_questions` | `BOOLEAN` DEFAULT `false` | لا | خلط ترتيب الأسئلة عشوائياً لكل محاولة | منطق العرض في `QuizEngine` | خيار في نموذج إنشاء المسابقة |

### مثال على SQL المقترح (غير مُنفَّذ):

```sql
-- لا تنفذ هذا الآن. هذا للتخطيط المستقبلي فقط.
ALTER TABLE competitions
  ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','ended','archived')),
  ADD COLUMN duration_seconds INTEGER,
  ADD COLUMN result_visibility BOOLEAN DEFAULT true,
  ADD COLUMN final_note TEXT,
  ADD COLUMN max_attempts INTEGER,
  ADD COLUMN shuffle_questions BOOLEAN DEFAULT false;
```

---

## 3. جدول Leaderboard (مقترح جديد)

حالياً يمكن احتساب ترتيب الطلاب من `competition_attempts` (total_score + submitted_at).  
لكن لعرض Leaderboard بكفاءة عالية يُقترح جدول مخصص.

| الحقل | النوع | الغرض |
|-------|-------|--------|
| `competition_id` | UUID FK | ربط بالمسابقة |
| `student_id` | UUID FK | ربط بالطالب |
| `rank` | INTEGER | الترتيب المحسوب |
| `total_score` | INTEGER | مجموع الدرجات |
| `completion_time_seconds` | INTEGER | وقت الإنجاز (للفصل بين المتعادلين) |
| `calculated_at` | TIMESTAMPTZ | وقت الحساب الأخير |

> **ملاحظة:** يمكن حساب هذا الجدول بـ Supabase Edge Function يتم تشغيلها بعد انتهاء المسابقة.

---

## 4. حماية الإجابات الصحيحة (Security)

### الوضع الحالي

الإجابة الصحيحة تُرسل مباشرة إلى المتصفح ضمن `metadata.correct_answer`.  
أي مستخدم تقني يمكنه رؤيتها من DevTools.

### المقترح المستقبلي

**الخيار 1 — Supabase Edge Function (RPC)**
```
POST /rpc/grade_competition_attempt
Body: { attempt_id, answers }
```
الدالة تُقيّم الإجابات Server-side وترجع النتيجة فقط دون كشف الإجابات الصحيحة.

**الخيار 2 — RLS + Separate Grading Table**
- إزالة `correct_answer` من `questions.metadata`
- جدول منفصل `question_answers` لا يمكن قراءته إلا من Server أو من `role='teacher'`
- Server يقيّم بعد الإرسال

> الخيار الأول (Edge Function) أسهل تنفيذاً ويحافظ على البنية الحالية.

---

## 5. نظام الوقت (Timer)

### ما هو موجود حالياً
لا يوجد حقل `duration_seconds` في `competitions`.

### ما يحتاجه الكود مستقبلاً
عند توفر `duration_seconds`:
1. `QuizEngine.start()` يبدأ عداداً تنازلياً
2. عند انتهاء الوقت → `_finish()` يُستدعى تلقائياً
3. الإجابات غير المكتملة تُرسَل بقيمة `null`

```javascript
// مثال على الكود المقترح (غير موجود حالياً)
if (competition.duration_seconds) {
  this._startTimer(competition.duration_seconds);
}
```

---

## 6. تصور داشبورد المعلم المستقبلي

> **تذكير:** لم يُبنَ الداشبورد الآن. هذا تخطيط فقط.

### تدفق إنشاء مسابقة

```
المعلم → لوحة التحكم
  → "مسابقة جديدة"
    → [النموذج]
      - اسم المسابقة
      - وصف (اختياري)
      - رفع صورة (Supabase Storage / public_assets)
      - تاريخ البداية / النهاية
      - مدة المسابقة (اختياري)
      - إظهار النتيجة: نعم/لا
      - ملاحظة نهائية (اختياري)
    → حفظ → INSERT في competitions
  → "إضافة أسئلة"
    → لكل سؤال:
      - اختيار النوع: mcq / tf / order
      - النص
      - الخيارات / العناصر (حسب النوع)
      - الإجابة الصحيحة
      - النقاط
    → INSERT في questions + competition_questions
```

### الجداول المُستخدمة في الداشبورد

```
competitions          ← INSERT/UPDATE/DELETE
competition_questions ← INSERT/DELETE
questions             ← INSERT/UPDATE/DELETE
competition_attempts  ← SELECT only (للمراجعة)
attempt_answers       ← SELECT only (للمراجعة)
```

### RLS الحالية تسمح بذلك للمعلم

```sql
-- موجود بالفعل في الـ Schema
CREATE POLICY "Teachers manage competitions" ON competitions
  FOR ALL USING (get_user_role() = 'teacher');

CREATE POLICY "Teachers manage comp questions" ON competition_questions
  FOR ALL USING (get_user_role() = 'teacher');

CREATE POLICY "Teachers insert questions" ON questions
  FOR INSERT WITH CHECK (get_user_role() = 'teacher');
```

✅ لا تحتاج إلى تعديل RLS لبناء الداشبورد.

---

## 7. ملخص — ما يحتاج مستقبلاً

| الميزة | الحل المقترح | أولوية |
|--------|-------------|--------|
| حالة المسابقة الصريحة (`status`) | إضافة حقل للجدول | عالية |
| عداد زمني | إضافة `duration_seconds` + منطق في QuizEngine | متوسطة |
| إخفاء النتيجة | إضافة `result_visibility` | متوسطة |
| ملاحظة نهائية | إضافة `final_note` | متوسطة |
| Leaderboard | جدول جديد + Edge Function | منخفضة |
| حماية الإجابات | Supabase RPC / Edge Function | عالية (للإنتاج) |
| داشبورد المعلم | صفحات CRUD جديدة (لا تكسر الحالي) | عالية |
| رفع صورة المسابقة | استخدام `public_assets` bucket الموجود | متوسطة |
