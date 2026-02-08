/**
 * Lightbox — Fullscreen image viewer with navigation and zoom.
 *
 * Features:
 *   - Click any .image-container to open fullscreen
 *   - Navigate between images with left/right arrows or click prev/next
 *   - Close with X button or Escape key
 *   - Click image once in fullscreen to zoom based on native pixel dimensions
 *   - Click again or press Escape to exit zoom
 *   - Supports mouse drag to pan while zoomed
 *   - Touch swipe to navigate between images
 */

import { CDN_BASE } from './config.js';

class Lightbox {
  constructor() {
    this.images = [];
    this.currentIndex = 0;
    this.isOpen = false;
    this.isZoomed = false;
    this.dragState = null;
    this.touchStartX = 0;
    this.touchStartY = 0;

    this.buildDOM();
    this.bindGlobalEvents();
    this.attachToImages();
  }

  /**
   * Resolve image URL consistently with the image-loader pattern.
   */
  resolveUrl(src) {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return `${CDN_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
  }

  /**
   * Build the lightbox overlay DOM structure.
   */
  buildDOM() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'lightbox';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Image viewer');
    this.overlay.setAttribute('aria-modal', 'true');

    this.overlay.innerHTML = `
      <button class="lightbox__close" aria-label="Close viewer">&times;</button>
      <button class="lightbox__prev" aria-label="Previous image">&#8249;</button>
      <button class="lightbox__next" aria-label="Next image">&#8250;</button>
      <div class="lightbox__stage">
        <img class="lightbox__img" alt="" draggable="false">
      </div>
      <div class="lightbox__counter"></div>
    `;

    this.closeBtn = this.overlay.querySelector('.lightbox__close');
    this.prevBtn = this.overlay.querySelector('.lightbox__prev');
    this.nextBtn = this.overlay.querySelector('.lightbox__next');
    this.stage = this.overlay.querySelector('.lightbox__stage');
    this.img = this.overlay.querySelector('.lightbox__img');
    this.counter = this.overlay.querySelector('.lightbox__counter');

    // Close button
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Prev/Next buttons
    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });

    this.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });

    // Stage click — toggle zoom or navigate
    this.stage.addEventListener('click', (e) => {
      if (e.target === this.prevBtn || e.target === this.nextBtn || e.target === this.closeBtn) return;
      if (this.isZoomed) {
        this.zoomOut();
      } else {
        this.zoomIn(e);
      }
    });

    // Mouse drag for panning while zoomed
    this.stage.addEventListener('mousedown', (e) => {
      if (!this.isZoomed) return;
      e.preventDefault();
      this.dragState = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: this.stage.scrollLeft,
        scrollTop: this.stage.scrollTop
      };
      this.stage.style.cursor = 'grabbing';
    });

    this.stage.addEventListener('mousemove', (e) => {
      if (!this.dragState) return;
      e.preventDefault();
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      this.stage.scrollLeft = this.dragState.scrollLeft - dx;
      this.stage.scrollTop = this.dragState.scrollTop - dy;
    });

    this.stage.addEventListener('mouseup', () => {
      if (this.dragState) {
        this.dragState = null;
        this.stage.style.cursor = '';
      }
    });

    this.stage.addEventListener('mouseleave', () => {
      if (this.dragState) {
        this.dragState = null;
        this.stage.style.cursor = '';
      }
    });

    // Touch swipe for navigation
    this.stage.addEventListener('touchstart', (e) => {
      if (this.isZoomed) return;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.stage.addEventListener('touchend', (e) => {
      if (this.isZoomed) return;
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      // Only navigate if horizontal swipe is dominant and significant
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) this.prev();
        else this.next();
      }
    }, { passive: true });

    document.body.appendChild(this.overlay);
  }

  /**
   * Bind keyboard events.
   */
  bindGlobalEvents() {
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      switch (e.key) {
        case 'Escape':
          if (this.isZoomed) {
            this.zoomOut();
          } else {
            this.close();
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (!this.isZoomed) this.prev();
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (!this.isZoomed) this.next();
          e.preventDefault();
          break;
      }
    });
  }

  /**
   * Find and attach click listeners to all image containers on the page.
   * Groups images by their parent section for navigation context.
   */
  attachToImages() {
    // Collect image groups — each .project-page__images or .gallery-grid
    // gets its own group, or all images on page if no grouping container
    const containers = document.querySelectorAll('.image-container');
    if (!containers.length) return;

    containers.forEach((container) => {
      // Skip containers inside project-cards (home page) — those are links
      if (container.closest('.project-card')) return;

      container.style.cursor = 'pointer';
      container.addEventListener('click', (e) => {
        e.preventDefault();
        this.openFromContainer(container);
      });
    });
  }

  /**
   * Collect the image set from the same parent group and open.
   */
  openFromContainer(container) {
    // Find the group this container belongs to
    const group = container.closest('.project-page__images')
      || container.closest('.piece-carousel__images')
      || container.closest('.gallery-grid')
      || container.parentElement;

    const allContainers = group.querySelectorAll('.image-container');
    this.images = [];
    let clickedIndex = 0;

    allContainers.forEach((c, i) => {
      // Skip containers inside project-cards
      if (c.closest('.project-card')) return;

      const fullImg = c.querySelector('.image-container__full');
      if (!fullImg) return;

      const src = fullImg.src || fullImg.dataset.src;
      if (!src) return;

      const resolvedSrc = this.resolveUrl(src);
      const alt = fullImg.getAttribute('alt') || '';
      const w = parseInt(fullImg.getAttribute('width'), 10) || 0;
      const h = parseInt(fullImg.getAttribute('height'), 10) || 0;

      if (c === container) clickedIndex = this.images.length;

      this.images.push({ src: resolvedSrc, alt, width: w, height: h });
    });

    if (this.images.length === 0) return;

    this.currentIndex = clickedIndex;
    this.open();
  }

  /**
   * Open the lightbox.
   */
  open() {
    this.isOpen = true;
    this.overlay.classList.add('lightbox--open');
    document.body.style.overflow = 'hidden';
    this.showImage();
    // Trap focus
    this.closeBtn.focus();
  }

  /**
   * Close the lightbox.
   */
  close() {
    if (this.isZoomed) this.zoomOut();
    this.isOpen = false;
    this.overlay.classList.remove('lightbox--open');
    document.body.style.overflow = '';
  }

  /**
   * Show the current image.
   */
  showImage() {
    if (this.isZoomed) this.zoomOut();

    const data = this.images[this.currentIndex];
    this.img.src = data.src;
    this.img.alt = data.alt;

    // Store native dimensions for zoom
    this.img.dataset.nativeWidth = data.width;
    this.img.dataset.nativeHeight = data.height;

    // Update counter
    this.counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;

    // Update nav button visibility
    this.prevBtn.style.display = this.currentIndex > 0 ? '' : 'none';
    this.nextBtn.style.display = this.currentIndex < this.images.length - 1 ? '' : 'none';
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.showImage();
    }
  }

  next() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.showImage();
    }
  }

  /**
   * Zoom into the image based on its native pixel dimensions.
   * If native dimensions are larger than the viewport, zoom to native size.
   * Otherwise zoom to a minimum useful scale (1.5x fitted size).
   */
  zoomIn(e) {
    const nativeW = parseInt(this.img.dataset.nativeWidth, 10);
    const nativeH = parseInt(this.img.dataset.nativeHeight, 10);

    if (!nativeW || !nativeH) return;

    // Calculate the fitted size (how the image is displayed in fit mode)
    const viewW = this.stage.clientWidth;
    const viewH = this.stage.clientHeight;
    const fittedScale = Math.min(viewW / nativeW, viewH / nativeH, 1);
    const fittedW = nativeW * fittedScale;
    const fittedH = nativeH * fittedScale;

    // Determine zoom scale: use native size if it's meaningfully larger, else 1.5x
    let zoomScale;
    if (nativeW > fittedW * 1.2 || nativeH > fittedH * 1.2) {
      zoomScale = 1; // native pixels = 1:1
    } else {
      zoomScale = 1.5 * fittedScale; // enlarge to 1.5x fit
    }

    const zoomedW = nativeW * zoomScale;
    const zoomedH = nativeH * zoomScale;

    this.isZoomed = true;
    this.overlay.classList.add('lightbox--zoomed');

    // Set image to zoomed dimensions
    this.img.style.width = `${zoomedW}px`;
    this.img.style.height = `${zoomedH}px`;
    this.img.style.maxWidth = 'none';
    this.img.style.maxHeight = 'none';

    // Center scroll on click point
    requestAnimationFrame(() => {
      if (e) {
        const rect = this.stage.getBoundingClientRect();
        const clickRatioX = (e.clientX - rect.left) / rect.width;
        const clickRatioY = (e.clientY - rect.top) / rect.height;
        this.stage.scrollLeft = (zoomedW - viewW) * clickRatioX;
        this.stage.scrollTop = (zoomedH - viewH) * clickRatioY;
      } else {
        // Center
        this.stage.scrollLeft = (zoomedW - viewW) / 2;
        this.stage.scrollTop = (zoomedH - viewH) / 2;
      }
    });
  }

  /**
   * Zoom out to fit view.
   */
  zoomOut() {
    this.isZoomed = false;
    this.overlay.classList.remove('lightbox--zoomed');
    this.img.style.width = '';
    this.img.style.height = '';
    this.img.style.maxWidth = '';
    this.img.style.maxHeight = '';
    this.stage.scrollLeft = 0;
    this.stage.scrollTop = 0;
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Lightbox());
} else {
  new Lightbox();
}

export default Lightbox;
