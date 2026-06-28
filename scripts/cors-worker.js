// Cloudflare Worker - Proxy R2 với CORS headers
// Deploy: wrangler deploy cors-worker.js

const BUCKET = 'bio3d-models';
const ALLOWED_ORIGINS = ['*'];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response('Not found', { status: 404 });
    }

    const object = await env.BUCKET.get(key);

    if (object === null) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers(object.httpMetadata);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    headers.set('Content-Type', object.httpMetadata?.contentType || 'model/gltf-binary');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  }
};
