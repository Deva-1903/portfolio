import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import site from "./data/site.json";

// Files starting with "_" (templates, scratch notes) are never published.
const pattern = ["**/*.{md,mdx}", "!**/_*"];

const blogCategoryIds = site.blog.categories.map((c) => c.id) as [string, ...string[]];

// Long-form posts. One file per post in src/content/blog/; the category decides
// the URL: /blog/<category>/<file name>/
const blog = defineCollection({
  loader: glob({ pattern, base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(blogCategoryIds),
    date: z.coerce.date(),
    // When I last went back over the post (shown as "Refreshed ...")
    refreshed: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
