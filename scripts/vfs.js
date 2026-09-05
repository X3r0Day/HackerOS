import { uid } from "./system.js";

function makeNode(name, type, parent, content = "") {
  return {
    id: uid("node"),
    name,
    type,
    parent,
    content,
    children: type === "dir" ? new Map() : null,
    mtime: Date.now(),
  };
}

export class VFS {
  constructor() {
    this.root = makeNode("", "dir", null);
  }

  expand(raw, cwd) {
    if (!raw) raw = ".";
    let p = raw;
    if (p === "~") p = "/home/user";
    else if (p.startsWith("~/")) p = "/home/user" + p.slice(1);
    else if (!p.startsWith("/")) p = (cwd || "/home/user") + "/" + p;

    const out = [];
    for (const seg of p.split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") {
        if (out.length) out.pop();
        continue;
      }
      out.push(seg);
    }
    return "/" + out.join("/");
  }

  lookup(raw, cwd) {
    const abspath = this.expand(raw, cwd);
    if (abspath === "/") return { node: this.root, path: "/" };
    let node = this.root;
    for (const seg of abspath.slice(1).split("/")) {
      if (!node || node.type !== "dir") return null;
      node = node.children.get(seg);
    }
    return node ? { node, path: abspath } : null;
  }

  ls(raw, cwd) {
    const hit = this.lookup(raw, cwd);
    if (!hit) throw new Error(`No such file or directory`);
    const { node, path } = hit;
    if (node.type !== "dir") throw new Error(`Not a directory`);
    const entries = [...node.children.values()].sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name < b.name ? -1 : 1;
    });
    return { path, entries };
  }

  read(raw, cwd) {
    const hit = this.lookup(raw, cwd);
    if (!hit) throw new Error(`No such file or directory`);
    if (hit.node.type !== "file") throw new Error(`Is a directory`);
    return hit.node.content;
  }

  write(raw, cwd, content) {
    const abspath = this.expand(raw, cwd);
    const parent = this.lookup(abspath.slice(0, abspath.lastIndexOf("/")) || "/", cwd);
    if (!parent || parent.node.type !== "dir") throw new Error(`No such file or directory`);
    const name = abspath.split("/").pop();
    const existing = parent.node.children.get(name);
    if (existing && existing.type === "dir") throw new Error(`Is a directory`);
    if (existing) {
      existing.content = content;
      existing.mtime = Date.now();
      return existing;
    }
    const file = makeNode(name, "file", parent.node, content);
    parent.node.children.set(name, file);
    return file;
  }

  mkdir(raw, cwd) {
    const abspath = this.expand(raw, cwd);
    const parent = this.lookup(abspath.slice(0, abspath.lastIndexOf("/")) || "/", cwd);
    if (!parent || parent.node.type !== "dir") throw new Error(`No such file or directory`);
    const name = abspath.split("/").pop();
    if (parent.node.children.has(name)) throw new Error(`File exists`);
    const dir = makeNode(name, "dir", parent.node);
    parent.node.children.set(name, dir);
    return dir;
  }

  touch(raw, cwd) {
    const abspath = this.expand(raw, cwd);
    const existing = this.lookup(raw, cwd);
    if (existing) {
      if (existing.node.type === "dir") throw new Error(`Is a directory`);
      existing.node.mtime = Date.now();
      return existing.node;
    }
    return this.write(raw, cwd, "");
  }

  rm(raw, cwd, recursive = false) {
    const hit = this.lookup(raw, cwd);
    if (!hit || hit.path === "/") throw new Error(`No such file or directory`);
    if (hit.node.type === "dir" && !recursive && hit.node.children.size > 0) {
      throw new Error(`Is a directory`);
    }
    hit.node.parent.children.delete(hit.node.name);
  }

  ensureDirs(...names) {
    for (const name of names) {
      const parent = this.lookup("/home/user", "/home/user");
      if (parent && !parent.node.children.has(name)) {
        this.mkdir(`/home/user/${name}`, "/home/user");
      }
    }
  }
}

export function seedVFS() {
  const vfs = new VFS();

  const paths = [
    "/bin",
    "/etc",
    "/home",
    "/home/user",
    "/home/user/Documents",
    "/home/user/Downloads",
    "/home/user/projects",
    "/home/user/projects/kernel",
    "/home/user/projects/shell",
    "/home/user/projects/wm",
    "/home/user/tools",
    "/tmp",
    "/usr",
    "/usr/bin",
    "/var",
    "/var/log",
  ];
  for (const p of paths) {
    vfs.mkdir(p, "/home/user");
  }

  vfs.write("/home/user/.bashrc", "/home/user", [
    "# user shell config",
    "export PS1='user@hacker-os:\\\\w$ '",
    'alias ll="ls -la"',
    'alias h="history"',
    'alias cl="clear"',
    "source /usr/share/webshell/completions.sh",
  ].join("\n"));

  vfs.write("/home/user/notes.txt", "/home/user", [
    "welcome to Hacker OS",
    "",
    "run fetch to see system info",
    "open <app> to launch software",
    "the filesystem lives in memory, it resets on reload",
  ].join("\n"));

  vfs.write("/home/user/projects/todo.md", "/home/user", [
    "# to do",
    "- [x] window manager",
    "- [x] terminal",
    "- [x] fastfetch banner",
    "- [ ] write the vfs docs",
  ].join("\n"));

  vfs.write("/home/user/Documents/readme.md", "/home/user", [
    "# Hacker OS",
    "",
    "a tiny desktop os in the browser",
  ].join("\n"));

  vfs.write("/home/user/Downloads/hacker-os.iso", "/home/user", "iso image placeholder\n");
  vfs.write("/home/user/tools/fetch.sh", "/home/user", "#!/bin/sh\necho 'fetch'\n");
  vfs.write("/home/user/projects/kernel/main.c", "/home/user", "int main() { return 0; }\n");
  vfs.write("/home/user/projects/shell/main.rs", "/home/user", "fn main() { println!(\"hos-sh\"); }\n");
  vfs.write("/home/user/projects/wm/config.ini", "/home/user", "[general]\nlayout = tiles\n");

  vfs.write("/etc/hostname", "/", "hacker-os\n");
  vfs.write("/etc/os-release", "/", [
    'NAME="Hacker OS"',
    'VERSION="2.5.7-hacker1-1"',
    "ID=hacker",
    'PRETTY_NAME="Hacker OS 2.5.7"',
    "",
  ].join("\n"));
  vfs.write("/etc/passwd", "/", [
    "root:x:0:0:root:/root:/bin/hos-sh",
    "user:x:1000:1000:user:/home/user:/bin/hos-sh",
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
    "",
  ].join("\n"));
  vfs.write("/etc/resolv.conf", "/", "nameserver 1.1.1.1\n");
  vfs.write("/bin/ls", "/", "binary\n");
  vfs.write("/bin/cat", "/", "binary\n");

  return vfs;
}

let instance = null;
export function getVFS() {
  if (!instance) instance = seedVFS();
  return instance;
}
