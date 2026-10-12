import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: process.env.GITHUB_REDIRECT_URI || '',
    scope: 'repo read:user',
    state,
  });

  const response = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/github/callback',
    maxAge: 60 * 10,
  });

  return response;
};