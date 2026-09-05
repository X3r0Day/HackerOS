
import { APPS, iconSvg } from "./apps.js";
import { runBoot } from "./boot.js";
import { openApp, onAppsChange, getOpenApps, focusWindow } from "./window-manager.js";
import { clamp, pad, bootTime, formatUptime } from "./system.js";

const dock = document.getElementById("dock");
const launcher = document.getElementById("launcher");
const launcherGrid = document.getElementById("launcher-grid");
const launcherInput = document.getElementById("launcher-input");
const clockEl = document.getElementById("clock");

function buildDock() {
  const launcherBtn = document.createElement("button");
  launcherBtn.className = "dock__item dock__launcher";
  launcherBtn.title = "Applications";
  launcherBtn.innerHTML = iconSvg("grid");
  launcherBtn.addEventListener("click", toggleLauncher);
  dock.appendChild(launcherBtn);

  APPS.filter((a) => a.id !== "welcome").forEach((app, i) => {
    const b = document.createElement("button");
    b.className = "dock__item";
    b.dataset.app = app.id;
    b.style.animationDelay = `${i * 40}ms`;
    b.innerHTML = `
      <span class="dock__label">${app.name}</span>
      ${iconSvg(app.icon)}
      <span class="dock__indicator"></span>`;
    b.addEventListener("click", () => openApp(app.id));
    dock.appendChild(b);
  });
}

function buildLauncher() {
  APPS.filter((a) => a.id !== "welcome").forEach((app) => {
    const b = document.createElement("button");
    b.className = "launcher__app";
    b.dataset.app = app.id;
    b.dataset.search = `${app.name} ${app.desc}`.toLowerCase();
    b.innerHTML = `
      <span class="launcher__app-icon" style="color:${app.color}">${iconSvg(app.icon)}</span>
      <span class="launcher__app-meta">
        <span class="launcher__app-name">${app.name}</span>
        <span class="launcher__app-desc">${app.desc}</span>
      </span>`;
    b.addEventListener("click", () => {
      openApp(app.id);
      closeLauncher();
    });
    launcherGrid.appendChild(b);
  });
}

function openLauncher() {
  launcher.classList.add("is-open");
  launcher.setAttribute("aria-hidden", "false");
  launcherInput.value = "";
  filterLauncher("");
  setTimeout(() => launcherInput.focus(), 60);
}

function closeLauncher() {
  launcher.classList.remove("is-open");
  launcher.setAttribute("aria-hidden", "true");
}

function toggleLauncher() {
  launcher.classList.contains("is-open") ? closeLauncher() : openLauncher();
}

function filterLauncher(q) {
  q = q.trim().toLowerCase();
  launcherGrid.querySelectorAll(".launcher__app").forEach((el) => {
    el.hidden = q !== "" && !el.dataset.search.includes(q);
  });
}

onAppsChange(() => {
  const open = getOpenApps();
  dock.querySelectorAll(".dock__item[data-app]").forEach((el) => {
    el.classList.toggle("is-running", open.includes(el.dataset.app));
  });
});

function updateClock() {
  const now = new Date();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date = now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  clockEl.textContent = time;
  clockEl.title = `${date} · up ${formatUptime(Date.now() - bootTime)}`;
}

let cpu = 9;
let mem = 34;
function updateStats() {
  cpu = clamp(cpu + (Math.random() - 0.5) * 7, 3, 92);
  mem = clamp(mem + (Math.random() - 0.5) * 5, 22, 88);
  document.getElementById("stat-cpu").innerHTML = `cpu <b>${Math.round(cpu)}%</b>`;
  document.getElementById("stat-mem").innerHTML = `mem <b>${Math.round(mem)}%</b>`;
}

const desktopEl = document.getElementById("desktop");
desktopEl.addEventListener("pointerdown", (e) => {
  if (e.target === desktopEl) {
    document
      .querySelectorAll(".window.is-focused")
      .forEach((w) => w.classList.remove("is-focused"));
  }
});

const loginEl = document.getElementById("login");
const loginEnter = document.getElementById("login-enter");
let sessionStarted = false;

function logIn() {
  if (sessionStarted) return;
  sessionStarted = true;
  document.body.classList.add("logged-in");
  setTimeout(() => loginEl.remove(), 600);
  runBoot().then(() => {
    document.body.classList.add("booted");
    openApp("welcome");
  });
}

loginEnter.addEventListener("click", logIn);
loginEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") logIn();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !sessionStarted) logIn();
});

launcherInput.addEventListener("input", () => filterLauncher(launcherInput.value));
launcherInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLauncher();
  if (e.key === "Enter") {
    const first = [...launcherGrid.querySelectorAll(".launcher__app:not([hidden])")][0];
    if (first) first.click();
  }
});
document.querySelector(".launcher__backdrop").addEventListener("click", closeLauncher);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLauncher();
});

buildDock();
buildLauncher();

updateClock();
setInterval(updateClock, 1000);
updateStats();
setInterval(updateStats, 2000);
