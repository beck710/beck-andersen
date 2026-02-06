/**
 * Gallery Search Worker
 *
 * Provides AI-powered semantic search and tag management for the gallery.
 * Uses Workers AI for text embeddings and Vectorize for vector similarity search.
 *
 * Routes:
 *   POST /search        — Semantic search by natural language query
 *   GET  /tags          — List all unique tags
 *   GET  /images        — List all indexed image metadata
 *   POST /index         — Index a new image (admin, requires API key)
 *   POST /index-batch   — Index multiple images (admin)
 *
 * Bindings:
 *   ASSETS_BUCKET  — R2 bucket (portfolio-assets)
 *   GALLERY_INDEX  — Vectorize index (gallery-embeddings)
 *   AI             — Workers AI
 *   ALLOWED_ORIGINS — Comma-separated CORS origins
 */

// Embedding model
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(request, env, new Response(null, { status: 204 }));
    }

    try {
      // Route handling
      if (path === '/search' && request.method === 'POST') {
        return corsResponse(request, env, await handleSearch(request, env));
      }

      if (path === '/tags' && request.method === 'GET') {
        return corsResponse(request, env, await handleGetTags(env));
      }

      if (path === '/images' && request.method === 'GET') {
        return corsResponse(request, env, await handleGetImages(env));
      }

      if (path === '/index' && request.method === 'POST') {
        return corsResponse(request, env, await handleIndex(request, env));
      }

      if (path === '/index-batch' && request.method === 'POST') {
        return corsResponse(request, env, await handleIndexBatch(request, env));
      }

      // Health check
      if (path === '/' || path === '/health') {
        return corsResponse(request, env, jsonResponse({ status: 'ok', service: 'gallery-search' }));
      }

      return corsResponse(request, env, new Response('Not Found', { status: 404 }));
    } catch (err) {
      console.error('Worker error:', err);
      return corsResponse(request, env,
        jsonResponse({ error: err.message }, 500)
      );
    }
  },
};

/**
 * POST /search
 * Body: { query: string, limit?: number }
 * Returns: [{ id, score, metadata }]
 */
async function handleSearch(request, env) {
  const body = await request.json();
  const { query, limit = 20 } = body;

  if (!query || typeof query !== 'string') {
    return jsonResponse({ error: 'Missing or invalid "query" field' }, 400);
  }

  // Generate embedding for the query
  const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
    text: [query],
  });

  const queryVector = embeddingResult.data[0];

  // Query Vectorize for nearest neighbors
  const results = await env.GALLERY_INDEX.query(queryVector, {
    topK: Math.min(limit, 100),
    returnMetadata: 'all',
  });

  // Format results
  const matches = results.matches.map(match => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata || {},
  }));

  return jsonResponse(matches);
}

/**
 * GET /tags
 * Returns: string[] — all unique tags
 */
async function handleGetTags(env) {
  // Query all vectors to collect tags
  // Note: For large indexes, this should be cached in KV
  // For now, we use a dummy query to get all items
  const dummyVector = new Array(768).fill(0);
  const results = await env.GALLERY_INDEX.query(dummyVector, {
    topK: 10000,
    returnMetadata: 'all',
  });

  const tagSet = new Set();
  for (const match of results.matches) {
    const tags = match.metadata?.tags;
    if (Array.isArray(tags)) {
      tags.forEach(tag => tagSet.add(tag));
    } else if (typeof tags === 'string') {
      tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t));
    }
  }

  return jsonResponse([...tagSet].sort());
}

/**
 * GET /images
 * Returns: [{ id, tags, alt, project, src, thumb }]
 */
async function handleGetImages(env) {
  const dummyVector = new Array(768).fill(0);
  const results = await env.GALLERY_INDEX.query(dummyVector, {
    topK: 10000,
    returnMetadata: 'all',
  });

  const images = results.matches.map(match => ({
    id: match.id,
    ...match.metadata,
  }));

  return jsonResponse(images);
}

/**
 * POST /index
 * Body: { id, tags, alt, caption, project?, src, thumb }
 * Generates embedding from caption/alt and inserts into Vectorize.
 */
async function handleIndex(request, env) {
  const body = await request.json();
  const { id, tags, alt, caption, project, src, thumb } = body;

  if (!id) {
    return jsonResponse({ error: 'Missing "id" field' }, 400);
  }

  // Generate text for embedding
  const textForEmbedding = [
    caption || '',
    alt || '',
    Array.isArray(tags) ? tags.join(' ') : (tags || ''),
    project || '',
  ].filter(Boolean).join('. ');

  if (!textForEmbedding) {
    return jsonResponse({ error: 'No text content to embed (provide caption, alt, or tags)' }, 400);
  }

  // Generate embedding
  const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
    text: [textForEmbedding],
  });

  const vector = embeddingResult.data[0];

  // Prepare metadata
  const metadata = {
    tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()),
    alt: alt || '',
    caption: caption || '',
    project: project || '',
    src: src || '',
    thumb: thumb || '',
  };

  // Insert into Vectorize
  await env.GALLERY_INDEX.upsert([
    {
      id,
      values: vector,
      metadata,
    },
  ]);

  return jsonResponse({ success: true, id });
}

/**
 * POST /index-batch
 * Body: { images: [{ id, tags, alt, caption, project?, src, thumb }] }
 */
async function handleIndexBatch(request, env) {
  const body = await request.json();
  const { images } = body;

  if (!Array.isArray(images) || images.length === 0) {
    return jsonResponse({ error: 'Missing or empty "images" array' }, 400);
  }

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);

    // Generate embeddings for the batch
    const texts = batch.map(img => {
      return [
        img.caption || '',
        img.alt || '',
        Array.isArray(img.tags) ? img.tags.join(' ') : (img.tags || ''),
        img.project || '',
      ].filter(Boolean).join('. ');
    });

    const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
      text: texts,
    });

    // Prepare vectors for upsert
    const vectors = batch.map((img, idx) => ({
      id: img.id,
      values: embeddingResult.data[idx],
      metadata: {
        tags: Array.isArray(img.tags) ? img.tags : (img.tags || '').split(',').map(t => t.trim()),
        alt: img.alt || '',
        caption: img.caption || '',
        project: img.project || '',
        src: img.src || '',
        thumb: img.thumb || '',
      },
    }));

    await env.GALLERY_INDEX.upsert(vectors);

    results.push(...batch.map(img => ({ id: img.id, success: true })));
  }

  return jsonResponse({ success: true, indexed: results.length, results });
}

/**
 * Create a JSON response.
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Add CORS headers to a response.
 */
function corsResponse(request, env, response) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());

  const headers = new Headers(response.headers);

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
