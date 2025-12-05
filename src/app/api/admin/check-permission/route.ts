import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRoutePermission, normalizeRoute } from '@/lib/checkRoutePermission';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check what permissions a user has
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((token as { sub?: string })?.sub || '0');
    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route') || '/admin';
    const method = searchParams.get('method') || 'GET';

    const normalizedRoute = normalizeRoute(route);
    const hasPermission = await checkRoutePermission(userId, normalizedRoute, method);

    return NextResponse.json({
      userId,
      route: normalizedRoute,
      method,
      hasPermission,
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json({ error: 'Failed to check permission' }, { status: 500 });
  }
}

