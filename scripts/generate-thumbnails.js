/**
 * Generate Thumbnails
 *
 * Reads images from Cloudflare R2 and generates thumbnails using sharp.
 *
 * Usage:
 *   node scripts/generate-thumbnails.js --project as-light-turns-into-day
 *   node scripts/generate-thumbnails.js --all
 *   node scripts/generate-thumbnails.js --gallery
 */

import 'dotenv/config';
import { readFile } from 'fs/promises';
import sharp from 'sharp';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

// Configuration
const THUMB_WIDTH = 800;
const THUMB_QUALITY = 80;
const THUMB_FORMAT = 'jpeg';

// R2 client
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

/**
 * Check if an object exists in R2.
 */
async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * List all objects under a given prefix.
 */
async function listObjects(prefix) {
  const objects = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(command);

    if (response.Contents) {
      objects.push(...response.Contents);
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

/**
 * Download an object from R2 as a Buffer.
 */
async function downloadObject(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Upload a buffer to R2.
 */
async function uploadObject(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

/**
 * Generate a thumbnail from an image buffer.
 */
async function generateThumbnail(inputBuffer) {
  return sharp(inputBuffer)
    .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY, progressive: true })
    .toBuffer();
}

/**
 * Check if a file is an image based on its extension.
 */
function isImage(key) {
  return /\.(jpe?g|png|webp|tiff?)$/i.test(key);
}

/**
 * Convert a full image path to its thumbnail path.
 * projects/slug/full/01.jpg -> projects/slug/thumb/01.jpg
 * gallery/full/001.jpg -> gallery/thumb/001.jpg
 */
function toThumbKey(key) {
  return key.replace('/full/', '/thumb/');
}

/**
 * Process all images under a prefix.
 */
async function processPrefix(prefix) {
  console.log(`\nScanning: ${prefix}`);
  const objects = await listObjects(prefix);
  const images = objects.filter(obj => isImage(obj.Key));

  if (images.length === 0) {
    console.log('  No images found.');
    return { processed: 0, skipped: 0, errors: 0 };
  }

  console.log(`  Found ${images.length} images.`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const obj of images) {
    const thumbKey = toThumbKey(obj.Key);

    // Skip if thumbnail already exists
    if (await objectExists(thumbKey)) {
      console.log(`  SKIP: ${thumbKey} (exists)`);
      skipped++;
      continue;
    }

    try {
      // Download original
      const imageBuffer = await downloadObject(obj.Key);

      // Generate thumbnail
      const thumbBuffer = await generateThumbnail(imageBuffer);

      // Upload thumbnail
      await uploadObject(thumbKey, thumbBuffer, 'image/jpeg');

      const originalKB = Math.round(obj.Size / 1024);
      const thumbKB = Math.round(thumbBuffer.length / 1024);
      console.log(`  DONE: ${thumbKey} (${originalKB}KB -> ${thumbKB}KB)`);
      processed++;
    } catch (err) {
      console.error(`  ERROR: ${obj.Key}: ${err.message}`);
      errors++;
    }
  }

  return { processed, skipped, errors };
}

/**
 * Process a single project.
 */
async function processProject(slug) {
  const prefix = `projects/${slug}/full/`;
  return processPrefix(prefix);
}

/**
 * Process all projects from projects.json.
 */
async function processAllProjects() {
  const projectsJson = await readFile('data/projects.json', 'utf-8');
  const projects = JSON.parse(projectsJson);
  const totals = { processed: 0, skipped: 0, errors: 0 };

  for (const project of projects) {
    const result = await processProject(project.slug);
    totals.processed += result.processed;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }

  return totals;
}

/**
 * Process gallery images.
 */
async function processGallery() {
  const prefix = 'gallery/full/';
  return processPrefix(prefix);
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  const projectFlag = args.indexOf('--project');
  const allFlag = args.includes('--all');
  const galleryFlag = args.includes('--gallery');

  console.log('=== Thumbnail Generator ===');
  console.log(`Bucket: ${BUCKET}`);

  let totals;

  if (projectFlag !== -1 && args[projectFlag + 1]) {
    const slug = args[projectFlag + 1];
    console.log(`Mode: Single project (${slug})`);
    totals = await processProject(slug);
  } else if (allFlag) {
    console.log('Mode: All projects');
    totals = await processAllProjects();
  } else if (galleryFlag) {
    console.log('Mode: Gallery');
    totals = await processGallery();
  } else {
    console.log('Usage:');
    console.log('  node scripts/generate-thumbnails.js --project <slug>');
    console.log('  node scripts/generate-thumbnails.js --all');
    console.log('  node scripts/generate-thumbnails.js --gallery');
    process.exit(1);
  }

  console.log('\n=== Summary ===');
  console.log(`  Generated: ${totals.processed}`);
  console.log(`  Skipped:   ${totals.skipped}`);
  console.log(`  Errors:    ${totals.errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
