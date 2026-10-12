import { NextRequest, NextResponse } from 'next/server';
import { deleteProject } from '@/actions/projects';

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(
    _req: NextRequest,
    { params }: RouteContext
) {
    try {
        const { id } = await params;
        const result = await deleteProject(id);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[DELETE /api/projects/:id]', error);
        const message = error instanceof Error ? error.message : 'Failed to delete project';
        const status = message === 'Unauthorized' ? 401 : message.includes('not found') ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
