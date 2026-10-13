/**
 * Page Transitions Manager
 * ────────────────────────────────────────────────────────────────────────
 * نظام انتقالات سلس بين الصفحات باستخدام View Transition API
 * مصمم ليكون سريعًا، هادئًا، ومناسبًا لمنصة تعليمية رسمية
 * 
 * Features:
 * • انتقالات سلسة باستخدام View Transition API
 * • احتياطي للمتصفحات غير الداعمة
 * • لا يتداخل مع تبديل الثيم
 * • يحافظ على سلوك الروابط الخارجية والنماذج
 */

class PageTransitionManager {
  constructor() {
    this.isTransitioning = false;
    this.transitionDuration = 220; // milliseconds
    
    this.init();
  }

  init() {
    // التحقق من دعم View Transition API
    this.supportsViewTransitions = 'startViewTransition' in document;
    
    // اعتراض جميع الروابط الداخلية فقط
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      
      // تجاهل إذا لم يكن رابطًا أو كان الانتقال قيد التنفيذ
      if (!link || this.isTransitioning) return;
      
      const href = link.getAttribute('href');
      
      // تجاهل الروابط الخاصة
      if (!href || 
          href.startsWith('#') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          link.hasAttribute('download') ||
          link.target === '_blank' ||
          e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }
      
      // تجاهل الروابط الخارجية
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) {
          return;
        }
      } catch {
        // إذا فشل إنشاء URL، دع المتصفح يتعامل معه
        return;
      }
      
      // اعتراض الرابط وتنفيذ الانتقال
      e.preventDefault();
      this.navigateTo(href);
    });
  }

  async navigateTo(url) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    try {
      if (this.supportsViewTransitions) {
        // استخدام View Transition API للانتقال السلس
        const transition = document.startViewTransition(() => {
          window.location.href = url;
        });
        
        // انتظار اكتمال الانتقال
        await transition.ready;
      } else {
        // احتياطي للمتصفحات غير الداعمة - انتقال بسيط
        document.documentElement.style.opacity = '0';
        document.documentElement.style.transition = `opacity ${this.transitionDuration}ms ease-out`;
        
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        window.location.href = url;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // في حالة الخطأ، انتقل عادي
      window.location.href = url;
    } finally {
      this.isTransitioning = false;
    }
  }
}

// تهيئة مدير الانتقالات
let pageTransitionManager = null;

export function initPageTransitions() {
  if (typeof window === 'undefined') return null;
  
  // تحقق من إعدادات تقليل الحركة
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }
  
  if (!pageTransitionManager) {
    pageTransitionManager = new PageTransitionManager();
  }
  
  return pageTransitionManager;
}

export default PageTransitionManager;
