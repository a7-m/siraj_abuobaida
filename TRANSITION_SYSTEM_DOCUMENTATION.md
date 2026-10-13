# توثيق نظام الانتقالات المتقدم — منصة سراج

## نظرة عامة

تم تطوير نظام انتقالات موحّد واحترافي مستوحى من سلاسة تطبيقات Apple، يوفر تجربة مستخدم متناسقة وممتعة عبر جميع صفحات المنصة.

## المزايا الرئيسية

### 1. الانتقالات الجانبية الذكية 🔄
- **الاتجاه التلقائي**: يتم تحديد اتجاه الانتقال بناءً على ترتيب الصفحات في شريط التنقل
- **للأمام (Forward)**: انزلاق من اليمين إلى اليسار عند الانتقال لصفحة تالية
- **للخلف (Backward)**: انزلاق من اليسار إلى اليمين عند الرجوع لصفحة سابقة

### 2. الانتقالات الرأسية للنماذج ↕️
- **ظهور من الأسفل**: صفحات تسجيل الدخول والنماذج تنزلق من الأسفل للأعلى
- **الإغلاق للأسفل**: عند العودة، تنسحب اللوحات إلى الأسفل
- **صفحات النماذج**:
  - `login.html` - تسجيل الدخول
  - `signup.html` - إنشاء حساب
  - `forgot-password.html` - نسيت كلمة المرور
  - `reset-password.html` - إعادة تعيين كلمة المرور
  - `complete-profile.html` - إكمال الملف الشخصي

### 3. دعم شامل للمتصفح والأجهزة
- ✅ View Transition API للمتصفحات الداعمة
- ✅ Fallback احتياطي للمتصفحات الأقدم
- ✅ تحسين خاص للأجهزة المحمولة
- ✅ دعم كامل لـ `prefers-reduced-motion`

### 4. وظائف متقدمة
- ✅ دعم زر الرجوع والتقدم في المتصفح
- ✅ دعم الروابط المباشرة والمعاملات (query parameters)
- ✅ عدم اعتراض الروابط الخارجية والخاصة
- ✅ منع الانتقال عند النقر على نفس الصفحة
- ✅ عدم التداخل مع النماذج والتنزيلات

## ترتيب الصفحات الرئيسية

```javascript
const pageOrder = {
  'index.html': 0,        // نبذة
  'develop.html': 1,      // طوّر نفسك
  'competition.html': 2,  // مسابقة السراج
  'research.html': 3,     // البحث العلمي
  'identity.html': 4,     // الهوية الوطنية
  'dashboard.html': 5     // لوحة التحكم
};
```

## البنية التقنية

### الملفات الرئيسية

1. **`src/styles/page-transitions.css`**
   - جميع تعريفات CSS للانتقالات
   - Keyframes للحركات الجانبية والرأسية
   - دعم الأجهزة المحمولة وتقليل الحركة

2. **`src/scripts/page-transitions.js`**
   - منطق التحكم بالانتقالات
   - تحديد الاتجاهات تلقائيًا
   - إدارة الروابط والتاريخ

3. **`src/styles/components.css`**
   - أنماط نموذج بيانات الطالب المحسّنة
   - حركات الظهور والإخفاء للنماذج

### تقنيات مستخدمة

- **View Transition API**: للانتقالات السلسة المدعومة أصليًا
- **CSS Animations**: حركات مخصصة وقابلة للتعديل
- **JavaScript Interception**: اعتراض الروابط وإدارة التنقل
- **History API**: دعم التنقل عبر التاريخ

## التثبيت والاستخدام

### التهيئة التلقائية

النظام يتم تهيئته تلقائيًا في `src/scripts/main.js`:

```javascript
import { initPageTransitions } from './page-transitions.js';

document.addEventListener('DOMContentLoaded', () => {
  initPageTransitions();
});
```

### إضافة صفحة جديدة

1. أضف الصفحة إلى `pageOrder` في `page-transitions.js`:
```javascript
this.pageOrder = {
  'index.html': 0,
  'new-page.html': 6,  // إضافة هنا
};
```

2. إذا كانت صفحة نموذج، أضفها إلى `verticalPages`:
```javascript
this.verticalPages = [
  'login.html',
  'new-form.html',  // إضافة هنا
];
```

## الاختبار

### صفحة الاختبار المخصصة

تم إنشاء صفحة `test-transitions.html` للاختبار الشامل:

```bash
# افتح في المتصفح
test-transitions.html
```

### سيناريوهات الاختبار

1. **الانتقال للأمام**:
   - نبذة → طوّر نفسك ✓ (يمين إلى يسار)

2. **الانتقال للخلف**:
   - طوّر نفسك → نبذة ✓ (يسار إلى يمين)

3. **النماذج**:
   - أي صفحة → تسجيل الدخول ✓ (أسفل إلى أعلى)
   - تسجيل الدخول → أي صفحة ✓ (أعلى إلى أسفل)

4. **زر الرجوع**:
   - الانتقال ثم الرجوع ✓ (اتجاه عكسي صحيح)

5. **حالات خاصة**:
   - نقر نفس الصفحة ✓ (لا يحدث انتقال)
   - روابط خارجية ✓ (تعمل بشكل طبيعي)
   - mailto: / tel: ✓ (تعمل بشكل طبيعي)

## التخصيص

### تعديل مدة الانتقالات

في `page-transitions.css`:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 280ms;  /* عدّل هنا */
}
```

### تعديل نسبة الحركة

```css
@keyframes slide-out-to-left {
  to {
    transform: translateX(-20%);  /* عدّل النسبة */
  }
}
```

### إضافة انتقال مخصص

1. أضف keyframes جديد:
```css
@keyframes custom-transition {
  from { /* ... */ }
  to { /* ... */ }
}
```

2. أضف اتجاه جديد:
```css
html[data-transition="custom"] {
  ::view-transition-new(root) {
    animation-name: custom-transition;
  }
}
```

3. استخدمه في الكود:
```javascript
this.setTransitionDirection('custom');
```

## إمكانية الوصول (Accessibility)

### دعم تقليل الحركة

النظام يحترم تفضيلات المستخدم تلقائيًا:

```css
@media (prefers-reduced-motion: reduce) {
  /* انتقالات مبسطة جدًا */
  ::view-transition-old(root) {
    animation: simple-fade-out 150ms ease-out !important;
  }
}
```

### الأداء

- استخدام `transform` و `opacity` للأداء الأمثل
- `backface-visibility: hidden` لتجنب التقطّع
- `will-change` على الأجهزة المحمولة

## استكشاف الأخطاء

### المشكلة: الانتقالات لا تعمل

**الحلول**:
1. تحقق من دعم المتصفح: `'startViewTransition' in document`
2. افحص Console للأخطاء
3. تأكد من تحميل `page-transitions.css`
4. تأكد من استدعاء `initPageTransitions()`

### المشكلة: اتجاه خاطئ

**الحلول**:
1. تحقق من ترتيب الصفحة في `pageOrder`
2. افحص `data-transition` في HTML
3. تأكد من اسم الملف الصحيح

### المشكلة: النماذج لا تنزلق عموديًا

**الحلول**:
1. تأكد من إضافة الصفحة في `verticalPages`
2. افحص أنماط CSS المخصصة
3. تحقق من عدم تضارب الأنماط

## الأداء والتحسينات

### مقاييس الأداء المستهدفة

- **مدة الانتقال**: 250-320 مللي ثانية
- **FPS**: 60 إطار/ثانية
- **حجم CSS**: ~4KB (مضغوط)
- **حجم JS**: ~6KB (مضغوط)

### تحسينات الأداء المطبقة

1. **GPU Acceleration**: استخدام `transform` بدلاً من `left/right`
2. **CSS Containment**: عزل التأثيرات لتحسين الرسم
3. **Lazy Transitions**: تفعيل الحركات فقط عند الحاجة
4. **Reduced Paint**: تقليل عمليات إعادة الرسم

## التوافق

### المتصفحات المدعومة

| المتصفح | الإصدار الأدنى | View Transitions | Fallback |
|---------|----------------|------------------|----------|
| Chrome | 111+ | ✅ | ✅ |
| Edge | 111+ | ✅ | ✅ |
| Safari | 18+ | ✅ | ✅ |
| Firefox | * | ⏳ قريبًا | ✅ |
| Opera | 97+ | ✅ | ✅ |

### الأجهزة

- ✅ أجهزة سطح المكتب (Windows, macOS, Linux)
- ✅ الأجهزة اللوحية (iPad, Android tablets)
- ✅ الهواتف الذكية (iOS, Android)

## الصيانة والتحديثات المستقبلية

### خطة الصيانة

1. **مراقبة الأداء**: قياس دوري لسرعة الانتقالات
2. **تحديثات المتصفح**: متابعة التحديثات الجديدة
3. **ملاحظات المستخدمين**: تحسين بناءً على التجربة الفعلية
4. **اختبارات دورية**: تشغيل اختبارات تلقائية

### ميزات مستقبلية محتملة

- [ ] دعم الإيماءات (Gestures) على الأجهزة اللوحية
- [ ] انتقالات مخصصة لكل صفحة
- [ ] تأثيرات متقدمة (blur, scale)
- [ ] تكامل مع الحركات الدقيقة (Micro-interactions)

## المراجع والموارد

### التوثيق الرسمي

- [View Transition API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [CSS Animations - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [History API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/History_API)

### أمثلة وإلهام

- [Apple.com Transitions](https://www.apple.com/)
- [Material Design Motion](https://m3.material.io/styles/motion/overview)
- [Framer Motion](https://www.framer.com/motion/)

## الدعم والمساعدة

للمشاكل التقنية أو الأسئلة:
1. راجع قسم "استكشاف الأخطاء" أولاً
2. افحص صفحة الاختبار `test-transitions.html`
3. تحقق من Console للأخطاء
4. راجع التوثيق الكامل

---

**تم التطوير بواسطة**: فريق سراج التقني  
**آخر تحديث**: 2024  
**الإصدار**: 1.0.0
