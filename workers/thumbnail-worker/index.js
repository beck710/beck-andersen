/**
 * Thumbnail Worker
 *
 * Serves images from Cloudflare R2 with optional on-the-fly resizing
 * via query parameters. Handles CORS and caching.
 *
 * Routes:
 *   GET /{path} — Serve an image from R2
 *   GET /{path}?w=800&q=80 — Serve a resized version
 *
 * Bindings:
 *   ASSETS_BUCKET — R2 bucket (portfolio-assets)
 *   ALLOWED_ORIGINS — Comma-separated list of allowed CORS origins
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env, new Response(null, { status: 204 }));
    }

    // Only handle GET requests
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Strip leading slash to get the R2 object key
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // Get the object from R2
      const object = await env.ASSETS_BUCKET.get(key);

      if (!object) {
        return handleCORS(request, env,
          new Response('Not Found', { status: 404 })
        );
      }

      // Determine content type
      const contentType = object.httpMetadata?.contentType
        || guessContentType(key);

      // Build response headers
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('ETag', object.httpEtag);

      // Check if-none-match for 304
      const ifNoneMatch = request.headers.get('If-None-Match');
      if (ifNoneMatch === object.httpEtag) {
        return handleCORS(request, env,
          new Response(null, { status: 304, headers })
        );
      }

      // Check for resize parameters
      const width = parseInt(url.searchParams.get('w'));
      const quality = parseInt(url.searchParams.get('q')) || 80;

      if (width && width > 0 && width <= 4000 && isResizable(contentType)) {
        // Use Cloudflare Image Resizing (requires Image Resizing enabled on the zone)
        // Falls back to original if not available
        try {
          const resizedResponse = await fetch(
            new Request(url.origin + '/' + key, {
              headers: request.headers,
              cf: {
                image: {
                  width: width,
                  quality: quality,
                  fit: 'scale-down',
                  format: 'auto',
                },
              },
            })
          );

          if (resizedResponse.ok) {
            const response = new Response(resizedResponse.body, {
              headers,
            });
            response.headers.set('X-Resized', 'true');
            return handleCORS(request, env, response);
          }
        } catch {
          // Image Resizing not available, serve original
        }
      }

      // Serve original
      const response = new Response(object.body, { headers });
      return handleCORS(request, env, response);

    } catch (err) {
      return handleCORS(request, env,
        new Response(`Internal Server Error: ${err.message}`, { status: 500 })
      );
    }
  },
};

/**
 * Add CORS headers to response.
 */
function handleCORS(request, env, response) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());

  const headers = new Headers(response.headers);

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // No Origin header = not a CORS request, allow it
    headers.set('Access-Control-Allow-Origin', '*');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Guess content type from file extension.
 */
function guessContentType(key) {
  const ext = key.split('.').pop().toLowerCase();
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    ply: 'application/octet-stream',
    json: 'application/json',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Check if a content type supports resizing.
 */
function isResizable(contentType) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType);
}
