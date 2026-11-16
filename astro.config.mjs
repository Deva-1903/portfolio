// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Code fences tagged ```output hold what the block above printed; mark them so
// they render as an output panel attached to the code (see src/styles/blog.css).
const outputFences = {
  name: "output-fences",
  pre(node) {
    const lang = this.options.lang;
    if (lang === "output") {
      node.properties.class = `${node.properties.class || ""} is-output`.trim();
      node.properties["data-label"] = "output";
    } else if (lang && lang !== "txt" && lang !== "text") {
      node.properties["data-label"] = lang;
    }
  },
};

export default defineConfig({
  site: "https://devaanand.com",
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: "vitesse-light", dark: "vitesse-dark" },
      defaultColor: false,
      langAlias: { output: "txt" },
      wrap: false,
      transformers: [outputFences],
    },
  },
});
