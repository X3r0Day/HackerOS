export function buildBrowser() {
  return `
    <div class="browser">
      <div class="browser__toolbar">
        <button class="browser__ctl" data-nav="back" title="Back" aria-label="Back"><span aria-hidden="true">←</span></button>
        <button class="browser__ctl" data-nav="forward" title="Forward" aria-label="Forward"><span aria-hidden="true">→</span></button>
        <button class="browser__ctl" data-nav="reload" title="Reload" aria-label="Reload"><span aria-hidden="true">⟳</span></button>
        <input class="browser__address mono" type="text" spellcheck="false" autocomplete="off" placeholder="type a url" />
        <button class="browser__ctl" data-nav="go" title="Go" aria-label="Go"><span aria-hidden="true">↵</span></button>
      </div>
      <div class="browser__view">
        <iframe class="browser__frame" title="browser" src="pages/start.html"></iframe>
      </div>
      <div class="browser__status mono">
        <span class="browser__status-dot"></span>
        <span class="browser__status-text">ready</span>
        <span class="browser__status-note">right-click: custom menu</span>
      </div>
      <div class="browser__menu" role="menu" aria-hidden="true"></div>
    </div>`;
}

export function mountBrowser(body, hooks = {}) {
  const shell = body.querySelector(".browser");
  const urlEl = shell.querySelector(".browser__address");
  const frame = shell.querySelector(".browser__frame");
  const menu = shell.querySelector(".browser__menu");
  const statusEl = shell.querySelector(".browser__status-text");
  const dotEl = shell.querySelector(".browser__status-dot");

  const HOME = "pages/start.html";
  let stack = [HOME];
  let index = 0;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function setStatus(text, ok = true) {
    statusEl.textContent = text;
    dotEl.classList.toggle("is-bad", !ok);
  }

  function resolveAddress(raw) {
    let v = String(raw || "").trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v) && !v.startsWith("/")) {
      v = /^[a-z0-9.-]+\.[a-z]{2,}/i.test(v) || v.includes("localhost") ? "https://" + v : v;
    }
    return v;
  }

  function go(url) {
    url = resolveAddress(url);
    if (!url) return;
    stack = stack.slice(0, index + 1);
    stack.push(url);
    index = stack.length - 1;
    frame.src = url;
    urlEl.value = url;
    setStatus("loading " + url);
  }

  function step(dir) {
    const next = index + dir;
    if (next < 0 || next >= stack.length) return;
    index = next;
    frame.src = stack[index];
    urlEl.value = stack[index];
    setStatus("loading " + stack[index]);
  }

  function reload() {
    setStatus("reloading");
    try {
      frame.contentDocument.location.reload();
    } catch {
      frame.src = frame.getAttribute("src");
    }
  }

  function copyAddress() {
    const text = stack[index];
    try {
      navigator.clipboard.writeText(text);
      setStatus("copied " + text);
    } catch {
      setStatus("clipboard unavailable", false);
    }
  }

  function showMenu(x, y) {
    const rows = [
      { id: "back", glyph: "←", label: "Back", disabled: index <= 0 },
      { id: "forward", glyph: "→", label: "Forward", disabled: index >= stack.length - 1 },
      { id: "reload", glyph: "⟳", label: "Reload", disabled: false },
      { id: "copy", glyph: "⧉", label: "Copy address", disabled: false },
      { id: "home", glyph: "⌁", label: "Go to start page", disabled: false },
    ]
      .map(
        (it) => `<button class="browser__menu-item${it.disabled ? " is-disabled" : ""}" role="menuitem" tabindex="-1"${it.disabled ? " disabled" : ""} data-item="${it.id}">
            <span class="browser__menu-glyph">${it.glyph}</span>
            <span>${it.label}</span>
          </button>`
      )
      .join("");

    menu.innerHTML = `<div class="browser__menu-title">browser</div>${rows}`;
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${clamp(x, 4, window.innerWidth - rect.width - 4)}px`;
    menu.style.top = `${clamp(y, 4, window.innerHeight - rect.height - 4)}px`;
  }

  function hideMenu() {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
  }

  shell.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    hideMenu();
    showMenu(e.clientX, e.clientY);
  });

  menu.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".browser__menu-item");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.item;
    if (id === "back") step(-1);
    else if (id === "forward") step(1);
    else if (id === "reload") reload();
    else if (id === "copy") copyAddress();
    else if (id === "home") go(HOME);
    hideMenu();
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (menu.classList.contains("is-open") && !menu.contains(e.target)) hideMenu();
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) hideMenu();
    },
    true
  );

  window.addEventListener("resize", () => hideMenu());

  function injectContext(doc) {
    if (doc.__bhCtx) return;
    doc.__bhCtx = true;
    doc.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      hideMenu();
      showMenu(r.left + e.clientX, r.top + e.clientY);
    });
    doc.addEventListener("pointerdown", () => hideMenu());
    doc.addEventListener("selectstart", (e) => e.preventDefault());
    doc.addEventListener("dragstart", (e) => e.preventDefault());
  }

  frame.addEventListener("load", () => {
    let doc = null;
    let href = "";
    try {
      doc = frame.contentDocument;
      href = frame.contentWindow.location.href;
    } catch {}
    if (doc && href) {
      injectContext(doc);
      stack[index] = href;
      urlEl.value = href;
      setStatus("ready · " + href.replace(location.origin, ""));
    } else {
      setStatus("ready");
    }
  });

  shell.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nav = btn.dataset.nav;
      if (nav === "back") step(-1);
      else if (nav === "forward") step(1);
      else if (nav === "reload") reload();
      else if (nav === "go") go(urlEl.value);
    });
  });

  urlEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go(urlEl.value);
  });

  urlEl.value = HOME;
  setStatus("ready");
}