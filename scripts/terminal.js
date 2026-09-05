
import { APPS, getApp } from "./apps.js";
import { formatUptime, bootTime } from "./system.js";
import { renderFetchInto } from "./fetch.js";

const PROMPT = "user@hacker-os:~$";

const VFS = {
  "/etc/hostname": "hacker-os",
  "/etc/os-release": [
    'NAME="Hacker OS"',
    'VERSION="2.5.7-hacker1-1"',
    'ID=hacker',
    'PRETTY_NAME="Hacker OS 2.5.7"',
  ].join("\n"),
  "/etc/passwd": [
    "root:x:0:0:root:/root:/bin/hos-sh",
    "user:x:1000:1000:user:/home/user:/bin/hos-sh",
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
  ].join("\n"),
};

const LS = {
  "~": ["Documents", "Downloads", "projects", "tools", "notes.txt", ".bashrc"],
  "~/projects": ["kernel", "shell", "wm", "todo.md", "Cargo.toml"],
  "/": ["bin", "boot", "dev", "etc", "home", "proc", "sys", "tmp", "usr", "var"],
  "/etc": ["hostname", "os-release", "passwd", "hosts", "resolv.conf"],
};

const HELP = [
  ["help", "show this list"],
  ["ls [dir]", "list directory contents"],
  ["cat <file>", "print file contents"],
  ["pwd", "print working directory"],
  ["whoami", "print current user"],
  ["uname", "print system name"],
  ["date", "print system date/time"],
  ["uptime", "show session uptime"],
  ["fetch", "show system info (fastfetch)"],
  ["apps", "list installed applications"],
  ["open <app>", "launch an application"],
  ["clear", "clear the terminal"],
  ["echo <text>", "print text"],
  ["exit", "close this terminal"],
];

export function mountTerminal(term, hooks = {}) {
  term.innerHTML = `
    <div class="term__output"></div>
    <div class="term__input-row">
      <span class="term__prompt">${PROMPT}</span>
      <input class="term__input" autocomplete="off" spellcheck="false" autocapitalize="off" />
    </div>`;

  const output = term.querySelector(".term__output");
  const input = term.querySelector(".term__input");
  const history = [];
  let histIdx = -1;

  const scroll = () => (output.scrollTop = output.scrollHeight);

  function line(cls = "") {
    const row = document.createElement("div");
    if (cls) row.className = `term__line ${cls}`;
    else row.className = "term__line";
    output.appendChild(row);
    scroll();
    return row;
  }

  function print(text, cls = "") {
    const row = line(cls);
    row.textContent = text;
    return row;
  }

  function printCommand(raw) {
    const row = line("term__cmd");
    const p = document.createElement("span");
    p.className = "term__prompt";
    p.textContent = PROMPT + " ";
    const c = document.createElement("span");
    c.textContent = raw;
    row.append(p, c);
  }

  function renderFetch() {
    renderFetchInto(output).then(scroll);
  }

  function run(cmd) {
    const raw = cmd.trim();
    printCommand(raw);
    if (!raw) return;

    const [name, ...rest] = raw.split(/\s+/);
    const arg = rest.join(" ");

    switch (name) {
      case "help":
        HELP.forEach(([c, d]) => print(`${c.padEnd(14)} ${d}`, "dim"));
        break;
      case "ls": {
        const key = arg || "~";
        const items = LS[key] || LS["~"];
        print(items.join("   "));
        break;
      }
      case "cat": {
        if (!arg) print("cat: missing operand", "err");
        else if (VFS[arg]) print(VFS[arg]);
        else print(`cat: ${arg}: No such file or directory`, "err");
        break;
      }
      case "pwd":
        print("/home/user");
        break;
      case "whoami":
        print("user");
        break;
      case "uname":
        print("Hacker os");
        break;
      case "date":
        print(new Date().toString());
        break;
      case "uptime":
        print(`up ${formatUptime(Date.now() - bootTime)}, 1 user`);
        break;
      case "echo":
        print(arg);
        break;
      case "apps":
        APPS.forEach((a) => print(`${a.id.padEnd(10)} ${a.name}`, "dim"));
        break;
      case "open": {
        const app = getApp(arg);
        if (app) {
          print(`launching ${app.name}…`, "ok");
          hooks.openApp?.(app.id);
        } else {
          print(`open: unknown application '${arg || ""}'`, "err");
          print("try `apps` to list available applications", "dim");
        }
        break;
      }
      case "fetch":
      case "fastfetch":
      case "neofetch":
        renderFetch();
        break;
      case "clear":
        output.innerHTML = "";
        break;
      case "exit":
        hooks.close?.();
        break;
      default:
        print(`${name}: command not found`, "err");
        print("type `help` for available commands", "dim");
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value;
      input.value = "";
      if (val.trim()) {
        history.push(val);
        histIdx = history.length;
      }
      run(val);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx > 0) {
        histIdx--;
        input.value = history[histIdx] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < history.length) {
        histIdx++;
        input.value = history[histIdx] || "";
      }
    }
  });

  term.addEventListener("click", () => input.focus());

  renderFetch();
  input.focus();
}
