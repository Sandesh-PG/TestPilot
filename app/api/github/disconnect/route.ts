import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized: Authentication required' },
                { status: 401 }
            );
        }

        const cookieStore = await cookies();

        // Expire the github_token cookie on the cookie store
        cookieStore.set('github_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        });
        cookieStore.delete('github_token');

        // Expire any residual oauth state cookie as well
        cookieStore.set('github_oauth_state', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/github/callback',
            maxAge: 0,
        });
        cookieStore.delete('github_oauth_state');

        const response = NextResponse.json({
            success: true,
            message: 'GitHub account disconnected successfully',
        });

        // Set response headers to ensure browser invalidates the cookie immediately
        response.cookies.set('github_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        });

        response.cookies.set('github_oauth_state', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/github/callback',
            maxAge: 0,
        });

        return response;
    } catch (error) {
        console.error('Error disconnecting GitHub account:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect GitHub account' },
            { status: 500 }
        );
    }
}
