/**
 * Theme Management Tool
 * Handles Light/Dark mode transitions, system preferences, and local storage persistence.
 * Olive Modern Theme — Siraj Educational Platform
 */

const ThemeManager = {
  themeToggleBtn: null,

  init() {
    this.themeToggleBtn = document.getElementById("theme-toggle");

    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener("click", () => this.toggleTheme());
    }

    this.applyInitialTheme();

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("siraj-theme")) {
          this.setTheme(e.matches ? "dark" : "light");
        }
      });
  },

  applyInitialTheme() {
    const savedTheme = localStorage.getItem("siraj-theme");

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      this.setTheme(prefersDark ? "dark" : "light");
    }
  },

  setTheme(themeName) {
    if (themeName === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    this.updateToggleButtonIcon(themeName);
  },

  toggleTheme() {
    const isDark = document.documentElement.hasAttribute("data-theme");
    const newTheme = isDark ? "light" : "dark";

    // Add transition class for smooth theme switch
    document.body.classList.add("theme-transitioning");

    this.setTheme(newTheme);
    localStorage.setItem("siraj-theme", newTheme);

    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove("theme-transitioning");
    }, 600);
  },

  updateToggleButtonIcon(theme) {
    if (!this.themeToggleBtn) return;

    // Switch between Moon (Light Theme) and Sun (Dark Theme) icons
    if (theme === "dark") {
      // Sun SVG
      this.themeToggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      `;
    } else {
      // Moon SVG
      this.themeToggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      `;
    }
  },
};

export default ThemeManager;
