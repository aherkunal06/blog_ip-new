import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert, execute } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { hasSuperAdminAccess } from '@/lib/hasSuperAdminAccess';

export const dynamic = 'force-dynamic';

// GET all groups
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

    const groups = await query<Array<{
      id: number;
      name: string;
      description: string | null;
      isSystem: boolean;
      createdAt: Date;
    }>>(
      'SELECT id, name, description, isSystem, createdAt FROM AdminGroup ORDER BY isSystem DESC, name ASC'
    );

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST create new group
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

    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const groupId = await insert(
      'INSERT INTO AdminGroup (name, description, isSystem) VALUES (?, ?, ?)',
      [name, description || null, false]
    );

    const group = await queryOne<{
      id: number;
      name: string;
      description: string | null;
      isSystem: boolean;
    }>(
      'SELECT id, name, description, isSystem FROM AdminGroup WHERE id = ?',
      [groupId]
    );

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating group:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

// PUT update group
export async function PUT(req: NextRequest) {
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

    const { id, name, description } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Group ID and name are required' }, { status: 400 });
    }

    // Check if group exists and is not system group
    const existing = await queryOne<{ isSystem: boolean }>(
      'SELECT isSystem FROM AdminGroup WHERE id = ?',
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system group' }, { status: 403 });
    }

    await execute(
      'UPDATE AdminGroup SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    const group = await queryOne<{
      id: number;
      name: string;
      description: string | null;
      isSystem: boolean;
    }>(
      'SELECT id, name, description, isSystem FROM AdminGroup WHERE id = ?',
      [id]
    );

    return NextResponse.json({ group });
  } catch (error: any) {
    console.error('Error updating group:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE group
export async function DELETE(req: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Check if group is system group
    const existing = await queryOne<{ isSystem: boolean }>(
      'SELECT isSystem FROM AdminGroup WHERE id = ?',
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system group' }, { status: 403 });
    }

    await execute('DELETE FROM AdminGroup WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

