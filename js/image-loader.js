/**
 * Progressive Image Loader
 *
 * Handles the thumbnail-to-full-resolution crossfade pattern.
 * Each .image-container has two <img> elements:
 *   - .image-container__thumb: small blurred placeholder (loaded eagerly)
 *   - .image-container__full: full-resolution image (loaded lazily via data-src)
 *
 * When the full image enters the viewport, it is preloaded in a hidden Image(),
 * then swapped in with a CSS crossfade triggered by adding .image-container--loaded.
 */

import { CDN_BASE } from './config.js';

class ImageLoader {
  constructor(options = {}) {
    this.rootMargin = options.rootMargin || '100px 0px';
    this.threshold = options.threshold || 0.01;
    this.observer = null;
    this.init();
  }

  init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      document.querySelectorAll('.image-container__full[data-src]')
        .forEach(img => this.loadImage(img));
      return;
    }

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.rootMargin,
        threshold: this.threshold
      }
    );

    document.querySelectorAll('.image-container__full[data-src]')
      .forEach(img => this.observer.observe(img));
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Resolve the full image URL.
   * If data-src starts with http, use as-is.
   * Otherwise prepend CDN_BASE.
   */
  resolveUrl(src) {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    return `${CDN_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
  }

  /**
   * Preload the full-resolution image, then trigger the crossfade.
   */
  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    const fullSrc = this.resolveUrl(src);
    const preloader = new Image();

    preloader.onload = () => {
      img.src = fullSrc;
      img.removeAttribute('data-src');

      const container = img.closest('.image-container');
      if (container) {
        container.classList.add('image-container--loaded');
      }
    };

    preloader.onerror = () => {
      // On error, still attempt to set src (browser may retry)
      // but don't add loaded class — thumbnail stays visible
      console.warn(`[ImageLoader] Failed to load: ${fullSrc}`);
    };

    preloader.src = fullSrc;
  }

  /**
   * Observe a dynamically added image element.
   * Call this after inserting new .image-container__full elements into the DOM.
   */
  observe(img) {
    if (img.dataset.src && this.observer) {
      this.observer.observe(img);
    }
  }

  /**
   * Observe all unloaded images within a container element.
   */
  observeAll(container) {
    const images = container.querySelectorAll('.image-container__full[data-src]');
    images.forEach(img => this.observe(img));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Auto-initialize
const imageLoader = new ImageLoader();
export default imageLoader;
