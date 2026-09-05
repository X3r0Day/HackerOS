
import { renderFetchInto } from "./fetch.js";

export const APPS = [
  { id: "terminal", name: "Terminal", desc: "System shell", icon: "terminal", color: "#8b9bd4", w: 760, h: 470 },
  { id: "files", name: "Files", desc: "File explorer", icon: "files", color: "#a3b1e2", w: 820, h: 520 },
  { id: "editor", name: "Editor", desc: "Text editor", icon: "editor", color: "#7f93cf", w: 720, h: 500 },
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

const FILES_TREE = {
  home: {
    label: "Home",
    icon: "files",
    entries: [
      { type: "dir", name: ".config", icon: "files" },
      { type: "dir", name: "Documents", icon: "files" },
      { type: "dir", name: "Downloads", icon: "files" },
      { type: "dir", name: "projects", icon: "files" },
      { type: "dir", name: "tools", icon: "files" },
      { type: "file", name: "notes.txt", icon: "editor" },
      { type: "file", name: ".bashrc", icon: "editor" },
      { type: "file", name: "readme.md", icon: "editor" },
      { type: "file", name: "keys.pub", icon: "editor" },
    ],
  },
  root: {
    label: "root",
    icon: "files",
    entries: [
      { type: "dir", name: "bin", icon: "files" },
      { type: "dir", name: "boot", icon: "files" },
      { type: "dir", name: "dev", icon: "files" },
      { type: "dir", name: "etc", icon: "files" },
      { type: "dir", name: "home", icon: "files" },
      { type: "dir", name: "usr", icon: "files" },
      { type: "dir", name: "var", icon: "files" },
      { type: "file", name: "init", icon: "editor" },
    ],
  },
  projects: {
    label: "projects",
    icon: "files",
    entries: [
      { type: "dir", name: "kernel", icon: "files" },
      { type: "dir", name: "shell", icon: "files" },
      { type: "dir", name: "wm", icon: "files" },
      { type: "file", name: "todo.md", icon: "editor" },
      { type: "file", name: "Cargo.toml", icon: "editor" },
    ],
  },
};

function buildFiles() {
  const entries = FILES_TREE.home.entries
    .map(
      (e) => `
        <div class="files__entry ${e.type === "file" ? "files__entry--file" : ""}">
          <div class="files__entry-icon">${iconSvg(e.icon)}</div>
          <span class="files__entry-name">${e.name}</span>
        </div>`
    )
    .join("");

  return `
    <div class="files">
      <div class="files__sidebar">
        <div class="files__side-item is-active">${iconSvg("files")}Home</div>
        <div class="files__side-item">${iconSvg("files")}root</div>
        <div class="files__side-item">${iconSvg("files")}projects</div>
        <div class="files__side-item">${iconSvg("editor")}Recent</div>
      </div>
      <div class="files__main">
        <div class="files__toolbar">
          <span class="files__crumb">/</span>
          <span class="files__crumb">home</span>
          <span class="files__crumb files__crumb--current">user</span>
        </div>
        <div class="files__grid">${entries}</div>
      </div>
    </div>`;
}

const EDITOR_SAMPLE = `#!/usr/bin/env sh
# HACKER//OS bootstrap stub
set -e

echo "[boot] mounting virtual filesystems..."
mount -t proc proc /proc
mount -t sysfs sysfs /sys

echo "[boot] starting display server..."
/usr/bin/hos-display &

echo "[boot] session ready."
`;

function buildEditor() {
  const gutter = Array.from({ length: 18 }, (_, i) => i + 1).join("<br>");
  return `
    <div class="editor">
      <div class="editor__toolbar">
        <span class="editor__filename">init.sh</span>
        <span>utf-8</span>
        <span>sh</span>
        <span>Ln 1, Col 1</span>
      </div>
      <div class="editor__gutter-wrap">
        <div class="editor__gutter">${gutter}</div>
        <textarea class="editor__textarea" spellcheck="false">${EDITOR_SAMPLE.trim()}</textarea>
      </div>
      <div class="editor__status">
        <span>sh</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span style="margin-left:auto">insert</span>
      </div>
    </div>`;
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
        <div class="welcome__name">HACKER<span>//</span>OS</div>
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
      return buildEditor();
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
