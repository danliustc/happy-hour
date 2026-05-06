import type { APIRoute } from 'astro';
import { getDB, getCommentById, getArticleById, deleteComment } from '../../../lib/db';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, 401);

  const commentId = Number(params.id);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return json({ error: 'Invalid comment id' }, 400);
  }

  const db = getDB(locals);
  const comment = await getCommentById(db, commentId);
  if (!comment) return json({ error: 'Not found' }, 404);

  if (comment.user_id !== locals.user.id) {
    const article = await getArticleById(db, comment.article_id);
    if (!article || article.user_id !== locals.user.id) {
      return json({ error: 'Forbidden' }, 403);
    }
  }

  await deleteComment(db, commentId);
  return new Response(null, { status: 204 });
};
