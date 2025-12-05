// src/lib/uploadImageMiddleware.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export type CloudinaryUpload = { secure_url: string; public_id: string };

export const uploadImageToCloudinary = async (file: Blob): Promise<CloudinaryUpload> => {
  // Check if Cloudinary credentials are configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are not configured. Please check your environment variables.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "blog-images", resource_type: "image" },
      (error, result) => {
        if (error) {
          // Map Cloudinary errors to user-friendly messages without exposing sensitive data
          const errorMessage = error.message || String(error);
          
          if (errorMessage.includes("Unknown API key") || errorMessage.includes("Invalid API key")) {
            reject(new Error("Cloudinary credentials are invalid. Please check your API key and secret."));
          } else if (errorMessage.includes("Invalid cloud_name")) {
            reject(new Error("Cloudinary cloud name is invalid. Please check your configuration."));
          } else if (errorMessage.includes("Authentication failed")) {
            reject(new Error("Cloudinary authentication failed. Please verify your credentials."));
          } else if (errorMessage.includes("Connection") || errorMessage.includes("timeout")) {
            reject(new Error("Unable to connect to Cloudinary. Please check your internet connection and try again."));
          } else {
            // Generic error message for other Cloudinary errors
            reject(new Error("Failed to upload image to Cloudinary. Please try again or contact support."));
          }
          return;
        }
        
        if (!result) {
          reject(new Error("Cloudinary upload failed. No result returned."));
          return;
        }
        
        resolve({ secure_url: result.secure_url!, public_id: result.public_id! });
      }
    );
    stream.end(buffer);
  });
};

// Prefer using the public_id returned by Cloudinary instead of parsing the URL. [web:69]
export const getCloudinaryPublicId = (url: string): string | null => {
  // Fallback only; using upload response public_id is recommended. [web:69]
  const regex = /\/image\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/;
  const match = url.match(regex);
  return match?.[1] ?? null;
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  // Check if Cloudinary credentials are configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are not configured. Please check your environment variables.");
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes("Unknown API key") || errorMessage.includes("Invalid API key")) {
      throw new Error("Cloudinary credentials are invalid. Please check your API key and secret.");
    } else if (errorMessage.includes("Invalid cloud_name")) {
      throw new Error("Cloudinary cloud name is invalid. Please check your configuration.");
    } else if (errorMessage.includes("Authentication failed")) {
      throw new Error("Cloudinary authentication failed. Please verify your credentials.");
    } else {
      // Generic error message for other Cloudinary errors
      throw new Error("Failed to delete image from Cloudinary. Please try again or contact support.");
    }
  }
};

