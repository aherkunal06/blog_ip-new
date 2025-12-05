// src/app/api/blogs/categories/[slug]/blogs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const skip = (page - 1) * limit;

    // Get category by slug
    const category = await queryOne<{ id: number }>(
      'SELECT id FROM Category WHERE slug = ? AND status = 1',
      [slug]
    );

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get total count
    const countResult = await query<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM Blog b
       JOIN BlogCategory bc ON b.id = bc.blogId
       WHERE bc.categoryId = ? AND b.status = 1`,
      [category.id]
    );
    const totalBlogs = Number(countResult[0]?.count || 0);

    // Get blogs with pagination
    const blogs = await query<Array<{
      id: number;
      title: string;
      slug: string;
      image: string | null;
      metaDescription: string | null;
      createdAt: Date;
      authorId: number;
      authorUsername: string;
      authorName: string;
    }>>(
      `SELECT b.id, b.title, b.slug, b.image, b.metaDescription, b.createdAt,
              b.authorId, u.username as authorUsername, u.name as authorName
       FROM Blog b
       JOIN BlogCategory bc ON b.id = bc.blogId
       JOIN AdminUser u ON b.authorId = u.id
       WHERE bc.categoryId = ? AND b.status = 1
       ORDER BY b.createdAt DESC
       LIMIT ? OFFSET ?`,
      [category.id, limit, skip]
    );

    const totalPages = Math.ceil(totalBlogs / limit);

    // Format response
    const formattedBlogs = blogs.map(blog => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      image: blog.image,
      metaDescription: blog.metaDescription,
      createdAt: blog.createdAt.toISOString(),
      author: {
        username: blog.authorUsername,
        name: blog.authorName
      }
    }));

    return NextResponse.json({
      blogs: formattedBlogs,
      totalBlogs,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching category blogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category blogs' },
      { status: 500 }
    );
  }
}

