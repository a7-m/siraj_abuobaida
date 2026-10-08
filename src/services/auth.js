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
    if (!supabase) throw new Error('Supabase Configuration is missing.');
    // Initiates Google OAuth. Redirects natively.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard.html`
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

  _notify() {
    document.dispatchEvent(new CustomEvent('auth-status-changed', {
      detail: { isLoggedIn: this.isLoggedIn(), user: this.user }
    }));
  }
}

export const authService = new AuthService();
