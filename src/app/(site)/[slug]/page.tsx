// src/app/blogs/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import BlogComments from "@/components/BlogComments";
import BlogProducts from "@/components/BlogProducts";
import AdSlot from "@/components/ads/AdSlot";
import BlogPageWrapper from "@/components/BlogPageWrapper";
import BlogContentCard from "@/components/BlogContentCard";
import BlogSectionCard from "@/components/BlogSectionCard";
import BlogTitle from "@/components/BlogTitle";
import BlogMetaInfo from "@/components/BlogMetaInfo";
import BlogHeading from "@/components/BlogHeading";
import BlogTextElement from "@/components/BlogTextElement";
import RelatedArticleLink from "@/components/RelatedArticleLink";
import FAQItem from "@/components/FAQItem";
import BlogProseContent from "@/components/BlogProseContent";

interface Category {
  id: number;
  name: string;
  image: string;
}

interface BlogCategory {
  category: Category;
}

// Author interface removed as it's not used directly

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

interface Comment {
  id: number;
  content: string;
}

interface RelatedBlogSummary {
  id: number;
  title: string;
  slug: string;
  image: string;
}

interface BlogRelation {
  relatedBlog?: RelatedBlogSummary;
  mainBlog?: RelatedBlogSummary;
}

interface BlogDetails {
  id: number;
  title: string;
  slug: string;
  content: string;
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  status: boolean;
  author: { username: string; name: string | null };
  categories: BlogCategory[];
  faqs: FAQ[];
  comments: Comment[];
  likes: any[];
  favorites: any[];
  relatedArticles: BlogRelation[];
  relatedTo: BlogRelation[];
  createdAt: string;
  updatedAt: string;
}

// Fetch blog by slug
async function getBlogBySlug(slug: string): Promise<BlogDetails | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/blogs/${slug}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (err) {
    console.error("Error fetching blog:", err);
    return null;
  }
}

// Generate metadata
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: "Blog Post Not Found", description: "Blog not found" };

  const keywordsArray = blog.metaKeywords
    ? blog.metaKeywords.split(",").map((kw) => kw.trim())
    : blog.metaTitle
    ? blog.metaTitle.split(" ").map((w) => w.toLowerCase())
    : blog.title.split(" ").map((w) => w.toLowerCase());

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.title,
    keywords: keywordsArray.join(", "),
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.title,
      url: `${baseUrl}/blogs/${blog.slug}`,
      siteName: "Your Blog Name",
      images: blog.image ? [{ url: blog.image, width: 800, height: 600, alt: blog.title }] : [],
      type: "article",
      publishedTime: blog.createdAt,
      modifiedTime: blog.updatedAt,
    },
    twitter: {
      card: blog.image ? "summary_large_image" : "summary",
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.title,
      creator: blog.author.username ? `@${blog.author.username}` : undefined,
      images: blog.image ? [blog.image] : [],
    },
    alternates: { canonical: `${baseUrl}/blogs/${blog.slug}` },
  };
}

// Blog page
export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) notFound();

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <BlogPageWrapper>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Hero Section */}
        <div className="mt-5 pt-12 pb-8">
          {/* Title */}
          <BlogTitle>{blog.title}</BlogTitle>

          {/* Author & Date Info */}
          <BlogMetaInfo
            author={blog.author.username || blog.author.name || "Anonymous"}
            createdAt={formatDate(blog.createdAt)}
            updatedAt={formatDate(blog.updatedAt)}
          />

          {/* Featured Image */}
          {blog.image && (
            <div className="w-full h-64 sm:h-80 md:h-96 lg:h-[32rem] relative rounded-2xl overflow-hidden shadow-2xl mb-12 group">
              <Image 
                src={blog.image} 
                alt={blog.title} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
                priority 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Blog Content */}
          <div className="lg:col-span-8">
            <BlogContentCard>
              <BlogProseContent content={blog.content} />
            </BlogContentCard>

            {/* Products Mentioned Section - Moved here for better visibility */}
            <div className="mt-12">
              <BlogSectionCard>
                <BlogProducts blogSlug={blog.slug} variant="grid" title="Related Products" />
              </BlogSectionCard>
            </div>

            {/* After Content Ads */}
            <div className="mt-12">
              <AdSlot
                placement="after-content"
                blogSlug={blog.slug}
                maxAds={6}
                className="mb-8"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Engagement Stats */}
            <BlogSectionCard className="p-6">
              <BlogHeading level={3} className="mb-4">Engagement</BlogHeading>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <BlogTextElement variant="secondary" className="text-sm">Likes</BlogTextElement>
                  </div>
                  <BlogTextElement variant="primary" className="font-semibold">{blog.likes.length}</BlogTextElement>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <BlogTextElement variant="secondary" className="text-sm">Favorites</BlogTextElement>
                  </div>
                  <BlogTextElement variant="primary" className="font-semibold">{blog.favorites.length}</BlogTextElement>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    <BlogTextElement variant="secondary" className="text-sm">Comments</BlogTextElement>
                  </div>
                  <BlogTextElement variant="primary" className="font-semibold">{blog.comments.length}</BlogTextElement>
                </div>
              </div>
            </BlogSectionCard>

            {/* Ads Sidebar */}
            <AdSlot
              placement="sidebar"
              blogSlug={blog.slug}
              maxAds={3}
              className="space-y-6"
            />

            {/* Featured Products Sidebar */}
            <BlogSectionCard className="p-6">
              <BlogProducts blogSlug={blog.slug} variant="sidebar" limit={5} title="Recommended Products" />
            </BlogSectionCard>

            {/* Related Articles Sidebar */}
            {blog.relatedArticles.length > 0 && (
              <BlogSectionCard className="p-6">
                <BlogHeading level={3} className="mb-4">Related Articles</BlogHeading>
                <div className="space-y-4">
                  {blog.relatedArticles.slice(0, 3).map(
                    (rel) =>
                      rel.relatedBlog && (
                        <RelatedArticleLink key={rel.relatedBlog.id} blog={rel.relatedBlog} />
                      )
                  )}
                </div>
              </BlogSectionCard>
            )}
          </div>
        </div>

        {/* FAQs Section */}
        {blog.faqs.length > 0 && (
          <div className="mt-12">
            <BlogSectionCard className="p-8 md:p-12">
              <BlogHeading level={2} className="mb-8 text-center">
                Frequently Asked Questions
              </BlogHeading>
              <div className="space-y-6">
                {blog.faqs.map((faq, index) => (
                  <FAQItem key={faq.id} faq={faq} index={index} />
                ))}
              </div>
            </BlogSectionCard>
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-16 mb-16">
          <BlogComments blogId={blog.id} />
        </div>
      </div>
    </BlogPageWrapper>
  );
}