import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

// POST /api/blogs/auto-generate/queue/pause - Pause queue processing
export async function POST(req: NextRequest) {
  try {
    const permission = await checkApiRoutePermission(req);
    if (!permission.allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // pause, resume, clear

    if (action === 'pause') {
      // Cancel all pending items (set to cancelled)
      await execute(
        `UPDATE GenerationQueue 
         SET status = 'cancelled' 
         WHERE status = 'pending'`
      );

      return NextResponse.json({
        success: true,
        message: 'Queue paused - pending items cancelled',
      });
    } else if (action === 'resume') {
      // Resume is handled by the queue processor
      return NextResponse.json({
        success: true,
        message: 'Queue will resume on next processing cycle',
      });
    } else if (action === 'clear') {
      const status = searchParams.get('status'); // Optional: clear specific status

      if (status) {
        await execute(
          `DELETE FROM GenerationQueue WHERE status = ?`,
          [status]
        );
        return NextResponse.json({
          success: true,
          message: `Cleared ${status} items from queue`,
        });
      } else {
        // Clear all completed/failed/cancelled
        await execute(
          `DELETE FROM GenerationQueue 
           WHERE status IN ('completed', 'failed', 'cancelled')`
        );
        return NextResponse.json({
          success: true,
          message: 'Cleared completed/failed/cancelled items from queue',
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "pause", "resume", or "clear"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error performing queue action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform queue action' },
      { status: 500 }
    );
  }
}

