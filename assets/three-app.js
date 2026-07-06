/* =============================================================
   Deva Anand — 3D Mode
   Hybrid renderer: WebGL (particles + interactive beacons) behind
   a CSS3DRenderer layer (crisp, clickable floating content).
   Content is loaded from the SAME content/content.json the
   classic portfolio uses.
   ============================================================= */

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/* ---------- environment / perf flags ---------- */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = window.matchMedia('(pointer: coarse)').matches;
const IS_MOBILE = Math.min(window.innerWidth, window.innerHeight) < 760 || COARSE;
const MOTION = REDUCED ? 0.25 : 1;
const SECTION_GAP = 2600;

/* ---------- DOM ---------- */
const webglEl = document.getElementById('webgl');
const css3dEl = document.getElementById('css3d');
const loaderEl = document.getElementById('loader');
const navEl = document.getElementById('sectionNav');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const sectionIndexEl = document.getElementById('sectionIndex');
const scrollHint = document.getElementById('scrollHint');
const themeToggle = document.getElementById('themeToggle3d');

/* ---------- palette per theme ---------- */
function palette() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  return dark
    ? { fog: 0x070b15, star: 0x9ec7ff, starNear: 0x7dd3fc, beacon: 0x7dd3fc, beacon2: 0xa5b4fc, density: 0.00021 }
    : { fog: 0xdfe8f6, star: 0x8ba6d6, starNear: 0x2563eb, beacon: 0x2563eb, beacon2: 0x7c3aed, density: 0.00028 };
}

/* =============================================================
   THREE.js setup
   ============================================================= */
let renderer, cssRenderer, camera, webglScene, cssScene, clock;
let particlesFar, particlesNear, beacons = [];
let hasWebGL = true;

try {
  renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  hasWebGL = false;
}

const PIX = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 2 : 2);

function initThree() {
  webglScene = new THREE.Scene();
  cssScene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 24000);
  camera.position.set(0, 0, 1150);

  renderer.setPixelRatio(PIX);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent -> CSS gradient shows through
  webglEl.appendChild(renderer.domElement);

  cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  css3dEl.appendChild(cssRenderer.domElement);

  const p = palette();
  webglScene.fog = new THREE.FogExp2(p.fog, p.density);

  buildParticles(p);
  buildBeacons(p);
}

/* ---------- particle fields ---------- */
function makePoints(count, spread, depth, size, color, opacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
    pos[i * 3 + 2] = 1500 - Math.random() * depth;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true,
    opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

function buildParticles(p) {
  const depth = SECTION_GAP * 5 + 2000;
  const farCount = IS_MOBILE ? 900 : 2200;
  const nearCount = IS_MOBILE ? 200 : 520;
  particlesFar = makePoints(farCount, 5200, depth, IS_MOBILE ? 7 : 6, p.star, 0.7);
  particlesNear = makePoints(nearCount, 4200, depth, 14, p.starNear, 0.6);
  webglScene.add(particlesFar, particlesNear);
}

/* ---------- interactive beacons (one per section) ---------- */
function buildBeacons(p) {
  const geoms = [
    new THREE.IcosahedronGeometry(220, 1),
    new THREE.OctahedronGeometry(230, 0),
    new THREE.TorusKnotGeometry(150, 42, 120, 12),
    new THREE.DodecahedronGeometry(220, 0),
    new THREE.IcosahedronGeometry(200, 0),
  ];
  // where each beacon floats, relative to its section anchor
  const offsets = [
    { x: 640, y: -60, z: -260 },
    { x: -680, y: 120, z: -280 },
    { x: 0, y: 0, z: -520 },
    { x: 700, y: -120, z: -240 },
    { x: -640, y: 90, z: -260 },
  ];
  for (let i = 0; i < geoms.length; i++) {
    const group = new THREE.Group();
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geoms[i]),
      new THREE.LineBasicMaterial({ color: i % 2 ? p.beacon2 : p.beacon, transparent: true, opacity: 0.85 })
    );
    const solid = new THREE.Mesh(
      geoms[i],
      new THREE.MeshBasicMaterial({ color: i % 2 ? p.beacon2 : p.beacon, transparent: true, opacity: 0.05, wireframe: false })
    );
    group.add(solid, edges);
    const o = offsets[i];
    group.position.set(o.x, o.y, -i * SECTION_GAP + o.z);
    group.userData = { spin: 0.08 + i * 0.015, phase: i * 1.7, edgesMat: edges.material, solidMat: solid.material, odd: i % 2 };
    webglScene.add(group);
    beacons.push(group);
  }
}

/* =============================================================
   Content  (from content.json)
   ============================================================= */
const SECTIONS = [
  { id: 'about', label: 'about' },
  { id: 'experience', label: 'experience' },
  { id: 'projects', label: 'projects' },
  { id: 'writing', label: 'writing' },
  { id: 'more', label: 'more' },
];

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const floaters = []; // { obj, base:{x,y,z}, amp, speed, phase, rot }

function addPanel(element, x, y, z, sectionZ, floatCfg) {
  const obj = new CSS3DObject(element);
  obj.position.set(x, y, z + sectionZ);
  cssScene.add(obj);
  if (floatCfg) {
    floaters.push({
      obj,
      base: { x, y, z: z + sectionZ },
      amp: floatCfg.amp ?? 22,
      speed: floatCfg.speed ?? 0.5,
      phase: floatCfg.phase ?? Math.random() * Math.PI * 2,
      rot: floatCfg.rot ?? 0.03,
    });
  }
  return obj;
}

function buildContent(c) {
  const M = IS_MOBILE ? 0.66 : 1;      // global scale for readability on small screens
  const scaleObj = (obj) => obj.scale.setScalar(M);

  /* ---- 0. ABOUT (hero) ---- */
  {
    const z = 0;
    const nameParts = c.header.name.split(' ');
    const first = nameParts[0];
    const last = nameParts.slice(1).join(' ');
    const socials = c.header.socialLinks
      .map(l => `<a href="${l.url}" target="_blank" rel="noopener noreferrer" aria-label="${l.platform}"><i class="${(l.icon || '').replace(/\s*i?ico[\w-]*/g, '').trim()}"></i></a>`)
      .join('');
    const about = c.about.paragraphs.map(p => `<p>${p}</p>`).join('');
    const card = el(`
      <div class="card3d hero-card eyebrow-glow">
        <div class="eyebrow">portfolio · 3d mode</div>
        <div class="hero-top">
          <img class="hero-avatar" src="${c.header.profileImage}" alt="${c.header.name}" />
          <div>
            <h1 class="hero-name">${first} <span class="accent">${last}</span></h1>
            <div class="hero-loc">${c.header.location}</div>
          </div>
        </div>
        <div class="hero-about">${about}</div>
        <div class="hero-socials">${socials}</div>
      </div>`);
    scaleObj(addPanel(card, 0, 0, 0, z, { amp: 14 * MOTION, speed: 0.35, rot: 0.015 }));
  }

  /* ---- 1. EXPERIENCE ---- */
  {
    const z = -SECTION_GAP;
    const items = c.history.entries.map(e => {
      let cw = '';
      if (e.coursework) {
        const arr = Array.isArray(e.coursework) ? e.coursework : [e.coursework];
        cw = arr.map(s => {
          const courses = s.categories.flatMap(cat => cat.courses.map(co => `${co.code}`)).join(', ');
          return `<div class="entry-coursework"><span class="semester-title">${s.semester}</span> · ${courses}</div>`;
        }).join('');
      }
      return `
        <div class="xp-item">
          <img class="xp-logo" src="${e.logo}" alt="" loading="lazy" />
          <div>
            <div class="xp-span">${e.timespan}</div>
            <div class="xp-desc">${e.description}${cw}</div>
          </div>
        </div>`;
    }).join('');
    const card = el(`
      <div class="card3d" style="width:700px">
        <div class="eyebrow">the path so far</div>
        <h2 class="section-title">${'experience'}</h2>
        <div class="xp-list">${items}</div>
      </div>`);
    scaleObj(addPanel(card, 0, 0, 0, z, { amp: 12 * MOTION, speed: 0.3, rot: 0.01 }));
  }

  /* ---- 2. PROJECTS (floating cluster) ---- */
  {
    const z = -2 * SECTION_GAP;
    const sorted = [...c.projects.items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    const shown = sorted.slice(0, 6);

    // heading panel
    const head = el(`
      <div class="card3d" style="width:${IS_MOBILE ? 300 : 420}px">
        <div class="eyebrow">selected work</div>
        <h2 class="section-title">${c.projects.title}</h2>
        <p class="section-sub">Floating build logs — hover to focus, click to open.</p>
        <a class="pill p3d-cta" href="./projects.html">view all projects</a>
      </div>`);

    const layout = IS_MOBILE
      ? [ // vertical-ish, tight
        { x: 0, y: 640, z: 60 }, // heading
        { x: -210, y: 250, z: 120 }, { x: 210, y: 250, z: -40 },
        { x: -210, y: -140, z: 40 }, { x: 210, y: -140, z: 150 },
        { x: -210, y: -530, z: -30 }, { x: 210, y: -530, z: 90 },
      ]
      : [
        { x: -720, y: 470, z: 60 }, // heading (top-left)
        { x: 60, y: 430, z: 180 }, { x: 720, y: 360, z: -40 },
        { x: -640, y: -110, z: 220 }, { x: 40, y: -180, z: -80 },
        { x: 720, y: -160, z: 160 }, { x: -60, y: -560, z: 60 },
      ];

    scaleObj(addPanel(head, layout[0].x, layout[0].y, layout[0].z, z, { amp: 12 * MOTION, speed: 0.3 }));

    shown.forEach((pr, i) => {
      const links = [
        pr.url ? `<a class="p3d-link" href="${pr.url}" target="_blank" rel="noopener noreferrer">repo ↗</a>` : '',
        pr.demo ? `<a class="p3d-link" href="${pr.demo}" target="_blank" rel="noopener noreferrer">demo ↗</a>` : '',
        pr.report ? `<a class="p3d-link" href="${pr.report}" target="_blank" rel="noopener noreferrer">report ↗</a>` : '',
      ].filter(Boolean).join('');
      const card = el(`
        <div class="project3d">
          <div class="p3d-head">
            <h3 class="p3d-title">${pr.name}</h3>
            ${pr.status === 'in-progress' ? '<span class="p3d-badge">in progress</span>' : ''}
          </div>
          <p class="p3d-desc">${pr.description}</p>
          ${pr.stack ? `<div class="p3d-stack">${pr.stack}</div>` : ''}
          ${links ? `<div class="p3d-foot">${links}</div>` : ''}
        </div>`);
      const L = layout[i + 1];
      scaleObj(addPanel(card, L.x, L.y, L.z, z, {
        amp: (18 + (i % 3) * 8) * MOTION, speed: 0.35 + (i % 4) * 0.06, rot: 0.04,
      }));
    });
  }

  /* ---- 3. WRITING ---- */
  {
    const z = -3 * SECTION_GAP;
    const articles = c.writing.articles.map(a =>
      `<li><span class="date">${a.date}</span><a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.title}</a></li>`
    ).join('');
    const card = el(`
      <div class="card3d" style="width:620px">
        <div class="eyebrow">${c.writing.subtitle}</div>
        <h2 class="section-title">${c.writing.title}</h2>
        <ul class="link-list">${articles}</ul>
        <p style="margin-top:22px"><a class="p3d-link" href="${c.writing.contentLink.url}">${c.writing.contentLink.text}</a></p>
      </div>`);
    scaleObj(addPanel(card, 0, 0, 0, z, { amp: 14 * MOTION, speed: 0.32, rot: 0.012 }));
  }

  /* ---- 4. MORE (publications + updates) ---- */
  {
    const z = -4 * SECTION_GAP;
    const pubs = c.publications.items.map(p => `
      <div class="pub">
        <div class="pub-title">${p.url ? `<a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.title}</a>` : p.title}</div>
        <div class="pub-venue">${p.venue}</div>
        <div class="pub-authors">${p.authors}</div>
      </div>`).join('');
    const pubCard = el(`
      <div class="card3d" style="width:520px">
        <div class="eyebrow">peer reviewed</div>
        <h2 class="section-title">${c.publications.title}</h2>
        ${pubs}
      </div>`);

    const updates = c.misc.items.map(m => {
      let d = m.description || '';
      if (m.url && m.url.trim() && m.linkText) {
        const rx = new RegExp(`(${m.linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
        d = d.replace(rx, `<a href="${m.url}" target="_blank" rel="noopener noreferrer">$1</a>`);
      } else if (m.url && m.url.trim()) {
        d = `<a href="${m.url}" target="_blank" rel="noopener noreferrer">${d}</a>`;
      }
      return `<div class="update-item"><strong>${m.date}</strong> · ${d}</div>`;
    }).join('');
    const updCard = el(`
      <div class="card3d" style="width:520px">
        <div class="eyebrow">the feed</div>
        <h2 class="section-title">${c.misc.title}</h2>
        <div class="updates">${updates}</div>
      </div>`);

    if (IS_MOBILE) {
      scaleObj(addPanel(pubCard, 0, 430, 40, z, { amp: 12 * MOTION, speed: 0.3 }));
      scaleObj(addPanel(updCard, 0, -360, 120, z, { amp: 14 * MOTION, speed: 0.34 }));
    } else {
      scaleObj(addPanel(pubCard, -370, 40, 60, z, { amp: 14 * MOTION, speed: 0.3, rot: 0.012 }));
      scaleObj(addPanel(updCard, 400, -20, -40, z, { amp: 16 * MOTION, speed: 0.34, rot: 0.014 }));
    }
  }
}

/* ---------- camera targets per section ---------- */
function sectionTarget(i) {
  const z = -i * SECTION_GAP;
  const camDist = i === 2 ? (IS_MOBILE ? 2050 : 1780) : (IS_MOBILE ? 1650 : 1180);
  return {
    pos: new THREE.Vector3(0, i === 2 ? -20 : 0, z + camDist),
    look: new THREE.Vector3(0, i === 2 ? -10 : 0, z),
  };
}

/* =============================================================
   Navigation + camera motion
   ============================================================= */
let current = 0;
const camPos = new THREE.Vector3(0, 0, 1180);
const camLook = new THREE.Vector3(0, 0, 0);
const targetPos = new THREE.Vector3(0, 0, 1180);
const targetLook = new THREE.Vector3(0, 0, 0);
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };

function goTo(i) {
  i = Math.max(0, Math.min(SECTIONS.length - 1, i));
  current = i;
  const t = sectionTarget(i);
  targetPos.copy(t.pos);
  targetLook.copy(t.look);
  updateNavUI();
  hideHint();
  try { history.replaceState(null, '', '#' + SECTIONS[i].id); } catch (e) {}
}

function updateNavUI() {
  sectionIndexEl.textContent = `${String(current + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}`;
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === SECTIONS.length - 1;
  [...navEl.children].forEach((d, i) => d.classList.toggle('active', i === current));
}

function buildNav() {
  navEl.innerHTML = '';
  SECTIONS.forEach((s, i) => {
    const b = el(`<button class="nav-dot" aria-label="${s.label}"><span class="label">${s.label}</span><span class="marker"></span></button>`);
    b.addEventListener('click', () => goTo(i));
    navEl.appendChild(b);
  });
}

let hintGone = false;
function hideHint() {
  if (hintGone) return;
  hintGone = true;
  scrollHint.classList.add('gone');
}

/* ---- input: wheel / keys / touch ---- */
let navLock = 0;
function tryNav(dir) {
  const now = performance.now();
  if (now - navLock < 620) return;
  const next = current + dir;
  if (next < 0 || next >= SECTIONS.length) return;
  navLock = now;
  goTo(next);
}

window.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 8) return;
  tryNav(e.deltaY > 0 ? 1 : -1);
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { tryNav(1); e.preventDefault(); }
  else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { tryNav(-1); e.preventDefault(); }
  else if (e.key === 'Home') goTo(0);
  else if (e.key === 'End') goTo(SECTIONS.length - 1);
});

let touchY = null, touchX = null;
window.addEventListener('touchstart', (e) => {
  touchY = e.touches[0].clientY; touchX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchend', (e) => {
  if (touchY == null) return;
  const dy = e.changedTouches[0].clientY - touchY;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx)) tryNav(dy < 0 ? 1 : -1);
  touchY = touchX = null;
}, { passive: true });

/* ---- pointer parallax ---- */
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

/* =============================================================
   Theme toggle
   ============================================================= */
function applySceneTheme() {
  const p = palette();
  if (webglScene && webglScene.fog) {
    webglScene.fog.color.setHex(p.fog);
    webglScene.fog.density = p.density;
  }
  if (particlesFar) particlesFar.material.color.setHex(p.star);
  if (particlesNear) particlesNear.material.color.setHex(p.starNear);
  beacons.forEach(b => {
    const col = b.userData.odd ? p.beacon2 : p.beacon;
    b.userData.edgesMat.color.setHex(col);
    b.userData.solidMat.color.setHex(col);
  });
}

themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  const next = dark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  applySceneTheme();
});

/* =============================================================
   Resize + render loop
   ============================================================= */
function onResize() {
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

let running = true;
document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) { clock.getDelta(); animate(); }
});

function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // smooth pointer
  mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 4);
  mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 4);

  // eased camera follow (always smooth)
  const k = 1 - Math.pow(0.0016, dt);
  camPos.lerp(targetPos, k);
  camLook.lerp(targetLook, k);

  // parallax offset added on top of eased base
  const par = IS_MOBILE ? 0 : 60;
  camera.position.set(camPos.x + mouse.sx * par, camPos.y - mouse.sy * par, camPos.z);
  camera.lookAt(camLook.x + mouse.sx * par * 0.4, camLook.y - mouse.sy * par * 0.4, camLook.z);

  // particles drift
  if (particlesFar) {
    particlesFar.rotation.z = t * 0.006 * MOTION;
    particlesNear.rotation.z = -t * 0.01 * MOTION;
    particlesNear.rotation.x = Math.sin(t * 0.05) * 0.03 * MOTION;
  }

  // beacons spin + gentle mouse tilt
  for (const b of beacons) {
    b.rotation.y = t * b.userData.spin * MOTION + b.userData.phase;
    b.rotation.x = Math.sin(t * 0.3 + b.userData.phase) * 0.35 * MOTION + mouse.sy * 0.2;
    b.rotation.z = mouse.sx * 0.12;
    b.position.y += Math.sin(t * 0.5 + b.userData.phase) * 0.06 * MOTION;
  }

  // floating content bob
  for (const f of floaters) {
    const o = f.obj;
    o.position.y = f.base.y + Math.sin(t * f.speed + f.phase) * f.amp;
    o.position.x = f.base.x + Math.cos(t * f.speed * 0.7 + f.phase) * f.amp * 0.35;
    o.rotation.z = Math.sin(t * f.speed * 0.6 + f.phase) * f.rot * MOTION;
    o.rotation.y = Math.sin(t * f.speed * 0.5 + f.phase) * f.rot * 1.4 * MOTION;
  }

  renderer.render(webglScene, camera);
  cssRenderer.render(cssScene, camera);
}

/* =============================================================
   Boot
   ============================================================= */
async function boot() {
  if (!hasWebGL) {
    document.getElementById('noWebgl').hidden = false;
    loaderEl.classList.add('hidden');
    return;
  }
  initThree();
  buildNav();

  try {
    const res = await fetch('./content/content.json');
    const content = await res.json();
    buildContent(content);
  } catch (e) {
    console.error('Failed to load content.json', e);
  }

  applySceneTheme();
  const startIndex = Math.max(0, SECTIONS.findIndex(s => s.id === location.hash.replace('#', '')));
  goTo(startIndex || 0);
  camPos.copy(targetPos);
  camLook.copy(targetLook);
  animate();

  // reveal
  requestAnimationFrame(() => {
    setTimeout(() => loaderEl.classList.add('hidden'), 350);
  });

  // auto-dismiss hint
  setTimeout(hideHint, 6500);
}

boot();
