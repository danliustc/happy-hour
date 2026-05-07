import type { APIRoute } from 'astro';
import { getDB, getUserByUsername, getAllUserEmbeddings, getUsersByIds } from '../../../lib/db';
import { cosineSimilarity } from '../../../lib/ai';

export const GET: APIRoute = async ({ url, locals }) => {
  const username = url.searchParams.get('username');
  if (!username) return json({ error: 'username required' }, 400);

  const db = getDB(locals);
  const user = await getUserByUsername(db, username);
  if (!user) return json({ error: 'User not found' }, 404);

  const allEmbeddings = await getAllUserEmbeddings(db);
  const userEmb = allEmbeddings.find(e => e.user_id === user.id);
  if (!userEmb) return json({ users: [] });

  const ranked = allEmbeddings
    .filter(e => e.user_id !== user.id)
    .map(e => ({ user_id: e.user_id, score: cosineSimilarity(userEmb.embedding, e.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (ranked.length === 0) return json({ users: [] });

  const users = await getUsersByIds(db, ranked.map(r => r.user_id));
  const result = ranked.map(r => {
    const u = users.find(u => u.id === r.user_id)!;
    return { username: u.username, display_name: u.display_name, avatar_url: u.avatar_url };
  });

  return json({ users: result });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
