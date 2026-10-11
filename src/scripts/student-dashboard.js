/**
 * Student Dashboard Controller
 * سراج – مدرسة أبو عبيدة
 * ────────────────────────────────────────────────────────────
 * Manages the student dashboard with real data from Supabase:
 * - Personal achievements and statistics
 * - Progress in "Develop Yourself" challenges  
 * - Competition participations and results
 * - Research submissions
 * - Profile management
 */

import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

class StudentDashboardController {
  constructor() {
    this.user = null;
    this.profile = null;
    this.stats = {
      // Develop Yourself
      completedLevels: 0,
      inProgressLevels: 0,
      totalChallengeScore: 0,
      lastChallengeActivity: null,
      
      // Competitions
      competitionsCount: 0,
      bestCompetitionScore: null,
      lastCompetitionDate: null,
      
      // Research
      researchCount: 0,
      
      // Computed badges
      badges: []
    };
    this.recentActivities = [];
  }

  async init() {
    try {
      // Show loading state
      this.showLoading();

      // Get session and profile
      const { session } = await authService.getSessionAsync();
      
      if (!session || !session.user) {
        window.location.replace('login.html');
        return;
      }

      this.user = session.user;

      // Fetch profile
      await this.fetchProfile();

      // Check role - redirect teachers
      if (this.profile?.role === 'teacher') {
        window.location.replace('teacher-dashboard.html');
        return;
      }

      // Check if profile is complete
      if (!this.profile?.grade || !this.profile?.section) {
        window.location.replace('complete-profile.html');
        return;
      }

      // Fetch all stats in parallel
      await Promise.all([
        this.fetchDevelopStats(),
        this.fetchCompetitionStats(),
        this.fetchResearchStats(),
        this.fetchRecentActivities()
      ]);

      // Compute badges
      this.computeBadges();

      // Render dashboard
      this.render();

      // Hide loading
      this.hideLoading();

    } catch (error) {
      console.error('Dashboard initialization error:', error);
      Toast.error('حدث خطأ أثناء تحميل لوحة التحكم');
      this.hideLoading();
    }
  }

  showLoading() {
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.style.opacity = '0';
      content.style.pointerEvents = 'none';
    }
  }

  hideLoading() {
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.style.opacity = '1';
      content.style.pointerEvents = 'auto';
    }
  }

  async fetchProfile() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.user.id)
      .single();

    if (error) throw error;
    this.profile = data;
  }

  async fetchDevelopStats() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('status, score, completed_at')
        .eq('student_id', this.user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        this.stats.completedLevels = data.filter(p => p.status === 'completed').length;
        this.stats.inProgressLevels = data.filter(p => p.status === 'in_progress').length;
        this.stats.totalChallengeScore = data.reduce((sum, p) => sum + (p.score || 0), 0);
        
        // Find last activity
        const sorted = data
          .filter(p => p.completed_at)
          .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
        
        if (sorted.length > 0) {
          this.stats.lastChallengeActivity = sorted[0].completed_at;
        }
      }
    } catch (error) {
      console.error('Error fetching develop stats:', error);
    }
  }

  async fetchCompetitionStats() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('competition_attempts')
        .select(`
          id,
          total_score,
          status,
          submitted_at,
          competitions (
            title,
            show_results
          )
        `)
        .eq('student_id', this.user.id)
        .in('status', ['submitted', 'graded']);

      if (error) throw error;

      if (data && data.length > 0) {
        this.stats.competitionsCount = new Set(data.map(a => a.competition_id)).size;

        // Best score - only from competitions that show results
        const visibleScores = data
          .filter(a => a.competitions?.show_results && a.total_score != null)
          .map(a => a.total_score);

        if (visibleScores.length > 0) {
          this.stats.bestCompetitionScore = Math.max(...visibleScores);
        }

        // Last participation
        const sorted = data
          .filter(a => a.submitted_at)
          .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

        if (sorted.length > 0) {
          this.stats.lastCompetitionDate = sorted[0].submitted_at;
        }
      }
    } catch (error) {
      console.error('Error fetching competition stats:', error);
    }
  }

  async fetchResearchStats() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('research_submissions')
        .select('id')
        .eq('student_id', this.user.id)
        .neq('status', 'draft');

      if (error) throw error;

      this.stats.researchCount = data?.length || 0;
    } catch (error) {
      console.error('Error fetching research stats:', error);
    }
  }

  async fetchRecentActivities() {
    if (!supabase) return;

    try {
      const activities = [];

      // Challenge completions
      const { data: challengeData } = await supabase
        .from('student_progress')
        .select(`
          completed_at,
          score,
          challenge_levels (
            title,
            level_number
          )
        `)
        .eq('student_id', this.user.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5);

      if (challengeData) {
        challengeData.forEach(item => {
          activities.push({
            type: 'challenge',
            title: item.challenge_levels?.title || `المرحلة ${item.challenge_levels?.level_number}`,
            score: item.score,
            date: item.completed_at,
            icon: '📚'
          });
        });
      }

      // Competition submissions
      const { data: compData } = await supabase
        .from('competition_attempts')
        .select(`
          submitted_at,
          total_score,
          competitions (
            title,
            show_results
          )
        `)
        .eq('student_id', this.user.id)
        .in('status', ['submitted', 'graded'])
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (compData) {
        compData.forEach(item => {
          activities.push({
            type: 'competition',
            title: item.competitions?.title || 'مسابقة',
            score: item.competitions?.show_results ? item.total_score : null,
            date: item.submitted_at,
            icon: '🏆'
          });
        });
      }

      // Sort all activities by date
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.recentActivities = activities.slice(0, 8);

    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  }

  computeBadges() {
    const badges = [];

    // Badge: المبتدئ
    if (this.stats.completedLevels >= 1) {
      badges.push({ name: 'المبتدئ', icon: '🌱', description: 'أكملت أول مرحلة' });
    }

    // Badge: المثابر
    if (this.stats.completedLevels >= 5) {
      badges.push({ name: 'المثابر', icon: '🎖️', description: 'أكملت 5 مراحل' });
    }

    // Badge: الخبير
    if (this.stats.completedLevels >= 10) {
      badges.push({ name: 'الخبير', icon: '💎', description: 'أكملت 10 مراحل' });
    }

    // Badge: المتنافس
    if (this.stats.competitionsCount >= 1) {
      badges.push({ name: 'المتنافس', icon: '⚔️', description: 'شاركت في مسابقة' });
    }

    // Badge: بطل السراج
    if (this.stats.competitionsCount >= 3) {
      badges.push({ name: 'بطل السراج', icon: '🏆', description: 'شاركت في 3 مسابقات' });
    }

    // Badge: الباحث
    if (this.stats.researchCount >= 1) {
      badges.push({ name: 'الباحث', icon: '🔬', description: 'قدمت بحثاً علمياً' });
    }

    this.stats.badges = badges;
  }

  render() {
    this.renderWelcome();
    this.renderStatsCards();
    this.renderBadges();
    this.renderDevelopProgress();
    this.renderCompetitions();
    this.renderRecentActivities();
    this.renderProfile();
  }

  renderWelcome() {
    const welcomeEl = document.getElementById('student-welcome');
    if (!welcomeEl || !this.profile) return;

    const firstName = (this.profile.full_name || '').split(' ')[0] || 'طالب سراج';
    const currentHour = new Date().getHours();
    let greeting = 'مرحباً';
    
    if (currentHour < 12) greeting = 'صباح الخير';
    else if (currentHour < 18) greeting = 'مساء الخير';
    else greeting = 'مساء الخير';

    welcomeEl.innerHTML = `
      <div class="welcome-content">
        <h1 class="welcome-title">${greeting}، ${this.escapeHtml(firstName)} 👋</h1>
        <p class="welcome-subtitle">
          ${this.profile.school_type === 'abu_obaida' ? 'مدرسة أبو عبيدة' : this.escapeHtml(this.profile.school_name || '')} 
          · الصف ${this.escapeHtml(this.profile.grade)} 
          · شعبة ${this.escapeHtml(this.profile.section)}
        </p>
      </div>
    `;
  }

  renderStatsCards() {
    const statsContainer = document.getElementById('stats-cards');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-content">
          <h3 class="stat-value">${this.stats.completedLevels}</h3>
          <p class="stat-label">مرحلة مكتملة</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <h3 class="stat-value">${this.stats.competitionsCount}</h3>
          <p class="stat-label">مسابقة مشاركة</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <h3 class="stat-value">${this.stats.totalChallengeScore}</h3>
          <p class="stat-label">نقطة محصلة</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🎖️</div>
        <div class="stat-content">
          <h3 class="stat-value">${this.stats.badges.length}</h3>
          <p class="stat-label">شارة مكتسبة</p>
        </div>
      </div>
    `;
  }

  renderBadges() {
    const badgesContainer = document.getElementById('badges-container');
    if (!badgesContainer) return;

    if (this.stats.badges.length === 0) {
      badgesContainer.innerHTML = `
        <div class="empty-state-small">
          <div class="empty-icon">🎖️</div>
          <p>ابدأ التحديات والمسابقات لكسب الشارات!</p>
        </div>
      `;
      return;
    }

    badgesContainer.innerHTML = this.stats.badges.map(badge => `
      <div class="badge-item" title="${this.escapeHtml(badge.description)}">
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-name">${this.escapeHtml(badge.name)}</div>
      </div>
    `).join('');
  }

  renderDevelopProgress() {
    const container = document.getElementById('develop-progress');
    if (!container) return;

    if (this.stats.completedLevels === 0 && this.stats.inProgressLevels === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <div class="empty-icon">📖</div>
          <p>لم تبدأ أي تحدٍ بعد</p>
          <a href="develop.html" class="btn btn-primary btn-sm">ابدأ الآن</a>
        </div>
      `;
      return;
    }

    const total = this.stats.completedLevels + this.stats.inProgressLevels;
    const progress = total > 0 ? Math.round((this.stats.completedLevels / total) * 100) : 0;

    container.innerHTML = `
      <div class="progress-overview">
        <div class="progress-stats">
          <div class="progress-stat">
            <span class="progress-stat-value">${this.stats.completedLevels}</span>
            <span class="progress-stat-label">مكتملة</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">${this.stats.inProgressLevels}</span>
            <span class="progress-stat-label">قيد التقدم</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">${this.stats.totalChallengeScore}</span>
            <span class="progress-stat-label">نقطة</span>
          </div>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="progress-percentage">${progress}% مكتمل</div>
        
        <a href="develop.html" class="btn btn-outline btn-sm" style="margin-top: 1rem;">
          متابعة التقدم ←
        </a>
      </div>
    `;
  }

  renderCompetitions() {
    const container = document.getElementById('competitions-list');
    if (!container) return;

    if (this.stats.competitionsCount === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <div class="empty-icon">🏆</div>
          <p>لم تشارك في أي مسابقة بعد</p>
          <a href="competition.html" class="btn btn-primary btn-sm">اكتشف المسابقات</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="competitions-summary">
        <div class="comp-stat">
          <span class="comp-stat-icon">🎯</span>
          <div>
            <div class="comp-stat-value">${this.stats.competitionsCount}</div>
            <div class="comp-stat-label">مسابقة مشاركة</div>
          </div>
        </div>
        
        ${this.stats.bestCompetitionScore !== null ? `
          <div class="comp-stat">
            <span class="comp-stat-icon">⭐</span>
            <div>
              <div class="comp-stat-value">${this.stats.bestCompetitionScore}</div>
              <div class="comp-stat-label">أفضل نتيجة</div>
            </div>
          </div>
        ` : ''}
        
        <a href="competition.html" class="btn btn-outline btn-sm">
          عرض جميع المسابقات ←
        </a>
      </div>
    `;
  }

  renderRecentActivities() {
    const container = document.getElementById('recent-activities');
    if (!container) return;

    if (this.recentActivities.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <div class="empty-icon">📋</div>
          <p>لا توجد أنشطة حديثة</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.recentActivities.map(activity => {
      const dateStr = this.formatDate(activity.date);
      const scoreStr = activity.score !== null ? `· ${activity.score} نقطة` : '';
      
      return `
        <div class="activity-item">
          <div class="activity-icon">${activity.icon}</div>
          <div class="activity-content">
            <div class="activity-title">${this.escapeHtml(activity.title)}</div>
            <div class="activity-meta">${dateStr} ${scoreStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderProfile() {
    const container = document.getElementById('profile-info');
    if (!container || !this.profile) return;

    const joinDate = this.formatDate(this.profile.created_at);

    container.innerHTML = `
      <div class="profile-field">
        <span class="profile-label">الاسم الكامل</span>
        <span class="profile-value">${this.escapeHtml(this.profile.full_name || '-')}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">البريد الإلكتروني</span>
        <span class="profile-value">${this.escapeHtml(this.profile.email || this.user.email || '-')}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">الصف والشعبة</span>
        <span class="profile-value">الصف ${this.escapeHtml(this.profile.grade)} - شعبة ${this.escapeHtml(this.profile.section)}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">المدرسة</span>
        <span class="profile-value">${
          this.profile.school_type === 'abu_obaida' 
            ? 'مدرسة أبو عبيدة بن الجراح' 
            : this.escapeHtml(this.profile.school_name || 'مدرسة أخرى')
        }</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">تاريخ الانضمام</span>
        <span class="profile-value">${joinDate}</span>
      </div>
    `;
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'اليوم';
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
      if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
      
      return date.toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const studentDashboard = new StudentDashboardController();
