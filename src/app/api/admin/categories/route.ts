import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { checkApiRoutePermission } from '@/lib/checkApiRoutePermission';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check route permissions
    const { allowed } = await checkApiRoutePermission(req);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized: Insufficient permissions for this route' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const statusParam = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * pageSize;

    // Build WHERE conditions dynamically
    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (search) {
      whereClauses.push('LOWER(c.name) LIKE ?');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm);
    }

    if (statusParam === 'approved' || statusParam === 'pending') {
      whereClauses.push('c.status = ?');
      queryParams.push(statusParam === 'approved' ? 1 : 0);
    }

    if (startDate) {
      whereClauses.push('c.createdAt >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereClauses.push('c.createdAt <= ?');
      queryParams.push(endDate);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query paginated categories
    const categories = await query<Array<{
      id: number;
      name: string;
      slug: string;
      image: string | null;
      description: string | null;
      status: number;
      isHelpCategory: number;
      blogCount: number;
      createdAt: Date;
    }>>(
      `SELECT c.id, c.name, c.slug, c.image, c.description, c.status, c.isHelpCategory,
              COUNT(bc.id) as blogCount, c.createdAt
       FROM Category c
       LEFT JOIN BlogCategory bc ON c.id = bc.categoryId
       ${whereSQL}
       GROUP BY c.id, c.name, c.slug, c.image, c.description, c.status, c.isHelpCategory, c.createdAt
       ORDER BY c.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, skip]
    );

    // Query total count
    const countResult = await queryOne<{ count: bigint }>(
      `SELECT COUNT(DISTINCT c.id) as count
       FROM Category c
       ${whereSQL}`,
      queryParams
    );

    const total = Number(countResult?.count) || 0;

    // Reformat the result
    const formatted = categories.map(cat => ({
      id: Number(cat.id),
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      description: cat.description,
      status: !!cat.status,
      isHelpCategory: !!cat.isHelpCategory,
      blogCount: Number(cat.blogCount),
      createdAt: cat.createdAt,
    }));

    return NextResponse.json({ categories: formatted, total });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Check route permissions
    const { allowed } = await checkApiRoutePermission(req);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized: Insufficient permissions for this route' },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { id, status, isHelpCategory } = body;
    
    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status ? 1 : 0);
    }
    
    if (isHelpCategory !== undefined) {
      updates.push('isHelpCategory = ?');
      params.push(isHelpCategory ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    params.push(id);
    const affectedRows = await execute(
      `UPDATE Category SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (affectedRows === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updated = await queryOne<{
      id: number;
      name: string;
      slug: string;
      image: string | null;
      status: number;
      isHelpCategory: number;
    }>('SELECT id, name, slug, image, status, isHelpCategory FROM Category WHERE id = ?', [id]);

    return NextResponse.json({
      id: updated!.id,
      name: updated!.name,
      slug: updated!.slug,
      image: updated!.image,
      status: !!updated!.status,
      isHelpCategory: !!updated!.isHelpCategory,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

