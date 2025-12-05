// src/app/api/blogs/edit/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { queryOne, query, execute, transaction, connExecute, connInsert } from '@/lib/db';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '@/lib/uploadImageMiddleware';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const blogId = Number.parseInt(id, 10);

  if (Number.isNaN(blogId)) {
    return NextResponse.json({ success: false, message: 'Invalid blog ID' }, { status: 400 });
  }

  try {
    const blog = await queryOne<{
      id: number;
      title: string;
      slug: string;
      content: string;
      image: string | null;
      imageAlt: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      metaKeywords: string | null;
      status: boolean;
      authorId: number;
      authorUsername: string;
      authorName: string;
    }>(
      `SELECT b.*, u.username as authorUsername, u.name as authorName
       FROM Blog b
       JOIN AdminUser u ON b.authorId = u.id
       WHERE b.id = ?`,
      [blogId]
    );

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 });
    }

    // Get categories
    const categories = await query<Array<{
      categoryId: number;
      categoryName: string;
    }>>(
      `SELECT c.id as categoryId, c.name as categoryName
       FROM BlogCategory bc
       JOIN Category c ON bc.categoryId = c.id
       WHERE bc.blogId = ?`,
      [blogId]
    );

    const formattedBlog = {
      ...blog,
      author: {
        id: blog.authorId,
        username: blog.authorUsername,
        name: blog.authorName
      },
      categories: categories.map(cat => ({
        category: {
          id: cat.categoryId,
          name: cat.categoryName
        }
      }))
    };

    return NextResponse.json({ success: true, blog: formattedBlog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch blog' }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const blogId = parseInt(id, 10);
    if (isNaN(blogId)) {
      return NextResponse.json({ success: false, message: "Invalid Blog ID" }, { status: 400 });
    }

    const formData = await req.formData();

    const title = formData.get("title") as string | null;
    const slug = formData.get("slug") as string | null;
    const content = formData.get("content") as string | null;
    const metaTitle = formData.get("metaTitle") as string | null;
    const metaDescription = formData.get("metaDescription") as string | null;
    const metaKeywords = formData.get("metaKeywords") as string | null;
    const authorId = parseInt(formData.get("authorId") as string, 10) || null;
    const imageFile = formData.get("image") as File | null;
    const currentImage = formData.get("currentImage") as string | null;
    const imageAlt = formData.get("imageAlt") as string | null;
    
    // Get category IDs (multiple values can be sent)
    const categoryIdsArray = formData.getAll("categoryIds");
    const categoryIds = categoryIdsArray
      .map((id) => {
        const num = typeof id === 'string' ? parseInt(id, 10) : Number(id);
        return isNaN(num) ? null : num;
      })
      .filter((id): id is number => id !== null);

    // Handle Image
    let newImageUrl = currentImage ?? null;

    if (imageFile) {
      try {
        // delete old image if exists
        if (currentImage) {
          const parts = currentImage.split("/");
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          const publicId = `${folder}/${filename.split(".")[0]}`;
          await deleteImageFromCloudinary(publicId);
        }

        // upload new image
        const { secure_url } = await uploadImageToCloudinary(imageFile);
        newImageUrl = secure_url;
      } catch (uploadError: any) {
        console.error("Cloudinary upload error:", uploadError);
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image. Please check your Cloudinary configuration." },
          { status: 500 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const queryParams: any[] = [];

    if (title !== null) {
      updates.push('title = ?');
      queryParams.push(title);
    }
    if (slug !== null) {
      updates.push('slug = ?');
      queryParams.push(slug);
    }
    if (content !== null) {
      updates.push('content = ?');
      queryParams.push(content);
    }
    if (metaTitle !== null) {
      updates.push('metaTitle = ?');
      queryParams.push(metaTitle);
    }
    if (metaDescription !== null) {
      updates.push('metaDescription = ?');
      queryParams.push(metaDescription);
    }
    if (metaKeywords !== null) {
      updates.push('metaKeywords = ?');
      queryParams.push(metaKeywords);
    }
    if (authorId !== null) {
      updates.push('authorId = ?');
      queryParams.push(authorId);
    }
    if (newImageUrl !== null) {
      updates.push('image = ?');
      queryParams.push(newImageUrl);
    }
    if (imageAlt !== null) {
      updates.push('imageAlt = ?');
      queryParams.push(imageAlt);
    }

    queryParams.push(blogId);

    // Use transaction to update blog and categories
    await transaction(async (conn) => {
      // Update blog (only if there are fields to update)
      if (updates.length > 0) {
        await connExecute(
          conn,
          `UPDATE Blog SET ${updates.join(', ')} WHERE id = ?`,
          queryParams
        );
      }

      // Delete existing categories
      await connExecute(
        conn,
        'DELETE FROM BlogCategory WHERE blogId = ?',
        [blogId]
      );

      // Insert new categories
      if (categoryIds.length > 0) {
        for (const catId of categoryIds) {
          await connExecute(
            conn,
            'INSERT INTO BlogCategory (blogId, categoryId) VALUES (?, ?)',
            [blogId, catId]
          );
        }
      }
    });

    // Fetch updated blog
    const updatedBlog = await queryOne<{
      id: number;
      title: string;
      slug: string;
      content: string;
      image: string | null;
      imageAlt: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      metaKeywords: string | null;
      status: boolean;
      authorId: number;
      authorUsername: string;
      authorName: string;
    }>(
      `SELECT b.*, u.username as authorUsername, u.name as authorName
       FROM Blog b
       JOIN AdminUser u ON b.authorId = u.id
       WHERE b.id = ?`,
      [blogId]
    );

    // Get categories
    const categories = await query<Array<{
      categoryId: number;
      categoryName: string;
    }>>(
      `SELECT c.id as categoryId, c.name as categoryName
       FROM BlogCategory bc
       JOIN Category c ON bc.categoryId = c.id
       WHERE bc.blogId = ?`,
      [blogId]
    );

    const formattedBlog = {
      ...updatedBlog,
      author: {
        id: updatedBlog.authorId,
        username: updatedBlog.authorUsername,
        name: updatedBlog.authorName
      },
      categories: categories.map(cat => ({
        category: {
          id: cat.categoryId,
          name: cat.categoryName
        }
      }))
    };

    return NextResponse.json({ success: true, blog: formattedBlog });
  } catch (error: any) {
    console.error("Error updating blog:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

