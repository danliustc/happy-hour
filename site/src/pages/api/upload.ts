import type { APIRoute } from 'astro';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = `images/${locals.user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { IMAGES, R2_PUBLIC_URL } = locals.runtime.env;

  await IMAGES.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });

  const url = `${R2_PUBLIC_URL}/${key}`;

  return new Response(JSON.stringify({ url, key }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
