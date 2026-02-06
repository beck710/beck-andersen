/**
 * Sync Gallery Tags
 *
 * Fetches current tags and image metadata from the gallery-search
 * Cloudflare Worker and writes them to data/gallery-tags.json
 * for the static site fallback.
 *
 * Usage:
 *   node scripts/sync-gallery-tags.js
 */

import 'dotenv/config';
import { writeFile, readFile } from 'fs/promises';

// Read the search endpoint from config or env
const SEARCH_ENDPOINT = process.env.SEARCH_ENDPOINT || 'https://gallery-search.beckandersen.workers.dev';

/**
 * Fetch tags from the gallery-search Worker.
 */
async function fetchTags() {
  const response = await fetch(`${SEARCH_ENDPOINT}/tags`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch all indexed images from the gallery-search Worker.
 */
async function fetchImages() {
  const response = await fetch(`${SEARCH_ENDPOINT}/images`);
  if (!response.ok) {
    throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Main entry point.
 */
async function main() {
  console.log('=== Sync Gallery Tags ===');
  console.log(`Endpoint: ${SEARCH_ENDPOINT}\n`);

  try {
    // Fetch tags
    console.log('Fetching tags...');
    const tags = await fetchTags();
    console.log(`  Found ${tags.length} tags.`);

    // Try to fetch image metadata
    let images = [];
    try {
      console.log('Fetching image metadata...');
      images = await fetchImages();
      console.log(`  Found ${images.length} images.`);
    } catch (err) {
      console.log(`  Image metadata endpoint not available: ${err.message}`);
      console.log('  Proceeding with tags only.');
    }

    // Write to gallery-tags.json
    const data = {
      tags: tags.sort(),
      images,
      lastSynced: new Date().toISOString(),
    };

    await writeFile('data/gallery-tags.json', JSON.stringify(data, null, 2));
    console.log('\nWritten to: data/gallery-tags.json');
    console.log(`  Tags: ${data.tags.join(', ')}`);
    console.log(`  Images: ${data.images.length}`);
    console.log(`  Synced at: ${data.lastSynced}`);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    console.log('\nThe gallery-search Worker may not be deployed yet.');
    console.log('Deploy it first, then run this script again.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
