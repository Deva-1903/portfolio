// Shared project-card + area-filter markup for the classic site (index.html, projects.html).
(function () {
  const sorted = (items) => [...items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  function card(project, { animate = true, index = 0 } = {}) {
    const footerLinks = [
      project.url    ? `<a href="${project.url}"    target="_blank" rel="noopener noreferrer" class="pcn-footer-link">repo ↗</a>`    : '',
      project.demo   ? `<a href="${project.demo}"   target="_blank" rel="noopener noreferrer" class="pcn-footer-link">demo ↗</a>`   : '',
      project.report ? `<a href="${project.report}" target="_blank" rel="noopener noreferrer" class="pcn-footer-link">report ↗</a>` : '',
    ].filter(Boolean).join('');
    return `
      <div class="project-card-new ${animate ? 'fade-up' : 'visible'}"${animate ? ` style="transition-delay: ${index * 50}ms"` : ''}>
        <div class="pcn-body">
          <h3 class="pcn-title">
            ${project.name}
            ${project.status === 'in-progress' ? '<span class="pcn-badge">in progress</span>' : ''}
          </h3>
          <p class="pcn-desc">${project.description}</p>
          ${project.stack ? `<div class="pcn-stack">${project.stack}</div>` : ''}
        </div>
        ${footerLinks ? `<div class="pcn-footer">${footerLinks}</div>` : ''}
      </div>`;
  }

  // Tabs: "all" plus one per area that has projects, each with its count
  function filterBar(projects, active) {
    const counts = {};
    projects.items.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
    const tabs = [{ id: 'all', label: 'all', count: projects.items.length }]
      .concat((projects.categories || [])
        .filter((c) => counts[c.id])
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

  const label = (projects, id) => (projects.categories || []).find((c) => c.id === id)?.label || id;

  window.ProjectsUI = { sorted, card, filterBar, onFilter, label };
})();
