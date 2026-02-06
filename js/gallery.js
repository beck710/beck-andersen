/**
 * Gallery — Tag filtering and AI semantic search.
 *
 * Client-side filtering works without any backend.
 * AI search calls the Cloudflare Worker endpoint and is optional —
 * if the endpoint is unavailable, the gallery degrades gracefully.
 */

import { SEARCH_ENDPOINT } from './config.js';
import imageLoader from './image-loader.js';

class Gallery {
  constructor() {
    this.grid = document.getElementById('gallery-grid');
    this.searchInput = document.getElementById('gallery-search');
    this.filterBar = document.querySelector('.filter-bar');
    this.emptyState = document.querySelector('.gallery-page__empty');
    this.allItems = [];
    this.activeTag = 'all';
    this.searchDebounceTimer = null;
    this.isSearching = false;

    this.init();
  }

  init() {
    if (!this.grid) return;

    // Cache all gallery items
    this.allItems = [...this.grid.querySelectorAll('.gallery-item')];

    // Tag filter click handlers
    if (this.filterBar) {
      this.filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tag]');
        if (btn) {
          this.filterByTag(btn.dataset.tag);
          // Clear search when clicking a filter
          if (this.searchInput) {
            this.searchInput.value = '';
          }
        }
      });
    }

    // Search input with debounce
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounceTimer);
        const query = e.target.value.trim();

        this.searchDebounceTimer = setTimeout(() => {
          this.handleSearch(query);
        }, 300);
      });

      // Submit on Enter
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(this.searchDebounceTimer);
          this.handleSearch(this.searchInput.value.trim());
        }
      });
    }
  }

  /**
   * Filter gallery items by tag.
   */
  filterByTag(tag) {
    this.activeTag = tag;
    this.isSearching = false;

    // Update active state on filter buttons
    if (this.filterBar) {
      this.filterBar.querySelectorAll('[data-tag]').forEach(btn => {
        const isActive = btn.dataset.tag === tag;
        btn.classList.toggle('filter-bar__tag--active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
    }

    // Show/hide items
    let visibleCount = 0;
    this.allItems.forEach(item => {
      const tags = (item.dataset.tags || '').split(',').map(t => t.trim());
      const visible = tag === 'all' || tags.includes(tag);
      item.style.display = visible ? '' : 'none';
      item.style.order = '';
      if (visible) visibleCount++;
    });

    this.updateEmptyState(visibleCount === 0);
  }

  /**
   * Handle AI semantic search.
   */
  async handleSearch(query) {
    if (query.length < 2) {
      // Reset to tag filter view
      this.filterByTag(this.activeTag);
      return;
    }

    this.isSearching = true;
    this.grid.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`${SEARCH_ENDPOINT}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 50 })
      });

      if (!response.ok) {
        throw new Error(`Search returned ${response.status}`);
      }

      const results = await response.json();
      const resultMap = new Map(results.map((r, i) => [r.id, i]));

      // Reorder and filter gallery items based on results
      let visibleCount = 0;
      this.allItems.forEach(item => {
        const imageId = item.dataset.imageId;
        const inResults = resultMap.has(imageId);
        item.style.display = inResults ? '' : 'none';
        if (inResults) {
          item.style.order = String(resultMap.get(imageId));
          visibleCount++;
        }
      });

      this.updateEmptyState(visibleCount === 0);

      // Re-observe newly visible images
      if (this.grid) {
        imageLoader.observeAll(this.grid);
      }
    } catch (err) {
      console.warn('[Gallery] Search error:', err.message);
      // Graceful degradation: fall back to client-side text matching
      this.localSearch(query);
    } finally {
      this.grid.removeAttribute('aria-busy');
    }
  }

  /**
   * Fallback: simple client-side text search on alt text and tags.
   */
  localSearch(query) {
    const terms = query.toLowerCase().split(/\s+/);
    let visibleCount = 0;

    this.allItems.forEach(item => {
      const searchText = [
        item.dataset.tags || '',
        item.querySelector('img[alt]')?.alt || ''
      ].join(' ').toLowerCase();

      const matches = terms.every(term => searchText.includes(term));
      item.style.display = matches ? '' : 'none';
      item.style.order = '';
      if (matches) visibleCount++;
    });

    this.updateEmptyState(visibleCount === 0);
  }

  /**
   * Show or hide the empty state message.
   */
  updateEmptyState(isEmpty) {
    if (this.emptyState) {
      this.emptyState.style.display = isEmpty ? '' : 'none';
    }
  }
}

new Gallery();
