/**
 * Footer Component
 * ────────────────────────────────────────────────────────────────────────
 * التذييل الرسمي لمنصة سراج
 * يحتوي على أسماء الطالبين وعبارة الإشراف
 */

export function createFooter() {
  // التحقق من عدم وجود تذييل مسبق
  const existingFooter = document.querySelector('.siraj-footer');
  if (existingFooter) return;

  // إنشاء التذييل
  const footer = document.createElement('footer');
  footer.className = 'siraj-footer';
  footer.setAttribute('role', 'contentinfo');
  
  footer.innerHTML = `
    <div class="siraj-footer-content">
      <div class="siraj-footer-label">إعداد الطالبين</div>
      <div class="siraj-footer-names">لؤي الكندي وأحمد عصام</div>
      <div class="siraj-footer-supervision"> إشراف : جماعة اللغة العربية -- مركز مصادر التعلم </div>
      <div class="siraj-footer-copy">  سراج – مدرسة أبو عبيدة. جميع الحقوق محفوظة &copy; 2026 </div>
    </div>
  `;
  
  // إضافة التذييل في نهاية body
  document.body.appendChild(footer);
}

export function initFooter() {
  if (typeof document === 'undefined') return;
  
  createFooter();
}

export default { createFooter, initFooter };
