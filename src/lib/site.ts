// Small helpers shared by the portfolio pages (ported from the old client-side renderer).
import site from "../data/site.json";

export type Project = (typeof site.projects.items)[number];
export type HistoryEntry = (typeof site.history.entries)[number];

export const social = (platform: string) => site.header.socialLinks.find((l) => l.platform === platform);

export const ext = (url: string, text: string, cls = "") =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer"${cls ? ` class="${cls}"` : ""}>${text}</a>`;

// Projects: explicit order first, then the four featured ones in their featured order
export const sortedProjects = () =>
  [...site.projects.items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export const featuredProjects = () =>
  site.projects.items
    .filter((p) => "featured" in p && p.featured)
    .sort((a, b) => ((a as any).featured as number) - ((b as any).featured as number));

export const areaLabel = (id: string) => site.projects.categories.find((c) => c.id === id)?.label || id;

// Areas that actually have projects, each with its count
export function projectAreas({ hide = [] as string[] } = {}) {
  const counts: Record<string, number> = {};
  site.projects.items.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
  return site.projects.categories
    .filter((c) => counts[c.id] && !hide.includes(c.id))
    .map((c) => ({ ...c, count: counts[c.id] }));
}

// 600+ numbered courses are PhD-level, the rest master's-level
export const courseLevel = (code: string) =>
  parseInt((code.match(/(\d{3})/) || [])[1], 10) >= 600 ? "PhD-level" : "Master's-level";

export type Course = { code: string; name: string; current?: boolean };

// Courses grouped by level, PhD-level first
export function coursesByLevel(entry: HistoryEntry) {
  const raw = (entry as any).coursework;
  if (!raw) return [];
  const semesters = Array.isArray(raw) ? raw : [raw];
  const groups: { label: string; courses: Course[] }[] = [];
  semesters.forEach((sem: any) =>
    sem.categories.forEach((cat: any) =>
      cat.courses.forEach((course: Course) => {
        const label = courseLevel(course.code);
        let group = groups.find((g) => g.label === label);
        if (!group) groups.push((group = { label, courses: [] }));
        group.courses.push(course);
      })));
  return groups.sort((a, b) => (a.label === "PhD-level" ? -1 : 0) - (b.label === "PhD-level" ? -1 : 0));
}

// "Updates" items: link the linkText inside the description, or the whole line
export function updateHTML(item: { description?: string; url?: string; linkText?: string }) {
  let d = item.description || "";
  if (item.url && item.linkText) {
    const re = new RegExp(`(${item.linkText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    d = d.replace(re, ext(item.url, "$1"));
  } else if (item.url) {
    d = ext(item.url, d);
  }
  return d;
}
