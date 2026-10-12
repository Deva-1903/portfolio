// Shared project-card + area-filter markup for the classic site (index.html, projects.html).
(function () {
  const sorted = (items) => [...items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const featured = (items) => items.filter((p) => p.featured).sort((a, b) => a.featured - b.featured);

  const label = (projects, id) => (projects.categories || []).find((c) => c.id === id)?.label || id;

  // Cards lead with a one-line summary; `detailed` adds the highlight bullets (projects page)
  function card(project, { projects, animate = true, index = 0, detailed = false } = {}) {
    const footerLinks = [
      project.url    ? `<a href="${project.url}"    target="_blank" rel="noopener noreferrer" class="pcn-footer-link">code ↗</a>`   : '',
      project.demo   ? `<a href="${project.demo}"   target="_blank" rel="noopener noreferrer" class="pcn-footer-link">live ↗</a>`   : '',
      project.report ? `<a href="${project.report}" target="_blank" rel="noopener noreferrer" class="pcn-footer-link">report ↗</a>` : '',
    ].filter(Boolean).join('');
    const summary = project.summary || `${project.name} ${project.description}`;
    return `
      <div class="project-card-new ${animate ? 'fade-up' : 'visible'}"${animate ? ` style="transition-delay: ${index * 50}ms"` : ''}>
        ${project.image
          ? `<div class="pcn-media"><img src="${project.image}" alt="${project.imageAlt || ''}" loading="lazy" decoding="async" /></div>`
          : ''}
        <div class="pcn-body">
          ${projects ? `<div class="pcn-area">${label(projects, project.category)}</div>` : ''}
          <h3 class="pcn-title">
            ${project.name}
            ${project.status === 'in-progress' ? '<span class="pcn-badge">in progress</span>' : ''}
          </h3>
          <p class="pcn-desc">${summary}</p>
          ${detailed && project.highlights?.length
            ? `<ul class="pcn-highlights">${project.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`
            : ''}
          ${project.stack ? `<div class="pcn-stack">${project.stack}</div>` : ''}
        </div>
        ${footerLinks ? `<div class="pcn-footer">${footerLinks}</div>` : ''}
      </div>`;
  }

  // Project row: figure on the left, story on the right (stacks on phones).
  // Projects without a figure get a quiet name tile so every row lines up.
  // `detailed` adds the highlight bullets (projects page).
  function featureRow(project, { projects, detailed = false } = {}) {
    const links = [
      project.url    ? `<a href="${project.url}"    target="_blank" rel="noopener noreferrer" class="pcn-footer-link">code ↗</a>`   : '',
      project.demo   ? `<a href="${project.demo}"   target="_blank" rel="noopener noreferrer" class="pcn-footer-link">live ↗</a>`   : '',
      project.report ? `<a href="${project.report}" target="_blank" rel="noopener noreferrer" class="pcn-footer-link">report ↗</a>` : '',
    ].filter(Boolean).join('');
    const target = project.url || project.demo || project.report;
    const img = `<img src="${project.image}" alt="${project.imageAlt || ''}" loading="lazy" decoding="async" />`;
    const media = project.image
      ? `<div class="feature-media">${target ? `<a href="${target}" target="_blank" rel="noopener noreferrer" tabindex="-1">${img}</a>` : img}</div>`
      : `<div class="feature-media feature-placeholder" aria-hidden="true"><span>${project.name}</span></div>`;
    return `
      <article class="feature-row visible">
        ${media}
        <div class="feature-body">
          ${projects ? `<div class="pcn-area">${label(projects, project.category)}</div>` : ''}
          <h3 class="feature-title">${project.name}</h3>
          ${project.stack ? `<div class="feature-stack">${project.stack}</div>` : ''}
          <p class="feature-desc">${project.summary || `${project.name} ${project.description}`}</p>
          ${detailed && project.highlights?.length
            ? `<ul class="feature-highlights">${project.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`
            : ''}
          ${links ? `<div class="feature-links">${links}</div>` : ''}
        </div>
      </article>`;
  }

  // Tabs: a first tab ("featured" or "all") plus one per area that has projects, each with its count
  function filterBar(projects, active, first = { id: 'all', label: 'all', count: projects.items.length }, { hide = [] } = {}) {
    const counts = {};
    projects.items.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
    const tabs = [first]
      .concat((projects.categories || [])
        .filter((c) => counts[c.id] && !hide.includes(c.id))
        .map((c) => ({ ...c, count: counts[c.id] })));
    return `
      <div class="project-filters" role="tablist" aria-label="Filter projects by area">
        ${tabs.map((t) => `
          <button type="button" role="tab" class="project-filter" data-filter="${t.id}"
            aria-selected="${t.id === active}">${t.label}<span class="project-filter-count">${t.count}</span></button>`).join('')}
      </div>`;
  }

  function onFilter(container, handler) {
    container.querySelectorAll('[data-filter]').forEach((b) =>
      b.addEventListener('click', () => handler(b.dataset.filter)));
  }

  window.ProjectsUI = { sorted, featured, card, featureRow, filterBar, onFilter, label };
})();
