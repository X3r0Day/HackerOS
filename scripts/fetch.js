
import { formatFetchUptime, bootTime } from "./system.js";

const FALLBACK_LOGO = [
  "      ▄▄▄▄",
  "   ▄████████▄",
  "  ████▀▀▀████",
  " ████   ▄████",
  "████   ▄▄████",
  "████▄▄██████",
  " ██████████",
  "  ▀▀▀▀▀▀▀▀",
];

let logoPromise = null;

export function loadLogo() {
  if (!logoPromise) {
    logoPromise = fetch("assets/fetch.txt")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("404"))))
      .then((t) => t.replace(/\r/g, "").split("\n").filter((l) => l.length > 0))
      .catch(() => FALLBACK_LOGO);
  }
  return logoPromise;
}

export function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildFetchInfo() {
  return [
    { type: "title", text: "hacker@hacker-os" },
    { type: "sep" },
    { type: "kv", key: "OS", value: "Hacker OS" },
    { type: "kv", key: "Kernel", value: "Hacker os 2.5.7-hacker1-1" },
    { type: "kv", key: "Shell", value: "WebShell 1.3.7" },
    { type: "kv", key: "CLI", value: "HackCli" },
    { type: "gap" },
    { type: "kv", key: "WM", value: "HackWM" },
    { type: "kv", key: "Terminal", value: "WebTerm" },
    { type: "kv", key: "Uptime", value: formatFetchUptime(Date.now() - bootTime) },
    { type: "kv", key: "Resolution", value: `${window.innerWidth}x${window.innerHeight}` },
  ];
}

function renderInfoLine(item) {
  if (!item) return "";
  switch (item.type) {
    case "title":
      return `<span class="ff-title">${escapeHtml(item.text)}</span>`;
    case "sep":
      return `<span class="ff-sep">${"─".repeat(28)}</span>`;
    case "kv":
      return `<span class="ff-key">${item.key}</span><span class="ff-colon">:</span> <span class="ff-val">${escapeHtml(
        item.value
      )}</span>`;
    default:
      return "";
  }
}

export function buildFetchHTML(logo) {
  const info = buildFetchInfo();
  const logoWidth = logo.reduce((m, l) => Math.max(m, l.length), 0);
  const pad = logoWidth + 4;
  const rows = Math.max(logo.length, info.length);

  let html = "";
  for (let i = 0; i < rows; i++) {
    const left = logo[i] || "";
    html += `<span class="ff-logo">${escapeHtml(left).padEnd(pad)}</span>`;
    html += renderInfoLine(info[i]);
    html += "\n";
  }
  return html;
}

export async function renderFetchInto(container) {
  if (!container) return null;
  const logo = await loadLogo();
  const pre = document.createElement("pre");
  pre.className = "term__pre term__fetch";
  pre.innerHTML = buildFetchHTML(logo);
  container.appendChild(pre);
  return pre;
}
