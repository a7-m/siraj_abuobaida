/**
 * Authentication Wrapper utilizing Supabase Auth
 */
import { supabase } from './supabase.js';

class AuthService {
  constructor() {
    this.user = null;
    this.session = null;
    
    // Attempt local load immediately if possible before real async fetch
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        this.session = session;
        this.user = session?.user ?? null;
        this._notify();
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        this.user = session?.user ?? null;
        this._notify();
      });
    }
  }

  isLoggedIn() {
    return !!this.session;
  }

  async getSessionAsync() {
    if (!supabase) return { session: null };
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session Error:', error);
      return { session: null };
    }
    return data;
  }

  async signup(email, password, userData) {
    if (!supabase) throw new Error('Supabase Configuration is missing.');
    
    // Pass custom metadata so the Postgres trigger handles profile creation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.fullName,
          grade: userData.grade,
          section: userData.section
        }
      }
    });

    if (error) throw error;
    return data;
  }

  async login(email, password) {
    if (!supabase) {
      throw new Error('Supabase Configuration is missing. Please add URL and KEY.');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async loginWithGoogle() {
    if (!supabase) throw new Error('إعدادات Supabase غير متوفرة.');
    if (window.location.protocol === 'file:') {
      throw new Error('FILE_PROTOCOL');
    }
    // Calculate the exact URL of dashboard.html relative to the current location
    const redirectUrl = new URL('dashboard.html', window.location.href).href;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) throw error;
    return data;
  }

  async sendPasswordResetEmail(email) {
    if (!supabase) throw new Error('Supabase Configuration is missing.');
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    if (error) throw error;
    return data;
  }

  async updatePassword(newPassword) {
    if (!supabase) throw new Error('Supabase Configuration is missing.');
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  }

  async logout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async checkProfileCompletion() {
    /**
     * Check if user profile has required fields (grade, section)
     * Returns: { complete: boolean, profile: object | null }
     */
    if (!supabase || !this.session?.user) {
      return { complete: false, profile: null };
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, grade, section, school_type, school_name, role')
        .eq('id', this.session.user.id)
        .single();

      if (error) {
        console.error('Profile check error:', error);
        return { complete: false, profile: null };
      }

      // Teachers don't need school info
      if (profile?.role === 'teacher') {
        return { complete: true, profile };
      }

      // Students need grade and section
      const isComplete = !!(profile?.grade && profile?.section);
      
      return { complete: isComplete, profile };
    } catch (e) {
      console.error('Profile completion check failed:', e);
      return { complete: false, profile: null };
    }
  }

  async requireCompleteProfile(redirectOnIncomplete = true) {
    /**
     * Middleware function to check profile completion
     * Redirects to complete-profile.html if incomplete
     * Returns profile if complete, or redirects
     */
    const { session } = await this.getSessionAsync();
    
    if (!session) {
      if (redirectOnIncomplete) {
        window.location.replace('login.html');
      }
      return null;
    }

    const { complete, profile } = await this.checkProfileCompletion();

    if (!complete && redirectOnIncomplete) {
      // Store current page to redirect back after completing profile
      const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
      window.location.replace(`complete-profile.html?redirect=${encodeURIComponent(currentPage)}`);
      return null;
    }

    return profile;
  }

  _notify() {
    document.dispatchEvent(new CustomEvent('auth-status-changed', {
      detail: { isLoggedIn: this.isLoggedIn(), user: this.user }
    }));
  }
}

export const authService = new AuthService();
