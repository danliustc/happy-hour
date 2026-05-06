import type { APIRoute } from 'astro';
import { getDB, getArticleById, createComment } from '../../../lib/db';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: { article_id?: unknown; body?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (typeof body.article_id !== 'number' || typeof body.body !== 'string') {
    return json({ error: 'article_id and body are required' }, 400);
  }

  const text = body.body.trim();
  if (!text) return json({ error: 'Comment cannot be empty' }, 400);
  if (text.length > 2000) return json({ error: 'Comment too long (max 2000 chars)' }, 400);

  const db = getDB(locals);
  const article = await getArticleById(db, body.article_id);
  if (!article) return json({ error: 'Article not found' }, 404);

  const comment = await createComment(db, {
    article_id: body.article_id,
    user_id: locals.user.id,
    body: text,
  });

  return json({
    ...comment,
    author_username: locals.user.username,
    author_display_name: locals.user.display_name,
    author_avatar: locals.user.avatar_url,
  }, 201);
};
