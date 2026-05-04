import type { APIRoute } from 'astro';

const OAUTH_STATE_COOKIE = 'hh_oauth_state';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const clientId = locals.runtime.env.GITHUB_CLIENT_ID;
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;
  const state = crypto.randomUUID();

  cookies.set(OAUTH_STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 10 * 60,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `https://github.com/login/oauth/authorize?${params}` },
  });
};
