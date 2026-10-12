# خطة تنفيذ نظام إدارة شعب المدرسة الكامل
## School Classes Management System - Implementation Plan

---

## نظرة عامة على المشروع

بعد فحص شامل للكود الموجود، تبين أن:

1. **جدول `school_sections` موجود ويعمل** - تم إنشاؤه في migration 06 بالأعمدة التالية:
   - `id` (UUID Primary Key)
   - `grade` (TEXT - قيم: 'العاشر', 'الحادي عشر', 'الثاني عشر')
   - `section_name` (TEXT - أرقام الشعب: '1', '2', '3', إلخ)
   - `is_active` (BOOLEAN - للتفعيل/التعطيل)
   - `sort_order` (INTEGER - للترتيب)
   - `created_at` (TIMESTAMPTZ)
   - UNIQUE constraint على (`grade`, `section_name`)

2. **لا حاجة لجدول `school_grades` منفصل** - البنية الحالية كافية حيث أن الصف (`grade`) محفوظ كنص في `school_sections` و `profiles`

3. **جدول `profiles` يحتوي على**:
   - `grade` (TEXT - nullable)
   - `section` (TEXT - nullable)
   - هذه الحقول نصوص بسيطة، لا توجد Foreign Keys

4. **RLS Policies موجودة ومناسبة**:
   - الجميع يقرأ الشعب النشطة (`is_active=true`)
   - المعلمون فقط يديرون (INSERT/UPDATE/DELETE)

5. **ملف `teacher-sections.js` موجود** لكنه بسيط جداً - يعرض فقط قائمة بسيطة، يحتاج إلى استبدال كامل

---

## القرارات التقنية

### 1. هيكلة قاعدة البيانات
**القرار**: استخدام البنية الحالية بدون تعديلات جذرية
- **المبرر**: `school_sections` موجود ويعمل، الحقول كافية، UNIQUE constraint موجود
- **التحسينات المطلوبة**: إضافة indexes فقط لتحسين الأداء

### 2. ربط الطلاب بالشعب
**القرار**: استمرار استخدام `profiles.grade` و `profiles.section` كنصوص بدون Foreign Keys
- **المبرر**: البساطة، المرونة، تجنب cascade issues
- **الحماية**: application-level validation في JavaScript و SQL constraints للقيم المسموحة

### 3. منع حذف شعبة مرتبطة بطلاب
**القرار**: فحص application-level قبل الحذف
- **الطريقة**: `SELECT COUNT(*) FROM profiles WHERE grade=X AND section=Y BEFORE DELETE`
- **إذا count > 0**: عرض modal توضيحي يمنع الحذف ويوفر خيار "عرض الطلاب"

### 4. البنية التقنية للصفحة
**القرار**: nested structure - عرض الصفوف كعناوين مع الشعب تحت كل صف
- **البديل المرفوض**: flat list مع filter - أقل وضوحاً للمستخدم العربي
- **التنفيذ**: grouped rendering في `renderTable()` function

---

## خطة التنفيذ التفصيلية

### FEAT-001: إنشاء الواجهة الأساسية وCRUD الكامل

#### الخطوة 1: إنشاء `teacher-classes.html`
**ماذا نفعل**:
- إنشاء صفحة HTML كاملة تتبع نمط `teacher-users.html` بالضبط
- Header: hamburger menu, page title "📚 إدارة شعب المدرسة", theme toggle, teacher badge, logout button
- Sidebar: سيتم حقنه تلقائياً من `teacher-nav.js`
- Content area: 
  - Filters card: dropdown للصف (all/العاشر/الحادي عشر/الثاني عشر)، search box لاسم الشعبة، toggle "النشطة فقط"
  - زر "➕ إضافة شعبة جديدة"
  - جدول: الصف، الشعبة، الحالة (نشطة/معطلة)، عدد الطلاب، تاريخ الإنشاء، الإجراءات
- Modals:
  - `add-section-modal`: grade dropdown، section_name input، is_active checkbox
  - `edit-section-modal`: نفس الحقول مع pre-fill
  - `students-list-modal`: (سيأتي في FEAT-002)

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\teacher-classes.html`

**التحقق**:
```bash
# فتح في المتصفح
file:///c:/Users/win 11/Desktop/siraj_abuobaida/teacher-classes.html
# يجب أن تظهر الصفحة مع sidebar وheader صحيحين
```

---

#### الخطوة 2: إنشاء `teacher-classes.js` - Core Logic

**ماذا نفعل**:
- استيراد modules: `import { initTeacherAdmin, showConfirmModal, renderPagination, escapeHtml, formatDate, debounce } from './teacher-nav.js'`
- استيراد Supabase: `import { supabase } from '../services/supabase.js'`
- استيراد Toast: `import { Toast } from '../utils/toast.js'`

**Global state**:
```javascript
let allSections = [];
let currentPage = 1;
const pageSize = 12;
let gradeFilter = 'all';
let searchQuery = '';
let activeOnlyFilter = false;
```

**Functions الأساسية**:
1. `setupEvents()` - bind all button clicks, filters, search input
2. `loadSections()` - استعلام `school_sections` مع ترتيب حسب grade و sort_order
3. `renderTable()` - عرض الشعب مع grouping حسب grade، عرض عدد الطلاب، pagination
4. `getStudentCount(grade, section)` - `SELECT COUNT(*) FROM profiles WHERE grade=X AND section=Y AND role='student'`
5. `openAddModal()` - فتح modal الإضافة
6. `openEditModal(section)` - فتح modal التعديل مع pre-fill
7. `saveSection()` - Supabase upsert (INSERT أو UPDATE)
8. `toggleActive(id, currentActive)` - تحديث `is_active` inline
9. `confirmDeleteSection(section)` - فحص عدد الطلاب أولاً، إذا > 0 منع، وإلا حذف
10. `deleteSection(id)` - `DELETE FROM school_sections WHERE id=X`

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js`

**التحقق**:
```javascript
// فتح Console في المتصفح
// يجب أن ترى: "Teacher classes module loaded"
// لا يجب أن يكون هناك errors
```

---

#### الخطوة 3: تحديث `teacher-nav.js` - إضافة navigation entry

**ماذا نفعل**:
تعديل `ADMIN_PAGES` array في `src/scripts/teacher-nav.js`:

```javascript
export const ADMIN_PAGES = [
  { key: 'dashboard', href: 'teacher-dashboard.html', title: 'لوحة التحكم والإحصائيات', icon: '📊' },
  { key: 'content', href: 'teacher-content.html', title: 'الصفحات التعليمية', icon: '📝' },
  { key: 'reading', href: 'teacher-reading.html', title: 'تحديات القراءة (طوّر نفسك)', icon: '📚' },
  { key: 'competitions', href: 'teacher-competitions.html', title: 'مسابقات السراج', icon: '🏆' },
  { key: 'questions', href: 'teacher-questions.html', title: 'بنك الأسئلة', icon: '❓' },
  { key: 'research', href: 'teacher-research.html', title: 'البحث العلمي والتحكيم', icon: '🔬' },
  { key: 'participants', href: 'teacher-participants.html', title: 'سجل المشاركين', icon: '👥' },
  { key: 'users', href: 'teacher-users.html', title: 'إدارة المستخدمين والطلاب', icon: '🎓' },
  { key: 'classes', href: 'teacher-classes.html', title: 'إدارة شعب المدرسة', icon: '🏫' }, // NEW
  { key: 'media', href: 'teacher-media.html', title: 'الملفات والوسائط', icon: '📁' },
  { key: 'profile', href: 'teacher-profile.html', title: 'الملف الشخصي', icon: '👤' }
];
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-nav.js`

**التحقق**:
```bash
# فتح أي صفحة معلم (مثل teacher-dashboard.html)
# في sidebar يجب أن يظهر "🏫 إدارة شعب المدرسة"
# النقر عليه ينقل إلى teacher-classes.html
```

---

#### الخطوة 4: تصميم UI التفاعلي وFilters

**ماذا نفعل**:
- عرض جدول nested: كل صف (grade) له section مع الشعب تحته
- Filters:
  ```html
  <select id="grade-filter">
    <option value="all">جميع الصفوف</option>
    <option value="العاشر">الصف العاشر</option>
    <option value="الحادي عشر">الصف الحادي عشر</option>
    <option value="الثاني عشر">الصف الثاني عشر</option>
  </select>
  <input type="text" id="section-search" placeholder="🔍 بحث بالشعبة...">
  <label><input type="checkbox" id="active-only"> النشطة فقط</label>
  ```
- عمود "عدد الطلاب": عرض رقم مع أيقونة 👥
- زر تبديل الحالة inline: 
  ```html
  <button class="btn-toggle-active" data-id="${section.id}" data-active="${section.is_active}">
    ${section.is_active ? '✓ نشطة' : '✕ معطلة'}
  </button>
  ```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\teacher-classes.html` (HTML structure)
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js` (rendering logic)

**التحقق**:
```bash
# فتح teacher-classes.html
# تغيير grade filter - يجب أن يفلتر الجدول
# كتابة في search box - يجب أن يبحث في section_name
# تفعيل "النشطة فقط" - يجب أن يخفي المعطلة
```

---

#### الخطوة 5: منطق منع الحذف للشعب المرتبطة

**ماذا نفعل**:
في `confirmDeleteSection(section)`:

```javascript
async function confirmDeleteSection(section) {
  // Step 1: Check student count
  const studentCount = await getStudentCount(section.grade, section.section_name);
  
  if (studentCount > 0) {
    // Cannot delete - show warning
    showConfirmModal({
      title: '⚠️ لا يمكن حذف الشعبة',
      message: `الشعبة «${section.grade} - شعبة ${section.section_name}» مرتبطة بـ ${studentCount} طالب. يرجى نقل الطلاب أو حذف ارتباطاتهم أولاً.`,
      confirmText: 'عرض الطلاب',
      cancelText: 'إلغاء',
      onConfirm: () => {
        openStudentsListModal(section); // Will be implemented in FEAT-002
      }
    });
    return;
  }
  
  // Step 2: If count = 0, proceed with delete confirmation
  showConfirmModal({
    title: 'حذف الشعبة',
    message: `هل أنت متأكد من حذف «${section.grade} - شعبة ${section.section_name}»؟ لن يمكن التراجع.`,
    confirmText: 'نعم، حذف',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await deleteSection(section.id);
    }
  });
}
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js`

**التحقق**:
```bash
# محاولة حذف شعبة بها طلاب
# يجب أن يظهر modal تحذير مع عدد الطلاب
# محاولة حذف شعبة فارغة
# يجب أن يظهر confirmation وينجح الحذف
```

---

### FEAT-002: ربط الطلاب وإدارتهم

#### الخطوة 1: إضافة زر "عرض الطلاب" في الجدول

**ماذا نفعل**:
في `renderTable()` function، إضافة زر جديد في عمود الإجراءات:

```javascript
<button class="btn btn-outline btn-sm btn-view-students" 
        data-grade="${section.grade}" 
        data-section="${section.section_name}">
  👥 عرض الطلاب (${studentCount})
</button>
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js`

**التحقق**:
```bash
# كل صف في الجدول يجب أن يحتوي على زر "عرض الطلاب"
# الرقم بين الأقواس يجب أن يعكس عدد الطلاب الفعلي
```

---

#### الخطوة 2: إنشاء modal قائمة الطلاب

**ماذا نفعل**:
إضافة modal في `teacher-classes.html`:

```html
<div id="students-list-modal" class="modal">
  <div class="modal-content card" style="max-width: 720px;">
    <div class="modal-header">
      <h3 id="students-modal-title">طلاب الصف - شعبة</h3>
      <button id="btn-close-students-modal" class="btn-icon">&times;</button>
    </div>
    <div class="modal-body">
      <div class="flex justify-between items-center" style="margin-bottom: 1rem;">
        <span id="students-count-label">إجمالي: 0 طالب</span>
        <button id="btn-transfer-selected" class="btn btn-primary btn-sm" style="display: none;">
          ↔️ نقل المحددين
        </button>
      </div>
      <div class="td-table-wrapper">
        <table class="td-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all-students"></th>
              <th>الطالب</th>
              <th>البريد الإلكتروني</th>
              <th>تاريخ الانضمام</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody id="students-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\teacher-classes.html`

**التحقق**:
```bash
# modal يجب أن يكون مخفياً بشكل افتراضي
# عند فتحه (via JS)، يظهر بشكل صحيح فوق المحتوى
```

---

#### الخطوة 3: تحميل وعرض الطلاب

**ماذا نفعل**:
في `teacher-classes.js`:

```javascript
async function openStudentsListModal(section) {
  currentSection = section; // save globally
  const modal = document.getElementById('students-list-modal');
  document.getElementById('students-modal-title').textContent = 
    `طلاب ${section.grade} - شعبة ${section.section_name}`;
  
  modal.classList.add('active');
  
  await loadStudentsForSection(section.grade, section.section_name);
}

async function loadStudentsForSection(grade, section) {
  const tbody = document.getElementById('students-table-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">جاري التحميل...</td></tr>';
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .eq('grade', grade)
      .eq('section', section)
      .order('full_name');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="td-empty-state">
          لا يوجد طلاب في هذه الشعبة حالياً
        </td></tr>
      `;
      return;
    }
    
    document.getElementById('students-count-label').textContent = `إجمالي: ${data.length} طالب`;
    
    tbody.innerHTML = data.map(student => `
      <tr>
        <td><input type="checkbox" class="student-checkbox" value="${student.id}"></td>
        <td>${escapeHtml(student.full_name || 'بدون اسم')}</td>
        <td style="direction: ltr; text-align: right;">${escapeHtml(student.email || '-')}</td>
        <td>${formatDate(student.created_at)}</td>
        <td>
          <button class="btn btn-outline btn-sm btn-transfer-single" data-id="${student.id}">
            ↔️ نقل
          </button>
        </td>
      </tr>
    `).join('');
    
    // Bind transfer buttons
    tbody.querySelectorAll('.btn-transfer-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.dataset.id;
        openTransferModal([studentId]);
      });
    });
    
  } catch (err) {
    console.error('Load students error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="color: #ef4444;">تعذر تحميل الطلاب</td></tr>`;
  }
}
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js`

**التحقق**:
```bash
# النقر على "عرض الطلاب" لشعبة بها طلاب
# يجب أن يعرض قائمة الطلاب بشكل صحيح
# إذا كانت الشعبة فارغة، يجب أن يعرض empty state
```

---

#### الخطوة 4: إنشاء transfer modal وlogic

**ماذا نفعل**:
إضافة modal في `teacher-classes.html`:

```html
<div id="transfer-modal" class="modal">
  <div class="modal-content card" style="max-width: 480px;">
    <div class="modal-header">
      <h3>نقل الطلاب إلى شعبة أخرى</h3>
      <button id="btn-close-transfer-modal" class="btn-icon">&times;</button>
    </div>
    <div class="modal-body">
      <p id="transfer-students-info" style="margin-bottom: 1rem; color: var(--color-text-muted);"></p>
      
      <div class="form-group">
        <label class="form-label">الصف الجديد *</label>
        <select id="transfer-grade" class="form-control">
          <option value="">اختر الصف...</option>
          <option value="العاشر">الصف العاشر</option>
          <option value="الحادي عشر">الصف الحادي عشر</option>
          <option value="الثاني عشر">الصف الثاني عشر</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">الشعبة الجديدة *</label>
        <select id="transfer-section" class="form-control">
          <option value="">اختر الشعبة...</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button id="btn-cancel-transfer" class="btn btn-outline">إلغاء</button>
      <button id="btn-confirm-transfer" class="btn btn-primary">✓ تأكيد النقل</button>
    </div>
  </div>
</div>
```

في `teacher-classes.js`:

```javascript
let studentsToTransfer = [];

async function openTransferModal(studentIds) {
  studentsToTransfer = studentIds;
  const modal = document.getElementById('transfer-modal');
  document.getElementById('transfer-students-info').textContent = 
    `سيتم نقل ${studentIds.length} طالب`;
  
  // Reset dropdowns
  document.getElementById('transfer-grade').value = '';
  document.getElementById('transfer-section').innerHTML = '<option value="">اختر الشعبة...</option>';
  
  modal.classList.add('active');
}

// When grade changes, load sections
document.getElementById('transfer-grade').addEventListener('change', async (e) => {
  const grade = e.target.value;
  const sectionSelect = document.getElementById('transfer-section');
  
  if (!grade) {
    sectionSelect.innerHTML = '<option value="">اختر الشعبة...</option>';
    return;
  }
  
  sectionSelect.innerHTML = '<option value="">جاري التحميل...</option>';
  
  try {
    const { data, error } = await supabase
      .from('school_sections')
      .select('section_name')
      .eq('grade', grade)
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    
    sectionSelect.innerHTML = '<option value="">اختر الشعبة...</option>' +
      data.map(s => `<option value="${s.section_name}">${s.section_name}</option>`).join('');
    
  } catch (err) {
    console.error('Load sections error:', err);
    sectionSelect.innerHTML = '<option value="">تعذر تحميل الشعب</option>';
  }
});

// Confirm transfer
document.getElementById('btn-confirm-transfer').addEventListener('click', async () => {
  const newGrade = document.getElementById('transfer-grade').value;
  const newSection = document.getElementById('transfer-section').value;
  
  if (!newGrade || !newSection) {
    Toast.warning('يرجى اختيار الصف والشعبة الجديدين');
    return;
  }
  
  const btn = document.getElementById('btn-confirm-transfer');
  btn.disabled = true;
  btn.textContent = 'جاري النقل...';
  
  try {
    // Update all students
    const { error } = await supabase
      .from('profiles')
      .update({
        grade: newGrade,
        section: newSection,
        updated_at: new Date().toISOString()
      })
      .in('id', studentsToTransfer);
    
    if (error) throw error;
    
    Toast.success(`تم نقل ${studentsToTransfer.length} طالب بنجاح`);
    
    // Close modals and refresh
    document.getElementById('transfer-modal').classList.remove('active');
    document.getElementById('students-list-modal').classList.remove('active');
    
    await loadSections(); // refresh main table
    renderTable();
    
  } catch (err) {
    console.error('Transfer error:', err);
    Toast.error('تعذر نقل الطلاب: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '✓ تأكيد النقل';
  }
});
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\teacher-classes.html`
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js`

**التحقق**:
```bash
# النقر على "نقل" لطالب واحد
# transfer modal يفتح
# اختيار صف جديد - dropdown الشعبة يتحدث
# اختيار شعبة وتأكيد النقل
# التحقق من Supabase: profiles.grade و section تحدثت
# Toast يظهر بنجاح
```

---

#### الخطوة 5: النقل الجماعي

**ماذا نفعل**:
في `teacher-classes.js`:

```javascript
// Select all checkbox
document.getElementById('select-all-students').addEventListener('change', (e) => {
  const checkboxes = document.querySelectorAll('.student-checkbox');
  checkboxes.forEach(cb => cb.checked = e.target.checked);
  updateTransferSelectedButton();
});

// Individual checkboxes
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('student-checkbox')) {
    updateTransferSelectedButton();
  }
});

function updateTransferSelectedButton() {
  const checked = document.querySelectorAll('.student-checkbox:checked');
  const btn = document.getElementById('btn-transfer-selected');
  
  if (checked.length > 0) {
    btn.style.display = 'inline-flex';
    btn.textContent = `↔️ نقل المحددين (${checked.length})`;
  } else {
    btn.style.display = 'none';
  }
}

// Transfer selected button
document.getElementById('btn-transfer-selected').addEventListener('click', () => {
  const checked = Array.from(document.querySelectorAll('.student-checkbox:checked'));
  const studentIds = checked.map(cb => cb.value);
  openTransferModal(studentIds);
});
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js`

**التحقق**:
```bash
# تحديد عدة طلاب بالـ checkboxes
# زر "نقل المحددين" يظهر مع العدد
# النقر عليه يفتح transfer modal
# تأكيد النقل ينقل جميع الطلاب المحددين
```

---

### FEAT-003: تحسينات قاعدة البيانات

#### الخطوة 1: إنشاء migration file

**ماذا نفعل**:
إنشاء `c:\Users\win 11\Desktop\siraj_abuobaida\supabase\migrations\10_school_classes_enhancements.sql`:

```sql
-- ============================================================
-- Migration 10: School Classes Management Enhancements
-- Indexes for performance + RLS policy refinements
-- ============================================================

-- 1. Add indexes for better query performance

-- Index on profiles (grade, section) for COUNT queries
CREATE INDEX IF NOT EXISTS idx_profiles_grade_section 
  ON public.profiles(grade, section) 
  WHERE role = 'student';

-- Index on school_sections.grade for filtering
CREATE INDEX IF NOT EXISTS idx_school_sections_grade 
  ON public.school_sections(grade);

-- Index on school_sections.is_active for active-only queries
CREATE INDEX IF NOT EXISTS idx_school_sections_active 
  ON public.school_sections(is_active) 
  WHERE is_active = true;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_school_sections_grade_active 
  ON public.school_sections(grade, is_active);


-- 2. RLS Policy Review (no changes needed, just documentation)

-- school_sections policies are already optimal:
-- - "Anyone can read active sections": SELECT for is_active=true OR teacher
-- - "Teachers manage sections": ALL for teachers only

-- These policies are sufficient for our use case.


-- 3. Add helpful comments for documentation

COMMENT ON TABLE public.school_sections IS 
'جدول إدارة شعب مدرسة أبو عبيدة - يحتوي على الصفوف (العاشر، الحادي عشر، الثاني عشر) والشعب (أرقام 1-12)';

COMMENT ON COLUMN public.school_sections.grade IS 
'الصف الدراسي - قيم مسموحة: العاشر، الحادي عشر، الثاني عشر';

COMMENT ON COLUMN public.school_sections.section_name IS 
'رقم أو اسم الشعبة - عادة أرقام من 1 إلى 12';

COMMENT ON COLUMN public.school_sections.is_active IS 
'حالة التفعيل - false للشعب المعطلة أو المغلقة';

COMMENT ON COLUMN public.school_sections.sort_order IS 
'ترتيب العرض - يُستخدم في ORDER BY لترتيب الشعب';


-- 4. Verify UNIQUE constraint exists (it does from migration 06)
-- UNIQUE (grade, section_name) - prevents duplicate sections


-- 5. Data validation function (optional helper)
-- Can be used in application triggers if needed in future

CREATE OR REPLACE FUNCTION validate_grade(p_grade TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_grade IN ('العاشر', 'الحادي عشر', 'الثاني عشر');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_grade IS 
'دالة للتحقق من صحة قيمة الصف - يمكن استخدامها في constraints أو triggers';


-- 6. Done - Migration complete
-- No data changes, only indexes and documentation
```

**الملفات**:
- `c:\Users\win 11\Desktop\siraj_abuobaida\supabase\migrations\10_school_classes_enhancements.sql`

**التحقق**:
```sql
-- سيتم في الخطوة التالية
```

---

#### الخطوة 2: تطبيق Migration على Supabase

**ماذا نفعل**:
طريقتان:

**Option A: Supabase CLI** (إذا كان مثبتاً):
```bash
cd "c:\Users\win 11\Desktop\siraj_abuobaida"
supabase migration up
```

**Option B: Supabase Studio** (يدوياً):
1. فتح Supabase Studio → SQL Editor
2. نسخ محتوى `10_school_classes_enhancements.sql`
3. لصق وتشغيل (Run)
4. التحقق من عدم وجود errors

**التحقق**:
```sql
-- في Supabase SQL Editor:

-- Check indexes created
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('profiles', 'school_sections')
ORDER BY tablename, indexname;

-- Expected results:
-- idx_profiles_grade_section
-- idx_school_sections_grade
-- idx_school_sections_active
-- idx_school_sections_grade_active

-- Test RLS policies
-- (As student - should only see active sections)
SELECT * FROM school_sections WHERE is_active = true;

-- (As teacher - should see all)
SELECT * FROM school_sections;

-- Test UNIQUE constraint
-- This should fail with error:
INSERT INTO school_sections (grade, section_name, sort_order)
VALUES ('العاشر', '1', 1);
-- Error expected: duplicate key value violates unique constraint
```

---

#### الخطوة 3: اختبار الأداء قبل وبعد

**ماذا نفعل**:
```sql
-- Before indexes (theoretical test - indexes already applied)
-- This query should be slower without index:
EXPLAIN ANALYZE
SELECT COUNT(*) 
FROM profiles 
WHERE grade = 'العاشر' AND section = '1' AND role = 'student';

-- After indexes:
-- Same query should use idx_profiles_grade_section
-- Look for "Index Scan" in EXPLAIN output

-- Example output:
-- Index Scan using idx_profiles_grade_section on profiles
-- (cost=0.15..8.17 rows=1 width=8)
```

**التحقق**:
```bash
# في Supabase Studio → Database → Performance Insights
# أو via EXPLAIN ANALYZE في SQL Editor
# التأكد من أن الـ queries تستخدم الـ indexes
```

---

#### الخطوة 4: التحقق النهائي من عدم وجود Breaking Changes

**ماذا نفعل**:
اختبار جميع الصفحات التي تستخدم `school_sections` أو `profiles.grade/section`:

1. **complete-profile.html**: 
   - فتح الصفحة، اختيار صف، التأكد من تحميل الشعب
   - حفظ، التحقق من Supabase

2. **student-identity.js** (used في المسابقات):
   - فتح أي مسابقة، اختبار identity modal
   - التأكد من تحميل الشعب

3. **teacher-sections.js** (القديم):
   - إذا لم يتم استبداله بـ teacher-classes.js، اختباره
   - أو حذفه إذا تم استبداله بالكامل

4. **teacher-dashboard.js**:
   - فتح teacher-dashboard.html
   - التحقق من عداد "شُعب المدرسة" يعمل
   - يجب أن يعرض COUNT من `school_sections`

**الملفات**:
- جميع الملفات المذكورة أعلاه

**التحقق**:
```bash
# اختبار كل صفحة يدوياً
# لا يجب أن يكون هناك console errors
# جميع الـ CRUD operations تعمل
```

---

## خطة التحقق الشاملة (Integration Testing)

### Test Case 1: إضافة شعبة جديدة كاملة
```
1. فتح teacher-classes.html
2. تسجيل دخول كمعلم
3. النقر على "➕ إضافة شعبة جديدة"
4. اختيار: الصف = "العاشر"، الشعبة = "7"، نشطة = ✓
5. حفظ
6. التأكد من ظهور الشعبة في الجدول
7. التحقق من Supabase: school_sections يحتوي على السجل الجديد
```

### Test Case 2: ربط طلاب بالشعبة الجديدة
```
1. فتح teacher-users.html
2. تعديل طالب: تحديد grade="العاشر", section="7"
3. حفظ
4. العودة إلى teacher-classes.html
5. عدد الطلاب للشعبة "العاشر/7" يجب أن يكون >= 1
```

### Test Case 3: عرض طلاب الشعبة
```
1. في teacher-classes.html، جدول الشعب
2. النقر على "👥 عرض الطلاب" للشعبة "العاشر/7"
3. modal يفتح ويعرض الطالب الذي أضفناه
4. التحقق من عرض: الاسم، البريد، تاريخ الانضمام
```

### Test Case 4: نقل طالب إلى شعبة أخرى
```
1. في students list modal، النقر على "نقل" للطالب
2. transfer modal يفتح
3. اختيار: الصف الجديد = "الحادي عشر"
4. اختيار: الشعبة الجديدة = "1"
5. تأكيد النقل
6. التحقق من Supabase: profiles.grade و section تحدثت
7. العودة إلى "عرض الطلاب" للشعبة القديمة - الطالب لم يعد موجوداً
8. "عرض الطلاب" للشعبة الجديدة - الطالب موجود
```

### Test Case 5: منع حذف شعبة مرتبطة
```
1. محاولة حذف الشعبة "الحادي عشر/1" (التي نقلنا لها الطالب)
2. modal تحذير يظهر: "لا يمكن حذف الشعبة - مرتبطة بـ 1 طالب"
3. النقر على "عرض الطلاب" - يفتح قائمة الطلاب
```

### Test Case 6: حذف شعبة فارغة
```
1. نقل جميع الطلاب من "الحادي عشر/1" إلى شعبة أخرى
2. العودة إلى teacher-classes.html
3. محاولة حذف "الحادي عشر/1"
4. confirmation modal يظهر: "هل أنت متأكد؟"
5. تأكيد الحذف
6. الشعبة تختفي من الجدول
7. التحقق من Supabase: السجل محذوف
```

### Test Case 7: تبديل حالة التفعيل
```
1. في جدول الشعب، النقر على زر الحالة لشعبة نشطة
2. الزر يتحول إلى "✕ معطلة"
3. التحقق من Supabase: is_active = false
4. النقر مرة أخرى
5. الزر يتحول إلى "✓ نشطة"
6. is_active = true
```

### Test Case 8: Filters والبحث
```
1. تصفية حسب الصف "العاشر" - فقط شعب العاشر تظهر
2. البحث عن "7" - فقط الشعب التي تحتوي على "7" تظهر
3. تفعيل "النشطة فقط" - الشعب المعطلة تختفي
4. إزالة الفلاتر - جميع الشعب تعود للظهور
```

### Test Case 9: Responsive Design
```
1. فتح teacher-classes.html على شاشة كبيرة (desktop)
2. sidebar مرئي دائماً، hamburger مخفي
3. تصغير النافذة إلى mobile size (< 992px)
4. sidebar يختفي، hamburger يظهر
5. النقر على hamburger - sidebar يظهر كـ drawer
6. النقر على backdrop أو X - sidebar يختفي
7. جميع modals تعمل بشكل صحيح على الجوال
```

### Test Case 10: Theme Toggle
```
1. الموقع يبدأ بـ light theme (أو حسب تفضيلات النظام)
2. النقر على زر الثيم (🌙/☀️)
3. الألوان تتحول بنجاح: background, text, borders, cards
4. جميع الـ modals تتحول أيضاً
5. إعادة تحميل الصفحة - الثيم محفوظ (localStorage)
```

---

## ملخص الملفات المطلوبة

### ملفات جديدة (3):
1. `c:\Users\win 11\Desktop\siraj_abuobaida\teacher-classes.html` - الصفحة الرئيسية
2. `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-classes.js` - السكريبت الكامل
3. `c:\Users\win 11\Desktop\siraj_abuobaida\supabase\migrations\10_school_classes_enhancements.sql` - Migration

### ملفات معدلة (1):
1. `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-nav.js` - إضافة navigation entry

### ملفات محتملة للحذف (1):
1. `c:\Users\win 11\Desktop\siraj_abuobaida\src\scripts\teacher-sections.js` - قديم وأقل كفاءة، يمكن استبداله بـ teacher-classes.js أو الإبقاء عليه كـ backup

---

## الخلاصة

هذه الخطة تغطي:

✅ **FEAT-001**: واجهة كاملة مع CRUD operations وFilters وPagination  
✅ **FEAT-002**: ربط الطلاب بالشعب مع عرض قائمة الطلاب ونقلهم  
✅ **FEAT-003**: تحسينات قاعدة البيانات (indexes، RLS review، migration)  

**الميزات الإضافية المحققة**:
- منع حذف شعبة مرتبطة بطلاب
- نقل جماعي للطلاب
- تبديل حالة التفعيل inline
- Search والفلاتر المتقدمة
- Responsive design كامل
- Dark/Light theme support
- RTL layout

**لا يوجد data loss** - جميع البيانات الحالية محفوظة، والتحسينات تضيف فقط indexes وfeatures جديدة.
