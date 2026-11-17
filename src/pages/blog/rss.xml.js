// RSS feed of blog posts: /blog/rss.xml
import rss from "@astrojs/rss";
import site from "../../data/site.json";
import { categoryOf, getPosts, postUrl } from "../../lib/content";

export async function GET(context) {
  const posts = (await getPosts()).filter((p) => !p.data.draft);
  return rss({
    title: `${site.header.name}: blog`,
    description: site.blog.intro,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post),
      categories: [categoryOf(post.data.category)?.label].filter(Boolean),
    })),
  });
}
