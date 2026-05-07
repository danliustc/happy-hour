import type { APIRoute } from 'astro';
import { getDB, createArticle, setArticleTags, createUniqueSlug } from '../../../lib/db';
import { renderMarkdown } from '../../../lib/markdown';
import { updateUserEmbedding } from '../../../lib/ai';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await parseArticleRequest(request);
  if ('error' in body) {
    return json({ error: body.error }, body.status);
  }

  const db = getDB(locals);
  const slug = await createUniqueSlug(db, locals.user.id, body.title);
  const body_html = renderMarkdown(body.body_markdown);

  const article = await createArticle(db, {
    user_id: locals.user.id,
    title: body.title.trim(),
    slug,
    body_markdown: body.body_markdown,
    body_html,
  });

  if (body.tags?.length) {
    await setArticleTags(db, article.id, body.tags);
  }

  const userId = locals.user.id;
  const ai = locals.runtime.env.AI;
  locals.runtime.ctx.waitUntil(updateUserEmbedding(db, ai, userId));

  return new Response(JSON.stringify({ id: article.id, slug: article.slug }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function parseArticleRequest(request: Request): Promise<
  { title: string; body_markdown: string; tags: string[] } | { error: string; status: number }
> {
  let body: { title?: unknown; body_markdown?: unknown; tags?: unknown };
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid JSON body', status: 400 };
  }

  if (typeof body.title !== 'string' || typeof body.body_markdown !== 'string') {
    return { error: 'Title and body are required', status: 400 };
  }

  const title = body.title.trim();
  const bodyMarkdown = body.body_markdown.trim();
  if (!title || !bodyMarkdown) {
    return { error: 'Title and body are required', status: 400 };
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean)
    : [];

  return { title, body_markdown: bodyMarkdown, tags };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
