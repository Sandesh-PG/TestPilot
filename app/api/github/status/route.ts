import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { connected: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('github_token')?.value;

        if (!token) {
            return NextResponse.json({ connected: false });
        }

        try {
            const ghRes = await fetch('https://api.github.com/user', {
                signal: AbortSignal.timeout(5_000),
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });

            if (!ghRes.ok) {
                if (ghRes.status === 401 || ghRes.status === 403) {
                    return NextResponse.json({
                        connected: false,
                        error: 'GitHub authorization is invalid or expired',
                    });
                }

                // If GitHub is temporarily rate limited or responding with 5xx, cookie still exists
                return NextResponse.json({ connected: true });
            }

            const ghUser = await ghRes.json();
            return NextResponse.json({
                connected: true,
                username: ghUser.login,
                avatarUrl: ghUser.avatar_url,
                name: ghUser.name,
            });
        } catch {
            // Network failure or timeout, fallback to connected since cookie exists
            return NextResponse.json({ connected: true });
        }
    } catch (error) {
        console.error('Error fetching GitHub connection status:', error);
        return NextResponse.json(
            { connected: false, error: 'Failed to verify GitHub connection' },
            { status: 500 }
        );
    }
}
