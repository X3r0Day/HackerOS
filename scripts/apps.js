
import { buildBrowser } from "./browser.js";
import { renderFetchInto } from "./fetch.js";
import { getVFS } from "./vfs.js";

export const APPS = [
  { id: "terminal", name: "Terminal", desc: "System shell", icon: "terminal", color: "#8b9bd4", w: 760, h: 470 },
  { id: "files", name: "Files", desc: "File explorer", icon: "files", color: "#a3b1e2", w: 820, h: 520 },
  { id: "editor", name: "Editor", desc: "Text editor", icon: "editor", color: "#7f93cf", w: 720, h: 500 },
  { id: "browser", name: "Browser", desc: "Browse the net", icon: "globe", color: "#7fd4a9", w: 940, h: 580 },
  { id: "network", name: "Network", desc: "Network monitor", icon: "network", color: "#7fd4a9", w: 640, h: 420 },
  { id: "settings", name: "Settings", desc: "System preferences", icon: "settings", color: "#98a6d8", w: 700, h: 480 },
  { id: "system", name: "System", desc: "System info", icon: "info", color: "#8b9bd4", w: 620, h: 500 },
  { id: "welcome", name: "Welcome", desc: "Welcome screen", icon: "info", color: "#8b9bd4", w: 480, h: 400 },
];

export function getApp(id) {
  return APPS.find((a) => a.id === id);
}

export function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

const FILES_PLACES = [
  { label: "Home", path: "/home/user", icon: "files" },
  { label: "root", path: "/", icon: "files" },
  { label: "projects", path: "/home/user/projects", icon: "files" },
  { label: "tmp", path: "/tmp", icon: "files" },
];

function filesIconFor(name, type) {
  if (type === "dir") return "files";
  if (name.endsWith(".md")) return "editor";
  return "editor";
}

export function mountFiles(body, hooks = {}) {
  const vfs = getVFS();
  let current = "/home/user";

  const sidebar = body.querySelector(".files__sidebar");
  const breadcrumb = body.querySelector(".files__crumb-wrap");
  const grid = body.querySelector(".files__grid");
  const toolbar = body.querySelector(".files__toolbar-path");

  function refresh() {
    try {
      const { entries } = vfs.ls(current, "/home/user");
      breadcrumb.innerHTML = "";
      const segs = current.split("/").filter(Boolean);
      let acc = "";
      breadcrumb.append(makeCrumb("/", "root", segs.length === 0));
      segs.forEach((seg, i) => {
        acc += "/" + seg;
        breadcrumb.append(makeCrumb(acc, seg, i === segs.length - 1));
      });

      grid.innerHTML = "";
      entries.forEach((en) => {
        const el = document.createElement("button");
        el.className = `files__entry ${en.type === "file" ? "files__entry--file" : ""}`;
        el.title = `double click to open ${en.name}`;
        el.innerHTML = `
          <div class="files__entry-icon">${iconSvg(filesIconFor(en.name, en.type))}</div>
          <span class="files__entry-name">${en.name}</span>`;
        el.addEventListener("dblclick", () => {
          if (en.type === "dir") {
            current = vfs.expand(en.name, current);
            refresh();
          } else {
            hooks.openFile?.(vfs.expand(en.name, current));
          }
        });
        grid.appendChild(el);
      });
    } catch {
      grid.innerHTML = `<div class="files__empty">cannot open ${current}</div>`;
    }

    const crumbs = [...breadcrumb.children].map((c) => c.dataset.path);
    toolbar.textContent = current;
  }

  function makeCrumb(path, label, last) {
    const btn = document.createElement("button");
    btn.className = `files__crumb${last ? " files__crumb--current" : ""}`;
    btn.dataset.path = path;
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (!last) {
        current = path;
        refresh();
      }
    });
    return btn;
  }

  sidebar.querySelectorAll(".files__side-item").forEach((item) => {
    item.addEventListener("click", () => {
      current = item.dataset.path;
      sidebar.querySelectorAll(".files__side-item").forEach((el) => el.classList.remove("is-active"));
      item.classList.add("is-active");
      refresh();
    });
  });

  refresh();
}

function buildFiles() {
  const places = FILES_PLACES.map(
    (p, i) => `
      <button class="files__side-item ${i === 0 ? "is-active" : ""}" data-path="${p.path}">
        ${iconSvg(p.icon)}${p.label}
      </button>`
  ).join("");

  return `
    <div class="files">
      <div class="files__sidebar">${places}</div>
      <div class="files__main">
        <div class="files__toolbar">
          <span class="files__toolbar-label">path</span>
          <span class="files__toolbar-path mono"></span>
        </div>
        <div class="files__crumb-wrap"></div>
        <div class="files__grid"></div>
      </div>
    </div>`;
}

export function mountEditor(body, options = {}) {
  const vfs = getVFS();
  let currentPath = options.file || null;
  let dirty = false;
  let savedContent = "";

  body.innerHTML = `
    <div class="editor">
      <div class="editor__toolbar">
        <button class="editor__menu" data-menu="new" title="New">new</button>
        <button class="editor__menu" data-menu="open" title="Open">open</button>
        <button class="editor__menu" data-menu="save" title="Save">save</button>
        <button class="editor__menu" data-menu="saveas" title="Save as">save as</button>
        <span class="editor__filename" title=""></span>
        <span class="editor__dirty" title="unsaved changes"></span>
      </div>
      <textarea class="editor__textarea" spellcheck="false" placeholder="type here"></textarea>
      <div class="editor__status">
        <span class="editor__path">untitled</span>
        <span class="editor__pos">Ln 1, Col 1</span>
        <span style="margin-left:auto" class="editor__mode">insert</span>
      </div>
    </div>`;

  const textarea = body.querySelector(".editor__textarea");
  const pathEl = body.querySelector(".editor__path");
  const posEl = body.querySelector(".editor__pos");
  const nameEl = body.querySelector(".editor__filename");
  const dirtyEl = body.querySelector(".editor__dirty");

  function markDirty() {
    dirty = textarea.value !== savedContent;
    body.classList.toggle("editor--dirty", dirty);
  }

  function renderName() {
    if (!currentPath) {
      nameEl.textContent = "untitled";
      pathEl.textContent = "untitled";
    } else {
      const name = currentPath.split("/").pop();
      nameEl.textContent = name;
      nameEl.title = currentPath;
      pathEl.textContent = currentPath;
    }
  }

  function updatePos() {
    const pos = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, pos);
    const line = before.split("\n").length;
    const col = pos - before.lastIndexOf("\n");
    posEl.textContent = `Ln ${line}, Col ${col}`;
  }

  function doSave(as = false) {
    if (as || !currentPath) {
      const target = prompt("Save as (path)", currentPath || "~/notes.txt");
      if (!target) return;
      currentPath = vfs.expand(target, "/home/user");
    }
    try {
      vfs.write(currentPath, "/home/user", textarea.value);
      savedContent = textarea.value;
      markDirty();
      renderName();
    } catch (e) {
      alert(`save failed: ${e.message}`);
    }
  }

  function loadFile(path) {
    try {
      const content = vfs.read(path, "/home/user");
      currentPath = vfs.expand(path, "/home/user");
      textarea.value = content.replace(/\n$/, "");
      savedContent = textarea.value;
      markDirty();
      renderName();
      updatePos();
    } catch (e) {
      alert(`open failed: ${e.message}`);
    }
  }

  function showPicker() {
    const existing = body.querySelector(".editor__picker");
    if (existing) existing.remove();
    const panel = document.createElement("div");
    panel.className = "editor__picker";

    const collect = (dir, out) => {
      const { entries } = vfs.ls(dir, "/home/user");
      entries.forEach((en) => {
        if (en.type === "dir" && !en.name.startsWith(".")) {
          collect(vfs.expand(en.name, dir), out);
        } else if (en.type === "file" && !en.name.startsWith(".")) {
          out.push(vfs.expand(en.name, dir));
        }
      });
    };

    const files = [];
    collect("/home/user", files);
    files.sort();

    panel.innerHTML = `<div class="editor__picker-title">open file</div>`;
    const list = document.createElement("div");
    list.className = "editor__picker-list";
    if (files.length === 0) {
      list.innerHTML = `<div class="editor__picker-empty">no files found</div>`;
    }
    files.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "editor__picker-item";
      btn.dataset.path = f;
      btn.textContent = f;
      btn.addEventListener("click", () => {
        loadFile(f);
        panel.remove();
      });
      list.appendChild(btn);
    });
    panel.appendChild(list);
    body.appendChild(panel);
  }

  body.querySelector('[data-menu="new"]').addEventListener("click", () => {
    currentPath = null;
    textarea.value = "";
    savedContent = "";
    markDirty();
    renderName();
    updatePos();
    textarea.focus();
  });
  body.querySelector('[data-menu="open"]').addEventListener("click", showPicker);
  body.querySelector('[data-menu="save"]').addEventListener("click", () => doSave(false));
  body.querySelector('[data-menu="saveas"]').addEventListener("click", () => doSave(true));

  textarea.addEventListener("input", () => {
    markDirty();
    updatePos();
  });
  textarea.addEventListener("click", updatePos);
  textarea.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      doSave(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
      e.preventDefault();
      showPicker();
    }
  });

  if (currentPath) loadFile(currentPath);
  renderName();
  updatePos();
  textarea.focus();
}

function buildNetwork() {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 8 + Math.abs(Math.sin(i * 0.7)) * 46 + (Math.random() * 8 - 4);
    return `<span class="net__bar" style="height:${Math.round(h)}%"></span>`;
  }).join("");

  return `
    <div class="net">
      <div class="net__iface">
        <span class="net__iface-status"></span>
        <div class="net__iface-meta">
          <div class="net__iface-name">eth0</div>
          <div class="net__iface-ip">10.0.0.42 / 24 · 52:54:00:1a:2b:3c</div>
        </div>
        <div class="net__iface-rate">↑ 2.4 MB/s · ↓ 18.1 MB/s</div>
      </div>
      <div class="net__iface">
        <span class="net__iface-status"></span>
        <div class="net__iface-meta">
          <div class="net__iface-name">wlan0</div>
          <div class="net__iface-ip">192.168.1.23 / 24</div>
        </div>
        <div class="net__iface-rate">↑ 812 KB/s · ↓ 3.7 MB/s</div>
      </div>
      <div class="net__iface">
        <span class="net__iface-status"></span>
        <div class="net__iface-meta">
          <div class="net__iface-name">lo</div>
          <div class="net__iface-ip">127.0.0.1 / 8</div>
        </div>
        <div class="net__iface-rate">↑ 0 B/s · ↓ 0 B/s</div>
      </div>
      <div class="net__spark">${bars}</div>
    </div>`;
}

function buildSettings() {
  const rows = [
    ["Reduce motion", "Respect prefers-reduced-motion", true],
    ["Ambient glow", "Desktop radial lighting", true],
    ["Film grain", "Subtle noise overlay", true],
    ["Backdrop blur", "Frosted window surfaces", true],
    ["Terminal transparency", "See-through shell", false],
    ["Animations", "Window & dock transitions", true],
    ["Telemetry", "Anonymous usage reporting", false],
  ];

  const body = rows
    .map(
      ([label, hint, on]) => `
      <div class="settings__row">
        <div>
          <div class="settings__row-label">${label}</div>
          <div class="settings__row-hint">${hint}</div>
        </div>
        <button class="switch ${on ? "is-on" : ""}" role="switch" aria-checked="${on}"></button>
      </div>`
    )
    .join("");

  return `
    <div class="settings">
      <div class="settings__nav">
        <button class="settings__nav-item is-active">Appearance</button>
        <button class="settings__nav-item">Display</button>
        <button class="settings__nav-item">Network</button>
        <button class="settings__nav-item">Sound</button>
        <button class="settings__nav-item">Keyboard</button>
        <button class="settings__nav-item">About</button>
      </div>
      <div class="settings__panel">
        <h2 class="settings__title">Appearance</h2>
        ${body}
      </div>
    </div>`;
}

function buildSystem() {
  return `<div class="system-fetch"></div>`;
}

export function mountSystem(body) {
  const el = body.querySelector(".system-fetch");
  if (el) renderFetchInto(el);
}

function buildWelcome() {
  return `
    <div class="welcome">
      <div class="welcome__mark">
        <div class="welcome__glyph">⌁</div>
        <div class="welcome__name">HACKER OS</div>
      </div>
      <div class="welcome__body">
        <h2 class="welcome__hello">Welcome, user</h2>
        <p class="welcome__text">
          Hacker OS is a small desktop that lives in the browser. Look around,
          open the terminal, read the files, see how the system is doing.
        </p>
      </div>
      <div class="welcome__actions">
        <button class="welcome__cta" data-action="open-terminal">open terminal</button>
        <button class="welcome__cta welcome__cta--quiet" data-action="open-system">system info</button>
      </div>
    </div>`;
}

export function buildAppContent(app) {
  switch (app.id) {
    case "files":
      return buildFiles();
    case "editor":
    case "browser":
      return buildBrowser();
      return '<div class="editor" data-mount="editor"></div>';
    case "network":
      return buildNetwork();
    case "settings":
      return buildSettings();
    case "system":
      return buildSystem();
    case "welcome":
      return buildWelcome();
    case "terminal":
      return '<div class="term"></div>';
    default:
      return `<div class="app-empty">${app.name} — skeleton</div>`;
  }
}
