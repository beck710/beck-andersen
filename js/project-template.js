/**
 * Project Page — Shared logic for all project pages.
 *
 * Features:
 *   - Left/right arrow key navigation between projects
 *   - Thin scroll progress bar at top of viewport
 */

class ProjectPage {
  constructor() {
    this.nav = document.querySelector('.project-page__nav');
    this.initKeyboardNav();
    this.initScrollProgress();
  }

  /**
   * Arrow key navigation between projects.
   * Reads URLs from data attributes on the project nav element.
   */
  initKeyboardNav() {
    if (!this.nav) return;

    const prevUrl = this.nav.dataset.prevProject;
    const nextUrl = this.nav.dataset.nextProject;

    document.addEventListener('keydown', (e) => {
      // Don't navigate if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' && prevUrl) {
        window.location.href = prevUrl;
      }
      if (e.key === 'ArrowRight' && nextUrl) {
        window.location.href = nextUrl;
      }
    });
  }

  /**
   * Thin progress bar fixed at top of page showing scroll position.
   */
  initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Page scroll progress');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    document.body.prepend(bar);

    const update = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;
      bar.style.width = `${pct}%`;
      bar.setAttribute('aria-valuenow', String(pct));
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
  }
}

new ProjectPage();
