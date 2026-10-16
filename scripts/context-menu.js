
import { iconSvg } from "./apps.js";
import { openApp, focusWindow } from "./window-manager.js";
import { clamp } from "./system.js";

const APPLET_ITEMS = [
  { label: "new terminal", icon: "terminal", run: () => openApp("terminal") },
  { label: "open files", icon: "files", run: () => openApp("files") },
  { label: "open browser", icon: "globe", run: () => openApp("browser") },
  { label: "open settings", icon: "settings", run: () => openApp("settings") },
  { type: "sep" },
  { label: "system info", icon: "info", run: () => openApp("system") },
  { type: "sep" },
  { label: "about hacker os", icon: "grid", run: () => openApp("welcome") },
];

let el = null;
let activeItem = -1;

function build() {
  el = document.createElement("div");
  el.className = "ctx";
  el.setAttribute("role", "menu");
  document.body.appendChild(el);
}

function itemEls() {
  return [...el.querySelectorAll(".ctx__item")];
}

function renderMenu(items) {
  el.innerHTML = "";
  const frag = document.createDocumentFragment();

  items.forEach((item, i) => {
    if (item.type === "sep") {
      const sep = document.createElement("div");
      sep.className = "ctx__sep";
      sep.setAttribute("role", "separator");
      frag.appendChild(sep);
      return;
    }

    const btn = document.createElement("button");
    btn.className = "ctx__item";
    btn.setAttribute("role", "menuitem");
    btn.dataset.idx = String(i);
    btn.innerHTML = `
      <span class="ctx__icon">${item.icon ? iconSvg(item.icon) : ""}</span>
      <span class="ctx__label">${item.label}</span>`;
    btn.addEventListener("pointerenter", () => select(i));
    btn.addEventListener("click", () => {
      close();
      item.run?.();
    });
    frag.appendChild(btn);
  });

  el.appendChild(frag);
}

function select(i) {
  activeItem = i;
  itemEls().forEach((it) => {
    it.classList.toggle("is-selected", Number(it.dataset.idx) === i);
  });
}

function move(delta) {
  const items = itemEls();
  if (items.length === 0) return;
  let idx = activeItem;
  if (idx < 0) idx = delta > 0 ? -1 : items.length;
  idx = (idx + delta + items.length) % items.length;
  select(idx);
}

function clickCurrent() {
  const cur = itemEls().find((it) => it.classList.contains("is-selected"));
  if (cur) cur.click();
}

function show(x, y, target = null) {
  const editable = target?.closest("input, textarea, [contenteditable]");
  renderMenu(editable ? buildEditItems(editable) : APPLET_ITEMS);

  el.style.display = "block";
  const r = el.getBoundingClientRect();
  const px = clamp(x, 4, window.innerWidth - r.width - 4);
  const py = clamp(y, 4, window.innerHeight - r.height - 4);
  el.style.left = `${px}px`;
  el.style.top = `${py}px`;
  el.style.transformOrigin = `${x - px}px ${y - py}px`;

  void el.offsetWidth;
  el.classList.add("is-open");
  select(-1);
}

function close() {
  if (!el || el.style.display === "none") return;
  el.classList.remove("is-open");
  el.style.display = "none";
  activeItem = -1;
}

function editAction(cmd, target) {
  const sel = window.getSelection();
  const selectedText = sel ? sel.toString() : "";

  if (cmd === "copy") {
    if (selectedText) {
      navigator.clipboard?.writeText(selectedText).catch(() => document.execCommand("copy"));
    }
    return;
  }

  if (cmd === "cut") {
    if (selectedText) {
      navigator.clipboard?.writeText(selectedText).catch(() => document.execCommand("cut"));
      if (target.matches("input, textarea")) {
        target.setRangeText("", target.selectionStart, target.selectionEnd, "end");
        target.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (target.isContentEditable) {
        document.execCommand("delete");
      }
    }
    return;
  }

  if (cmd === "paste") {
    const read = navigator.clipboard?.readText();
    if (target.matches("input, textarea")) {
      read?.then((t) => {
        target.setRangeText(t, target.selectionStart, target.selectionEnd, "end");
        target.dispatchEvent(new Event("input", { bubbles: true }));
      });
    } else if (target.isContentEditable) {
      read?.then((t) => document.execCommand("insertText", false, t));
    }
    return;
  }

  if (cmd === "selectAll") {
    if (target.matches("input, textarea")) target.select();
    else document.execCommand("selectAll");
  }
}

function buildEditItems(target) {
  return [
    { label: "cut", icon: null, run: () => editAction("cut", target) },
    { label: "copy", icon: null, run: () => editAction("copy", target) },
    { label: "paste", icon: null, run: () => editAction("paste", target) },
    { type: "sep" },
    { label: "select all", icon: null, run: () => editAction("selectAll", target) },
    { type: "sep" },
    ...APPLET_ITEMS,
  ];
}

export function initContextMenu() {
  build();

  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".browser")) return;
    e.preventDefault();
    if (!document.body.classList.contains("logged-in")) return;
    const win = e.target.closest(".window");
    if (win) focusWindow(win);
    show(e.clientX, e.clientY, e.target);
  });

  document.addEventListener("pointerdown", (e) => {
    if (el.contains(e.target)) return;
    close();
  });

  document.addEventListener("keydown", (e) => {
    if (!el || el.style.display === "none") return;
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      clickCurrent();
    }
  });

  window.addEventListener("resize", close);
  window.addEventListener("blur", close);
  window.addEventListener("wheel", close, { passive: true });
}
