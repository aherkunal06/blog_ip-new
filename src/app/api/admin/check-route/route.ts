import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRoutePermission, normalizeRoute } from '@/lib/checkRoutePermission';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to check if a user has permission for a route
 * Used by client-side components to check permissions before navigation
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json({ hasPermission: false, error: 'Unauthorized' }, { status: 401 });
    }

    const role = (token as { role?: string })?.role;
    const userId = parseInt((token as { sub?: string })?.sub || '0');

    // Super admins always have permission
    if (role === 'super-admin') {
      return NextResponse.json({ hasPermission: true });
    }

    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route');
    const method = searchParams.get('method') || 'GET';

    if (!route) {
      return NextResponse.json({ hasPermission: false, error: 'Route parameter required' }, { status: 400 });
    }

    const normalizedRoute = normalizeRoute(route);
    const hasPermission = await checkRoutePermission(userId, normalizedRoute, method);

    return NextResponse.json({ hasPermission, route: normalizedRoute, method });
  } catch (error) {
    console.error('Error checking route permission:', error);
    return NextResponse.json({ hasPermission: false, error: 'Failed to check permission' }, { status: 500 });
  }
}

