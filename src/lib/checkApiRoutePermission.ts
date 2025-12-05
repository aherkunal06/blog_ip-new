import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { checkRoutePermission, normalizeRoute } from './checkRoutePermission';

/**
 * Check if the current request has permission to access an API route
 * Use this in API route handlers
 * Returns { allowed: true } for non-admin users (they use different auth)
 */
export async function checkApiRoutePermission(req: NextRequest): Promise<{ allowed: boolean; userId?: number }> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // If no token, deny access (but this might be a public route, so caller should handle)
    if (!token) {
      return { allowed: false };
    }

    const role = (token as { role?: string })?.role;
    const userId = parseInt((token as { sub?: string })?.sub || '0');

    // If not an admin user, allow (they use different authentication)
    // This function is specifically for admin route permissions
    if (role !== 'admin' && role !== 'super-admin') {
      // Not an admin user, so permission check doesn't apply
      // Return true to allow (the route handler will check their own auth)
      return { allowed: true };
    }

    // Super admins always have access
    if (role === 'super-admin') {
      return { allowed: true, userId };
    }

    // Regular admin - check route permissions
    // Get the route path from the request
    const route = normalizeRoute(req.nextUrl.pathname);
    const method = req.method || 'GET';

    // Check permission
    const hasPermission = await checkRoutePermission(userId, route, method);

    return { allowed: hasPermission, userId };
  } catch (error) {
    console.error('Error checking API route permission:', error);
    return { allowed: false };
  }
}

