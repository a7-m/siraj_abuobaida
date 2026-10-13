/**
 * Advanced Page Transitions Manager — سراج مدرسة أبو عبيدة
 * ────────────────────────────────────────────────────────────────────────
 * نظام انتقالات متقدم وذكي مستوحى من سلاسة تطبيقات Apple
 * 
 * Features:
 * • انتقالات جانبية ذكية تتبع ترتيب الصفحات في شريط التنقل
 * • انتقالات رأسية للنماذج واللوحات المنبثقة
 * • دعم زر الرجوع والتقدم في المتصفح
 * • دعم الروابط المباشرة والمعاملات
 * • احترام إعدادات تقليل الحركة
 * • لا يتداخل مع النماذج والتنزيلات والروابط الخارجية
 */

class PageTransitionManager {
  constructor() {
    this.isTransitioning = false;
    this.supportsViewTransitions = 'startViewTransition' in document;
    
    // ترتيب الصفحات الرئيسية في شريط التنقل
    this.pageOrder = {
      'index.html': 0,
      '/': 0,
      'develop.html': 1,
      'competition.html': 2,
      'research.html': 3,
      'identity.html': 4,
      'dashboard.html': 5
    };
    
    // الصفحات التي تحتاج انتقال رأسي (من الأسفل للأعلى)
    this.verticalPages = [
      'login.html',
      'signup.html',
      'forgot-password.html',
      'reset-password.html',
      'complete-profile.html'
    ];
    
    this.init();
  }

  init() {
    // اعتراض النقرات على الروابط
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      
      if (!link || this.isTransitioning) return;
      
      const href = link.getAttribute('href');
      
      // تجاهل الحالات الخاصة
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
        return;
      }
      
      // تجنب إعادة تحميل نفس الصفحة
      const currentPath = this.getPageName(window.location.pathname);
      const targetPath = this.getPageName(href);
      
      if (currentPath === targetPath) {
        e.preventDefault();
        return;
      }
      
      // اعتراض الرابط وتنفيذ الانتقال
      e.preventDefault();
      this.navigateTo(href);
    });

    // دعم زر الرجوع والتقدم في المتصفح
    window.addEventListener('popstate', (e) => {
      if (this.isTransitioning) return;
      
      const direction = e.state?.transitionDirection || this.guessDirectionFromHistory();
      this.setTransitionDirection(direction);
    });
  }

  /**
   * استخراج اسم الصفحة من المسار
   */
  getPageName(path) {
    if (!path) return 'index.html';
    
    // إزالة المعاملات والأجزاء
    const cleanPath = path.split('?')[0].split('#')[0];
    
    // استخراج اسم الملف
    const parts = cleanPath.split('/');
    const fileName = parts[parts.length - 1];
    
    return fileName || 'index.html';
  }

  /**
   * تحديد اتجاه الانتقال بناءً على ترتيب الصفحات
   */
  getTransitionDirection(fromPage, toPage) {
    // صفحات النماذج والتسجيل - انتقال رأسي
    if (this.verticalPages.includes(toPage)) {
      return 'modal-up';
    }
    
    if (this.verticalPages.includes(fromPage) && !this.verticalPages.includes(toPage)) {
      return 'modal-down';
    }
    
    // الصفحات الرئيسية - انتقال جانبي
    const fromIndex = this.pageOrder[fromPage];
    const toIndex = this.pageOrder[toPage];
    
    if (fromIndex !== undefined && toIndex !== undefined) {
      return toIndex > fromIndex ? 'forward' : 'backward';
    }
    
    // انتقال محايد للصفحات غير المصنفة
    return 'neutral';
  }

  /**
   * تخمين اتجاه الانتقال عند استخدام زر الرجوع/التقدم
   */
  guessDirectionFromHistory() {
    // في حالة الرجوع، نستخدم backward افتراضيًا
    return 'backward';
  }

  /**
   * تعيين اتجاه الانتقال في HTML
   */
  setTransitionDirection(direction) {
    document.documentElement.setAttribute('data-transition', direction);
  }

  /**
   * الانتقال إلى صفحة جديدة
   */
  async navigateTo(url) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    try {
      const currentPage = this.getPageName(window.location.pathname);
      const targetPage = this.getPageName(url);
      const direction = this.getTransitionDirection(currentPage, targetPage);
      
      this.setTransitionDirection(direction);
      
      if (this.supportsViewTransitions && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // استخدام View Transition API
        const transition = document.startViewTransition(() => {
          window.location.href = url;
        });
        
        await transition.ready;
      } else {
        // احتياطي للمتصفحات غير الداعمة
        await this.fallbackTransition();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = url;
    } finally {
      // سيتم إعادة تعيين isTransitioning عند تحميل الصفحة الجديدة
      this.isTransitioning = false;
    }
  }

  /**
   * انتقال احتياطي للمتصفحات غير الداعمة
   */
  async fallbackTransition() {
    document.documentElement.style.opacity = '0';
    document.documentElement.style.transition = 'opacity 250ms ease-out';
    
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  /**
   * تنظيف الحالة عند تحميل الصفحة
   */
  cleanup() {
    this.isTransitioning = false;
    document.documentElement.style.opacity = '';
    document.documentElement.style.transition = '';
  }
}

// ═══════════════════════════════════════════════════════════════
// Instance Management
// ═══════════════════════════════════════════════════════════════

let pageTransitionManager = null;

export function initPageTransitions() {
  if (typeof window === 'undefined') return null;
  
  // احترام إعدادات تقليل الحركة
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!pageTransitionManager) {
    pageTransitionManager = new PageTransitionManager();
    
    // تنظيف الحالة عند تحميل الصفحة
    pageTransitionManager.cleanup();
    
    // تعيين اتجاه محايد افتراضي
    if (!document.documentElement.hasAttribute('data-transition')) {
      pageTransitionManager.setTransitionDirection('neutral');
    }
  }
  
  return pageTransitionManager;
}

export default PageTransitionManager;
