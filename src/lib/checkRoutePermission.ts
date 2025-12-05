import { queryOne, query } from '@/lib/db';

/**
 * Check if a user has permission to access a specific route
 * @param userId - The admin user ID
 * @param route - The route path (e.g., '/admin/blogs/list')
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @returns true if user has permission, false otherwise
 */
export async function checkRoutePermission(
  userId: number,
  route: string,
  method: string = 'GET'
): Promise<boolean> {
  try {
    // Super admins always have access
    const admin = await queryOne<{ isSuper: boolean; role: string }>(
      'SELECT isSuper, role FROM AdminUser WHERE id = ?',
      [userId]
    );

    if (!admin) {
      return false;
    }

    // Super admins bypass permission checks
    if (admin.isSuper || admin.role === 'super-admin') {
      return true;
    }

    // Get all groups for this user
    const userGroups = await query<Array<{ groupId: number }>>(
      'SELECT groupId FROM AdminUserGroup WHERE userId = ?',
      [userId]
    );

    if (userGroups.length === 0) {
      // No groups assigned, deny access
      return false;
    }

    const groupIds = userGroups.map(g => g.groupId);

    if (groupIds.length === 0) {
      console.log(`[Permission] User ${userId} has no groups assigned`);
      return false;
    }

    // Check if any of the user's groups have permission for this route
    // First try exact match
    const placeholders = groupIds.map(() => '?').join(',');
    let permission = await queryOne<{ allowed: boolean }>(
      `SELECT allowed FROM AdminGroupPermission 
       WHERE groupId IN (${placeholders}) 
       AND route = ? 
       AND method = ? 
       AND allowed = 1
       LIMIT 1`,
      [...groupIds, route, method.toUpperCase()]
    );

    if (permission) {
      console.log(`[Permission] Exact match found for user ${userId} on route ${route} with method ${method}`);
      return true;
    }

    // REMOVED: Parent route matching - we only allow exact matches
    // This ensures that if a user has permission for /admin/blogs/list,
    // they can ONLY access that route, not /admin/blogs/create or other child routes
    // If you want to allow parent routes, you need to explicitly grant them in the group permissions

    console.log(`[Permission] No permission found for user ${userId} on route ${route} with method ${method}`);
    
    // Debug: Log what permissions the user actually has
    const userPermissions = await query<Array<{ route: string; method: string }>>(
      `SELECT DISTINCT agp.route, agp.method 
       FROM AdminGroupPermission agp
       INNER JOIN AdminUserGroup aug ON agp.groupId = aug.groupId
       WHERE aug.userId = ? AND agp.allowed = 1`,
      [userId]
    );
    console.log(`[Permission] User ${userId} has permissions:`, userPermissions);

    return false;
  } catch (error) {
    console.error('Error checking route permission:', error);
    return false;
  }
}

/**
 * Normalize route path for permission checking
 * Handles variations like '/admin/blogs/list' vs '/admin/blogs/list/'
 */
export function normalizeRoute(route: string): string {
  // Remove trailing slash
  let normalized = route.replace(/\/$/, '');
  
  // Ensure it starts with /admin for admin routes
  if (normalized.startsWith('/admin')) {
    return normalized;
  }
  
  return normalized;
}

