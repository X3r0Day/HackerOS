import { APPS, getApp } from "./apps.js";
import { formatUptime, bootTime } from "./system.js";
import { renderFetchInto } from "./fetch.js";
import { getVFS } from "./vfs.js";

const HOME = "/home/user";
const USER = "user";
const HOST = "hacker-os";

const HELP = [
  ["help", "show this list"],
  ["ls [-la] [dir]", "list directory contents"],
  ["cd <dir>", "change directory"],
  ["pwd", "print working directory"],
  ["cat <file>", "print file contents"],
  ["echo <text> [> file]", "print text, can write a file"],
  ["mkdir <dir>", "create a directory"],
  ["touch <file>", "create an empty file"],
  ["rm [-r] <path>", "remove a file or directory"],
  ["tree [dir]", "show the directory tree"],
  ["whoami", "print current user"],
  ["uname", "print system name"],
  ["date", "print system date/time"],
  ["uptime", "show session uptime"],
  ["fetch", "show system info (fastfetch)"],
  ["apps", "list installed applications"],
  ["open <app>", "launch an application"],
  ["clear", "clear the terminal"],
  ["exit", "close this terminal"],
];

export function mountTerminal(term, hooks = {}) {
  const vfs = getVFS();
  let cwd = HOME;

  const promptText = () => {
    const rel = cwd === HOME ? "~" : cwd.startsWith(HOME + "/") ? "~" + cwd.slice(HOME.length) : cwd;
    return `${USER}@${HOST}:${rel}$`;
  };

  term.innerHTML = `
    <div class="term__output">
      <div class="term__lines"></div>
      <div class="term__input-row">
        <span class="term__prompt">${promptText()}</span>
        <input class="term__input" autocomplete="off" spellcheck="false" autocapitalize="off" />
      </div>
    </div>`;

  const output = term.querySelector(".term__output");
  const lines = term.querySelector(".term__lines");
  const input = term.querySelector(".term__input");
  const promptEl = term.querySelector(".term__prompt");
  const history = [];
  let histIdx = -1;

  const scroll = () => {
    requestAnimationFrame(() => {
      output.scrollTop = output.scrollHeight;
    });
  };

  function line(cls = "") {
    const row = document.createElement("div");
    if (cls) row.className = `term__line ${cls}`;
    else row.className = "term__line";
    lines.appendChild(row);
    scroll();
    return row;
  }

  function print(text, cls = "") {
    const row = line(cls);
    row.textContent = text;
    return row;
  }

  function printHtml(html) {
    const row = line();
    row.innerHTML = html;
    return row;
  }

  function printError(msg) {
    print(msg, "err");
  }

  function printCommand(raw) {
    const row = line("term__cmd");
    const p = document.createElement("span");
    p.className = "term__prompt";
    p.textContent = promptText() + " ";
    const c = document.createElement("span");
    c.textContent = raw;
    row.append(p, c);
  }

  function renderFetch() {
    renderFetchInto(lines).then(scroll);
  }

  function colorFor(name, type) {
    if (type === "dir") return "accent";
    if (name.endsWith(".md")) return "ok";
    if (name.startsWith(".")) return "dim";
    return "";
  }

  function listEntry(name, type, all) {
    if (name.startsWith(".") && !all) return null;
    const cls = colorFor(name, type);
    return cls ? `<span class="term__line-file ${cls}">${name}</span>` : name;
  }

  function run(cmd) {
    const raw = cmd.trim();
    printCommand(raw);
    if (!raw) return;

    const tokens = raw.split(/\s+/);
    const name = tokens[0];
    const args = tokens.slice(1);

    const redirect = raw.match(/(?:>>|>)\s*(\S+)$/);
    const outPath = redirect ? redirect[1] : null;
    const redirectAppend = redirect ? raw.match(/>>\s*\S+$/) !== null : false;
    const cmdForExec = redirect ? raw.replace(/(?:>>|>)\s*\S+$/, "").trim() : raw;

    const execArgs = cmdForExec.split(/\s+/).slice(1);
    const execName = cmdForExec.split(/\s+/)[0];

    const writeOut = (text) => {
      if (!outPath) return print(text);
      try {
        const existing = vfs.lookup(outPath, cwd);
        if (existing && redirectAppend) {
          vfs.write(outPath, cwd, existing.node.content + text + "\n");
        } else {
          vfs.write(outPath, cwd, text + "\n");
        }
        print("", "dim");
      } catch (e) {
        printError(`${execName}: ${outPath}: ${e.message}`);
      }
    };

    switch (execName) {
      case "help":
        HELP.forEach(([c, d]) => print(`  ${c.padEnd(20)} ${d}`, "dim"));
        break;

      case "ls": {
        const all = execArgs.includes("-a") || execArgs.includes("-la") || execArgs.includes("-al");
        const long = execArgs.includes("-l") || execArgs.includes("-la") || execArgs.includes("-al");
        const path = execArgs.filter((a) => !a.startsWith("-")).join(" ") || ".";
        try {
          const { entries } = vfs.ls(path, cwd);
          if (long && !outPath) {
            entries.forEach((en) => {
              const size = en.type === "dir" ? "-" : String(en.content.length).padStart(6, " ");
              const mode = en.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--";
              print(`${mode}  ${size}  ${en.name}`);
            });
          } else {
            const names = entries.map((en) => listEntry(en.name, en.type, all)).filter(Boolean).join("   ");
            if (outPath) {
              writeOut(names.replace(/<[^>]+>/g, ""));
            } else {
              printHtml(names);
            }
          }
        } catch (e) {
          printError(`ls: ${path}: ${e.message}`);
        }
        break;
      }

      case "cd": {
        const path = execArgs[0] || "~";
        try {
          const hit = vfs.lookup(path, cwd);
          if (!hit) throw new Error("No such file or directory");
          if (hit.node.type !== "dir") throw new Error("Not a directory");
          cwd = vfs.expand(path, cwd);
          promptEl.textContent = promptText() + " ";
        } catch (e) {
          printError(`cd: ${path}: ${e.message}`);
        }
        break;
      }

      case "pwd":
        writeOut(cwd);
        break;

      case "cat": {
        const path = execArgs[0];
        if (!path) {
          printError("cat: missing operand");
          break;
        }
        if (outPath) {
          try {
            const content = vfs.read(path, cwd);
            vfs.write(outPath, cwd, content + "\n");
            print("", "dim");
          } catch (e) {
            printError(`cat: ${path}: ${e.message}`);
          }
          break;
        }
        try {
          print(vfs.read(path, cwd));
        } catch (e) {
          printError(`cat: ${path}: ${e.message}`);
        }
        break;
      }

      case "echo": {
        writeOut(execArgs.join(" "));
        break;
      }

      case "mkdir": {
        const path = execArgs[0];
        if (!path) {
          printError("mkdir: missing operand");
          break;
        }
        try {
          vfs.mkdir(path, cwd);
        } catch (e) {
          printError(`mkdir: ${path}: ${e.message}`);
        }
        break;
      }

      case "touch": {
        const path = execArgs[0];
        if (!path) {
          printError("touch: missing operand");
          break;
        }
        try {
          vfs.touch(path, cwd);
        } catch (e) {
          printError(`touch: ${path}: ${e.message}`);
        }
        break;
      }

      case "rm": {
        const recursive = execArgs.includes("-r") || execArgs.includes("-rf") || execArgs.includes("-fr");
        const path = execArgs.filter((a) => !a.startsWith("-"))[0];
        if (!path) {
          printError("rm: missing operand");
          break;
        }
        try {
          vfs.rm(path, cwd, recursive);
        } catch (e) {
          printError(`rm: ${path}: ${e.message}`);
        }
        break;
      }

      case "tree": {
        const path = execArgs[0] || ".";
        try {
          const lines = [];
          const walk = (absPath, display, prefix, isLast, top) => {
            const hit = vfs.lookup(absPath, cwd);
            const entries = hit ? hit.node.children.values() : [];
            const visible = [...entries]
              .filter((en) => !en.name.startsWith("."))
              .sort((a, b) => (a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name < b.name ? -1 : 1));
            visible.forEach((en, i) => {
              const last = i === visible.length - 1;
              const label = `${en.name}${en.type === "dir" ? "/" : ""}`;
              if (top) {
                lines.push(`  ${label}`);
              } else {
                lines.push(`  ${prefix}${last ? "└─" : "├─"} ${label}`);
              }
              if (en.type === "dir") {
                walk(`${absPath === "/" ? "" : absPath}/${en.name}`, en.name, prefix + (last ? "   " : "│  "), last, false);
              }
            });
          };
          walk(vfs.expand(path, cwd), "", "", true, true);
          lines.forEach((l) => print(l));
        } catch (e) {
          printError(`tree: ${path}: ${e.message}`);
        }
        break;
      }

      case "whoami":
        writeOut(USER);
        break;
      case "uname":
        writeOut("Hacker os");
        break;
      case "date":
        writeOut(new Date().toString());
        break;
      case "uptime":
        writeOut(`up ${formatUptime(Date.now() - bootTime)}, 1 user`);
        break;
      case "apps":
        APPS.filter((a) => a.id !== "welcome").forEach((a) => print(`${a.id.padEnd(10)} ${a.name}`, "dim"));
        break;
      case "open": {
        const app = getApp(execArgs[0]);
        if (app && app.id !== "welcome") {
          print(`launching ${app.name}…`, "ok");
          hooks.openApp?.(app.id);
        } else {
          printError(`open: unknown application '${execArgs[0] || ""}'`);
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
        lines.innerHTML = "";
        break;
      case "exit":
        hooks.close?.();
        break;
      default:
        printError(`${name}: command not found`);
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
