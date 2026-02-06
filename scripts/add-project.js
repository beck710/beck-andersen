/**
 * Add Project — Interactive CLI for creating new project pages.
 *
 * Prompts for project details, optionally uses Claude to polish the description,
 * generates thumbnails, creates the HTML page, and updates projects.json.
 *
 * Usage:
 *   node scripts/add-project.js
 */

import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { createInterface } from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import {
  S3Client,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const CDN_BASE = process.env.CDN_BASE_URL;
const BUCKET = process.env.R2_BUCKET;

// R2 client
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Readline prompt helper.
 */
function createPrompt() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask(question) {
      return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
      });
    },
    close() {
      rl.close();
    },
  };
}

/**
 * List images in R2 for a given project slug.
 */
async function listProjectImages(slug) {
  const prefix = `projects/${slug}/full/`;
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

  return objects
    .filter(obj => /\.(jpe?g|png|webp)$/i.test(obj.Key))
    .map(obj => {
      const filename = obj.Key.split('/').pop();
      return {
        key: obj.Key,
        filename,
        src: `/projects/${slug}/full/${filename}`,
        thumb: `/projects/${slug}/thumb/${filename}`,
      };
    });
}

/**
 * Use Claude to generate a polished project description.
 */
async function generateDescription(title, year, medium, roughDescription) {
  const systemPrompt = `You are writing artist project descriptions for Beck Andersen, a contemporary photographer and installation artist based in Chicago. Their work explores networks of dependence and trust, photography as data, and the space between documentation and construction.

Write in a voice that is precise, measured, and intellectually engaged without being academic. Use present tense. Avoid jargon for its own sake. The description should feel like it belongs alongside these existing descriptions:

- "This project examines light as humanity's first unit of measurement — an initial tool by which we began to order time and space."
- "Pseudo-Data occupies the space between information and fabrication, producing images that adopt the visual language of empirical evidence while undermining its authority."

Write exactly 2-3 sentences. No more.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Write a project description for:
Title: ${title}
Year: ${year}
Medium: ${medium}
Rough notes: ${roughDescription}`,
      },
    ],
  });

  return message.content[0].text;
}

/**
 * Generate the HTML for a project page.
 */
function generateProjectHTML({ slug, title, year, medium, description, images, prev, next }) {
  const imageContainers = images.map(img => `
      <div class="image-container">
        <img class="image-container__thumb"
             src="${CDN_BASE}${img.thumb}"
             alt="" aria-hidden="true" width="40" height="30">
        <img class="image-container__full"
             data-src="${img.src}"
             alt="${title}"
             width="1200" height="900" loading="lazy">
      </div>`).join('\n');

  const prevLink = prev
    ? `      <a href="/projects/${prev}.html">&larr; Previous</a>`
    : '';
  const nextLink = next
    ? `      <a href="/projects/${next}.html">Next &rarr;</a>`
    : '';

  const prevData = prev ? `\n         data-prev-project="/projects/${prev}.html"` : '';
  const nextData = next ? `\n         data-next-project="/projects/${next}.html"` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Beck Andersen</title>
  <meta name="description" content="${description.substring(0, 160)}">
  <meta property="og:title" content="${title} — Beck Andersen">
  <meta property="og:description" content="${medium} — ${year}">
  <meta property="og:image" content="${CDN_BASE}/projects/${slug}/full/cover.jpg">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/css/variables.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/css/pages.css">
</head>
<body>
  <nav class="site-nav" role="navigation" aria-label="Main navigation">
    <a class="site-nav__name" href="/">beck andersen</a>
    <button class="site-nav__toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">
      <span class="site-nav__toggle-icon"></span>
    </button>
    <div class="site-nav__links" id="nav-links">
      <a href="/" class="active">work</a>
      <a href="/gallery.html">gallery</a>
      <a href="/point-clouds.html">point clouds</a>
      <a href="/about.html">about</a>
    </div>
  </nav>

  <main class="project-page">
    <header class="project-page__header">
      <h1>${title}</h1>
      <p class="project-page__meta">${year} | ${medium}</p>
    </header>

    <div class="project-page__description">
      <p>${description}</p>
    </div>

    <div class="project-page__images">
${imageContainers}
    </div>

    <nav class="project-page__nav" aria-label="Project navigation"${prevData}${nextData}>
${prevLink}
${nextLink}
    </nav>
  </main>

  <footer class="site-footer">
    <div class="site-footer__links">
      <a href="mailto:contact@beckandersen.com">email</a>
      <a href="https://instagram.com/beckandersen" target="_blank" rel="noopener noreferrer">instagram</a>
    </div>
    <p>&copy; 2025 Beck Andersen</p>
  </footer>

  <script>
    document.querySelector('.site-nav__toggle')?.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      document.getElementById('nav-links').classList.toggle('is-open');
    });
  </script>
  <script type="module" src="/js/image-loader.js"></script>
  <script type="module" src="/js/project-template.js"></script>
</body>
</html>
`;
}

/**
 * Main entry point.
 */
async function main() {
  const prompt = createPrompt();

  console.log('=== Add New Project ===\n');

  // Gather project details
  const slug = await prompt.ask('Project slug (e.g., new-work): ');
  const title = await prompt.ask('Project title: ');
  const year = await prompt.ask('Year: ');
  const medium = await prompt.ask('Medium/materials: ');

  // Description
  const descChoice = await prompt.ask('Write description yourself (w) or generate with AI (g)? ');

  let description;
  if (descChoice.toLowerCase() === 'g') {
    const notes = await prompt.ask('Rough notes about the project (informal is fine): ');
    console.log('\nGenerating description with Claude...');
    description = await generateDescription(title, year, medium, notes);
    console.log(`\nGenerated description:\n"${description}"\n`);
    const accept = await prompt.ask('Accept this description? (y/n): ');
    if (accept.toLowerCase() !== 'y') {
      description = await prompt.ask('Enter your description: ');
    }
  } else {
    description = await prompt.ask('Enter project description: ');
  }

  // Check for images in R2
  console.log(`\nLooking for images in R2: projects/${slug}/full/`);
  const images = await listProjectImages(slug);

  if (images.length === 0) {
    console.log('No images found in R2. The page will be created with placeholder structure.');
    console.log('Upload images later to: projects/' + slug + '/full/');
  } else {
    console.log(`Found ${images.length} images.`);
  }

  // Use placeholder images if none found
  const projectImages = images.length > 0 ? images : [
    { src: `/projects/${slug}/full/01.jpg`, thumb: `/projects/${slug}/thumb/01.jpg`, filename: '01.jpg' },
    { src: `/projects/${slug}/full/02.jpg`, thumb: `/projects/${slug}/thumb/02.jpg`, filename: '02.jpg' },
    { src: `/projects/${slug}/full/03.jpg`, thumb: `/projects/${slug}/thumb/03.jpg`, filename: '03.jpg' },
  ];

  // Read existing projects.json
  let projects;
  try {
    projects = JSON.parse(await readFile('data/projects.json', 'utf-8'));
  } catch {
    projects = [];
  }

  // Determine prev/next
  const lastProject = projects.length > 0 ? projects[projects.length - 1] : null;
  const prev = lastProject ? lastProject.slug : null;

  // Create new project entry
  const newProject = {
    id: slug,
    title,
    year,
    medium,
    slug,
    coverImage: `/projects/${slug}/full/cover.jpg`,
    thumbnailImage: `/projects/${slug}/thumb/cover.jpg`,
    description,
    images: projectImages.map(img => ({
      src: img.src,
      thumb: img.thumb,
      alt: title,
      width: 1200,
      height: 900,
    })),
    tags: [],
    order: projects.length,
    prev,
    next: null,
  };

  // Update the previous last project to point to this one
  if (lastProject) {
    lastProject.next = slug;
  }

  projects.push(newProject);

  // Generate HTML
  const html = generateProjectHTML({
    slug,
    title,
    year,
    medium,
    description,
    images: projectImages,
    prev,
    next: null,
  });

  // Write files
  await mkdir('projects', { recursive: true });
  const htmlPath = `projects/${slug}.html`;
  await writeFile(htmlPath, html);
  console.log(`\nCreated: ${htmlPath}`);

  await writeFile('data/projects.json', JSON.stringify(projects, null, 2));
  console.log('Updated: data/projects.json');

  // Summary
  console.log('\n=== Done ===');
  console.log(`Project page: ${htmlPath}`);
  console.log(`Images: ${projectImages.length}`);
  console.log('\nNext steps:');
  if (images.length === 0) {
    console.log('  1. Upload images to R2: projects/' + slug + '/full/');
  }
  console.log('  2. Run thumbnail generation: npm run generate-thumbnails -- --project ' + slug);
  console.log('  3. Add a project card to index.html');
  console.log('  4. Review and commit changes');

  prompt.close();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
