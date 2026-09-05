
import { getApp, iconSvg, buildAppContent, mountSystem, mountFiles, mountEditor } from "./apps.js";
import { mountTerminal } from "./terminal.js";
import { clamp, bus } from "./system.js";

const windowsEl = () => document.getElementById("windows");
const desktopEl = () => document.getElementById("desktop");

const windows = new Map();
let zTop = 10;
let openSeq = 0;

function emitChange() {
  bus.emit("apps-changed", getOpenApps());
}

export function getOpenApps() {
  return [...windows.keys()];
}

export function onAppsChange(fn) {
  return bus.on("apps-changed", fn);
}

function workArea() {
  const sb = document.querySelector(".statusbar");
  const dk = document.querySelector(".dock");
  const top = sb ? sb.offsetHeight : 0;
  const left = dk ? dk.offsetLeft + dk.offsetWidth + 10 : 0;
  return { top, left };
}

export function focusWindow(win) {
  win.style.zIndex = ++zTop;
  windowsEl()
    .querySelectorAll(".window.is-focused")
    .forEach((w) => w.classList.remove("is-focused"));
  win.classList.add("is-focused");
}

export function openApp(appId, options = {}) {
  const app = getApp(appId);
  if (!app) return null;

  if (windows.has(appId)) {
    const existing = windows.get(appId);
    if (existing.dataset.minimized === "true") {
      existing.style.display = "flex";
      existing.dataset.minimized = "false";
      existing.classList.remove("is-minimized");
    }
    if (options.file && appId === "editor") {
      const body = existing.querySelector(".window__body");
      body.innerHTML = buildAppContent(app);
      mountEditor(body, options);
    }
    focusWindow(existing);
    const inp = existing.querySelector(".term__input");
    if (inp) inp.focus();
    return existing;
  }

  const win = document.createElement("section");
  win.className = "window";
  win.dataset.app = appId;

  win.innerHTML = `
    <div class="window__titlebar">
      <div class="window__title">
        <span class="window__title-icon">${iconSvg(app.icon)}</span>
        <span class="window__title-text">${app.name}</span>
      </div>
      <div class="window__controls">
        <button class="window__control" data-action="min" title="Minimize" aria-label="Minimize">–</button>
        <button class="window__control" data-action="max" title="Maximize" aria-label="Maximize">▢</button>
        <button class="window__control window__control--close" data-action="close" title="Close" aria-label="Close">×</button>
      </div>
    </div>
    <div class="window__body"></div>`;

  const dirs = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
  dirs.forEach((d) => {
    const h = document.createElement("span");
    h.className = `resize-handle resize-handle--${d}`;
    h.dataset.dir = d;
    win.appendChild(h);
  });

  const body = win.querySelector(".window__body");
  body.innerHTML = buildAppContent(app);
  if (appId === "terminal") {
    mountTerminal(body.querySelector(".term"), {
      openApp,
      close: () => closeApp(appId),
    });
  } else if (appId === "system") {
    mountSystem(body);
  } else if (appId === "files") {
    mountFiles(body, { openFile: (p) => openApp("editor", { file: p }) });
  } else if (appId === "editor") {
    mountEditor(body, options);
  } else if (appId === "welcome") {
    wireWelcome(win, body);
  }

  const rect = desktopEl().getBoundingClientRect();
  const { top, left } = workArea();
  const w = Math.min(app.w, rect.width - left - 24);
  const h = Math.min(app.h, rect.height - top - 24);
  const step = (openSeq++ % 9) * 26;

  if (appId === "welcome") {
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.left = `${left + Math.max(20, (rect.width - left - w) / 2)}px`;
    win.style.top = `${top + Math.max(16, (rect.height - top - h) / 2.4)}px`;
  } else {
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.left = `${left + 24 + step}px`;
    win.style.top = `${top + 24 + step}px`;
  }

  windowsEl().appendChild(win);
  windows.set(appId, win);

  wireControls(win, appId);
  makeDraggable(win);
  makeResizable(win);
  focusWindow(win);
  emitChange();

  const inp = win.querySelector(".term__input");
  if (inp) inp.focus();

  return win;
}

function wireControls(win, appId) {
  win.querySelectorAll(".window__control").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === "close") closeApp(appId);
      else if (action === "min") minimize(win);
      else if (action === "max") toggleMaximize(win);
    });
  });

  win.querySelector(".window__titlebar").addEventListener("dblclick", (e) => {
    if (e.target.closest(".window__control")) return;
    toggleMaximize(win);
  });
}

function wireWelcome(win, body) {
  win.classList.add("window--welcome");
  win.querySelector('[data-action="min"]').style.display = "none";
  win.querySelector('[data-action="max"]').style.display = "none";
  body.querySelector('[data-action="open-terminal"]').addEventListener("click", () => {
    openApp("terminal");
  });
  body.querySelector('[data-action="open-system"]').addEventListener("click", () => {
    openApp("system");
  });
}

function minimize(win) {
  win.style.display = "none";
  win.dataset.minimized = "true";
  win.classList.remove("is-focused");
  emitChange();
}

function toggleMaximize(win) {
  if (win.dataset.maximized === "true") {
    win.style.left = win.dataset.prevLeft;
    win.style.top = win.dataset.prevTop;
    win.style.width = win.dataset.prevWidth;
    win.style.height = win.dataset.prevHeight;
    win.dataset.maximized = "false";
    win.classList.remove("is-maximized");
  } else {
    const rect = desktopEl().getBoundingClientRect();
    const { top, left } = workArea();
    win.dataset.prevLeft = win.style.left;
    win.dataset.prevTop = win.style.top;
    win.dataset.prevWidth = win.style.width;
    win.dataset.prevHeight = win.style.height;
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
    win.style.width = `${rect.width - left}px`;
    win.style.height = `${rect.height - top}px`;
    win.dataset.maximized = "true";
    win.classList.add("is-maximized");
  }
}

function closeApp(appId) {
  const win = windows.get(appId);
  if (!win) return;
  win.remove();
  windows.delete(appId);
  emitChange();
}

function makeDraggable(win) {
  const bar = win.querySelector(".window__titlebar");
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".window__control")) return;
    if (win.dataset.maximized === "true") return;

    focusWindow(win);
    const rect = win.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;

    const move = (ev) => {
      const dRect = desktopEl().getBoundingClientRect();
      const { top, left } = workArea();
      const x = clamp(ev.clientX - offX, left, dRect.width - 80);
      const y = clamp(ev.clientY - offY, top, dRect.height - 44);
      win.style.left = `${x}px`;
      win.style.top = `${y}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}

function makeResizable(win) {
  win.querySelectorAll(".resize-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (win.dataset.maximized === "true") return;

      focusWindow(win);
      const dir = handle.dataset.dir;
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = win.offsetWidth;
      const startH = win.offsetHeight;
      const startL = win.offsetLeft;
      const startT = win.offsetTop;
      const minW = 320;
      const minH = 200;

      const move = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let w = startW;
        let h = startH;
        let l = startL;
        let t = startT;

        if (dir.includes("e")) w = startW + dx;
        if (dir.includes("s")) h = startH + dy;
        if (dir.includes("w")) {
          w = startW - dx;
          l = startL + dx;
        }
        if (dir.includes("n")) {
          h = startH - dy;
          t = startT + dy;
        }

        if (w < minW) {
          if (dir.includes("w")) l -= minW - w;
          w = minW;
        }
        if (h < minH) {
          if (dir.includes("n")) t -= minH - h;
          h = minH;
        }

        win.style.width = `${w}px`;
        win.style.height = `${h}px`;
        win.style.left = `${l}px`;
        win.style.top = `${t}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  });
}
