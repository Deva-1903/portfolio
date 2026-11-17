// Queries and URL helpers for the blog.
import { getCollection, type CollectionEntry } from "astro:content";
import site from "../data/site.json";

export type Post = CollectionEntry<"blog">;

// Drafts show up in `npm run dev` only, never in the built site.
const published = (e: { data: { draft: boolean } }) => import.meta.env.DEV || !e.data.draft;

const slugOf = (id: string) => id.split("/").pop() as string;

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", published);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const blogCategories = site.blog.categories;

export const categoryOf = (id: string) => blogCategories.find((c) => c.id === id);

export const categoryUrl = (id: string) => `/blog/${id}/`;

export const postSlug = (post: Post) => slugOf(post.id);

export const postUrl = (post: Post) => `/blog/${post.data.category}/${slugOf(post.id)}/`;

// "Nov 16, 2026" (dates in frontmatter are calendar days, so format in UTC)
export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// Prose words only: code fences and import lines don't count toward reading time
export function readingTime(body = ""): string {
  const prose = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^import .*$/gm, " ")
    .replace(/<[^>]+>/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}
