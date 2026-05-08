import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  let body: { title?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (typeof body.title !== 'string' || typeof body.content !== 'string') {
    return json({ error: 'title and content are required' }, 400);
  }

  const title = body.title.trim();
  const content = body.content.trim().slice(0, 1200);
  if (!title) return json({ error: 'title is required' }, 400);

  const ai = locals.runtime.env.AI;

  try {
    const result = await ai.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [
        {
          role: 'system',
          content:
            'You are a technical blog post tagger. Generate tags for the given post. ' +
            'Rules: lowercase only, use hyphens for multi-word tags (e.g. machine-learning), ' +
            '3-5 tags max, be specific and technical. ' +
            'Respond with ONLY a JSON array of strings, no explanation, no markdown.',
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nContent:\n${content}`,
        },
      ],
      max_tokens: 120,
    }) as { response: string };

    const match = result.response.match(/\[[\s\S]*?\]/);
    if (!match) return json({ tags: [] });

    const parsed = JSON.parse(match[0]) as unknown[];
    const tags = parsed
      .filter((t): t is string => typeof t === 'string')
      .map(t => t.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-一-鿿]/g, ''))
      .filter(t => t.length > 0 && t.length <= 32)
      .slice(0, 5);

    return json({ tags });
  } catch {
    return json({ error: 'AI generation failed' }, 500);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
