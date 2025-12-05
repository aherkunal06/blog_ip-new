export interface Product {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  description: string | null;
  category: string | null;
  ipshopyUrl: string;
  status: "active" | "inactive";
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogProduct {
  id: number;
  blogId: number;
  productId: number;
  linkType: "featured" | "mentioned" | "related" | "comparison";
  position: number;
  product?: Product;
}

