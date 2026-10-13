# دليل البدء السريع — نظام الانتقالات

## 🚀 التشغيل فورًا

النظام يعمل تلقائيًا! لا حاجة لإعداد إضافي.

## 🧪 الاختبار

افتح في المتصفح:
```
test-transitions.html
```

## 📖 كيف يعمل

### الانتقالات الجانبية (تلقائية)

```
نبذة (0) → طوّر نفسك (1) = يمين إلى يسار ←
طوّر نفسك (1) → نبذة (0) = يسار إلى يمين →
```

### الانتقالات الرأسية (تلقائية)

```
أي صفحة → login.html = أسفل إلى أعلى ↑
login.html → أي صفحة = أعلى إلى أسفل ↓
```

## 🎨 التخصيص

### تعديل المدة

في `src/styles/page-transitions.css`:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 280ms;  /* عدّل هنا */
}
```

### إضافة صفحة جديدة

في `src/scripts/page-transitions.js`:

```javascript
this.pageOrder = {
  'index.html': 0,
  'new-page.html': 6,  // أضف هنا
};
```

### إضافة صفحة نموذج

```javascript
this.verticalPages = [
  'login.html',
  'new-form.html',  // أضف هنا
];
```

## ✅ التحقق من العمل

1. افتح أي صفحة من الموقع
2. انقر على روابط التنقل
3. يجب أن ترى حركة سلسة

## 📚 التوثيق الكامل

راجع `TRANSITION_SYSTEM_DOCUMENTATION.md` للتفاصيل الشاملة.

## 🐛 استكشاف الأخطاء

### الانتقالات لا تعمل؟

1. افتح Console في المتصفح
2. تحقق من وجود أخطاء
3. تأكد من تحميل `page-transitions.css`

### الاتجاه خاطئ؟

تحقق من ترتيب الصفحة في `pageOrder` في `page-transitions.js`

## 🎯 الملفات الرئيسية

- `src/styles/page-transitions.css` - الأنماط
- `src/scripts/page-transitions.js` - المنطق
- `test-transitions.html` - الاختبار

---

**جاهز للإنتاج ✅**
