import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { hasSuperAdminAccess } from '@/lib/hasSuperAdminAccess';

export const dynamic = 'force-dynamic';

// GET permissions for a group
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = { user: { role: token.role } };
    const hasAccess = await hasSuperAdminAccess(session as any);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const permissions = await query<Array<{
      id: number;
      route: string;
      method: string;
      allowed: boolean;
    }>>(
      'SELECT id, route, method, allowed FROM AdminGroupPermission WHERE groupId = ? ORDER BY route, method',
      [groupId]
    );

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

// POST set permissions for a group
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = { user: { role: token.role } };
    const hasAccess = await hasSuperAdminAccess(session as any);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { groupId, permissions } = await req.json();

    if (!groupId || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Group ID and permissions array are required' }, { status: 400 });
    }

    // Check if group exists
    const group = await queryOne<{ id: number }>(
      'SELECT id FROM AdminGroup WHERE id = ?',
      [groupId]
    );

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Delete existing permissions
    await execute('DELETE FROM AdminGroupPermission WHERE groupId = ?', [groupId]);

    // Insert new permissions
    for (const perm of permissions) {
      if (perm.route && perm.method) {
        await insert(
          'INSERT INTO AdminGroupPermission (groupId, route, method, allowed) VALUES (?, ?, ?, ?)',
          [groupId, perm.route, perm.method.toUpperCase(), perm.allowed !== false]
        );
      }
    }

    // Fetch updated permissions
    const updatedPermissions = await query<Array<{
      id: number;
      route: string;
      method: string;
      allowed: boolean;
    }>>(
      'SELECT id, route, method, allowed FROM AdminGroupPermission WHERE groupId = ? ORDER BY route, method',
      [groupId]
    );

    return NextResponse.json({ permissions: updatedPermissions });
  } catch (error) {
    console.error('Error setting permissions:', error);
    return NextResponse.json({ error: 'Failed to set permissions' }, { status: 500 });
  }
}

