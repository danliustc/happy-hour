import { getRecentArticlesForUser, upsertUserEmbedding } from './db';

export async function updateUserEmbedding(db: D1Database, ai: Ai, userId: number): Promise<void> {
  const articles = await getRecentArticlesForUser(db, userId, 10);
  if (articles.length === 0) return;

  const content = articles
    .map(a => `${a.title}\n${a.body_markdown.slice(0, 400)}`)
    .join('\n\n')
    .slice(0, 2048);

  const result = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [content] }) as { data: number[][] };
  const embedding = result.data[0];
  if (!embedding) return;

  await upsertUserEmbedding(db, userId, embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
