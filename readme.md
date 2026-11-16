Minimalist portfolio without the BS. Design adapted from [Andrej Karpathy](https://karpathy.ai)'s website.

Built with [Astro](https://astro.build): every page is static HTML generated at build time, deployed on Vercel.

## Run it

Needs Node 22.23.4 or newer (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
npm run dev      # http://localhost:4321, drafts included
npm run build    # static site in dist/
```

## Where things live

| What | Where |
| --- | --- |
| Portfolio content (hero, experience, projects, research, updates...) | `src/data/site.json` |
| Blog categories and intro text | `src/data/site.json` → `blog` |
| Blog posts | `src/content/blog/*.mdx` (or `.md`) |
| Pages | `src/pages/` (`/`, `/projects/`, `/blog/...`, `/content/`) |
| Styles | `src/styles/global.css` (site), `src/styles/blog.css` (blog and posts) |
| Images and static files | `public/assets/` |

## Add a blog post

1. Create `src/content/blog/<slug>.mdx`:

   ```yaml
   ---
   title: "Post title"
   description: "One or two sentences for lists and link previews."
   category: ml-fundamentals   # an id from site.json → blog.categories
   date: 2026-11-16
   refreshed: 2026-11-16       # optional: shows "Refreshed <date>"
   tags: ["NumPy", "PyTorch"]
   draft: true                 # drafts only show up in `npm run dev`
   ---
   ```

2. Write in Markdown. `##` headings become the table of contents. Put a program's printed output in an ` ```output ` fence right after its ` ```python ` fence and it renders as an attached output panel.
3. New category? Add `{ "id", "label", "description" }` to `blog.categories` in `site.json`. It gets its own page at `/blog/<id>/`.
4. Remove `draft: true` to publish. The post shows up on the homepage, `/blog/`, its category page and the RSS feed (`/blog/rss.xml`).

In `.mdx` files, `{`, `}` and a bare `<` in prose are read as code; put them in backticks.

## Check code blocks

Every ` ```python ` block in a post can be run and compared with the ` ```output ` block under it:

```bash
python scripts/check_code_blocks.py src/content/blog/arrays-and-tensor-shapes.mdx
```

Add `--write` to refresh the output blocks from a real run. It needs a Python with the libraries the post uses (NumPy and PyTorch for the ML fundamentals posts).
