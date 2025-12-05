// src/app/api/blogs/categories/updatecategories/route.ts
import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/uploadImageMiddleware";

export const dynamic = "force-dynamic";

// GET a category by slug or ID
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const idParam = url.searchParams.get("id");

    let category;

    if (idParam) {
      const id = parseInt(idParam);
      if (isNaN(id)) throw new Error("Invalid ID");
      category = await queryOne<{
        id: number;
        name: string;
        slug: string;
        description: string | null;
        image: string | null;
        isHelpCategory: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>('SELECT * FROM Category WHERE id = ?', [id]);
    } else if (slug) {
      category = await queryOne<{
        id: number;
        name: string;
        slug: string;
        description: string | null;
        image: string | null;
        isHelpCategory: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>('SELECT * FROM Category WHERE slug = ?', [slug]);
    } else {
      return NextResponse.json({ success: false, message: "ID or slug required" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Error fetching category:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT to update a category
export async function PUT(req: Request) {
  try {
    const formData = await req.formData();

    const idParam = formData.get("id") as string | null;
    if (!idParam) {
      return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const imageFile = formData.get("image") as File | null;
    const currentImage = formData.get("currentImage") as string | null;
    const isHelpCategory = formData.get("isHelpCategory") === "true";

    if (!name) {
      return NextResponse.json({ success: false, message: "Name required" }, { status: 400 });
    }

    // Fetch existing category by ID
    const existingCategory = await queryOne<{ id: number }>('SELECT id FROM Category WHERE id = ?', [id]);
    if (!existingCategory) {
      return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    let newImageUrl = currentImage ?? null;

    if (imageFile) {
      try {
        // Delete old image if exists
        if (currentImage) {
          const parts = currentImage.split("/");
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          const publicId = `${folder}/${filename.split(".")[0]}`;
          await deleteImageFromCloudinary(publicId);
        }

        // Upload new image
        const { secure_url } = await uploadImageToCloudinary(imageFile);
        newImageUrl = secure_url;
      } catch (uploadError: any) {
        // Log full error for debugging (server-side only)
        console.error("Cloudinary upload error:", uploadError);
        // Return user-friendly message without exposing sensitive data
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image. Please check your Cloudinary configuration." },
          { status: 500 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    updates.push('name = ?');
    params.push(name);

    if (description !== null) {
      updates.push('description = ?');
      params.push(description);
    }

    if (newImageUrl !== null) {
      updates.push('image = ?');
      params.push(newImageUrl);
    }

    updates.push('isHelpCategory = ?');
    params.push(isHelpCategory);

    params.push(id);

    await execute(
      `UPDATE Category SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch updated category
    const updatedCategory = await queryOne<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      image: string | null;
      isHelpCategory: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>('SELECT * FROM Category WHERE id = ?', [id]);

    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

