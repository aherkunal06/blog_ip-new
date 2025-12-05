import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { hasSuperAdminAccess } from '@/lib/hasSuperAdminAccess';

export const dynamic = 'force-dynamic';

// GET groups for a user
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const groups = await query<Array<{
      id: number;
      name: string;
      description: string | null;
    }>>(
      `SELECT g.id, g.name, g.description
       FROM AdminGroup g
       INNER JOIN AdminUserGroup ug ON g.id = ug.groupId
       WHERE ug.userId = ?`,
      [userId]
    );

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json({ error: 'Failed to fetch user groups' }, { status: 500 });
  }
}

// POST assign groups to user
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

    const { userId, groupIds } = await req.json();

    if (!userId || !Array.isArray(groupIds)) {
      return NextResponse.json({ error: 'User ID and group IDs array are required' }, { status: 400 });
    }

    // Delete existing group assignments
    await execute('DELETE FROM AdminUserGroup WHERE userId = ?', [userId]);

    // Insert new group assignments
    for (const groupId of groupIds) {
      await insert(
        'INSERT INTO AdminUserGroup (userId, groupId) VALUES (?, ?)',
        [userId, groupId]
      );
    }

    // Fetch updated groups
    const groups = await query<Array<{
      id: number;
      name: string;
      description: string | null;
    }>>(
      `SELECT g.id, g.name, g.description
       FROM AdminGroup g
       INNER JOIN AdminUserGroup ug ON g.id = ug.groupId
       WHERE ug.userId = ?`,
      [userId]
    );

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error assigning groups:', error);
    return NextResponse.json({ error: 'Failed to assign groups' }, { status: 500 });
  }
}

