
const BOOT_LINES = [
  { text: "initializing HACKER//OS kernel", cls: "l-info" },
  { text: "mounting /dev/root ... done", cls: "l-info" },
  { text: "probing hardware ... 12 devices found", cls: "l-info" },
  { text: "starting network stack ... done", cls: "l-info" },
  { text: "initializing secure shell daemon", cls: "l-info" },
  { text: "loading display server ... done", cls: "l-info" },
  { text: "starting session manager", cls: "l-info" },
  { text: "desktop ready", cls: "l-ok" },
];

export function runBoot() {
  return new Promise((resolve) => {
    const log = document.getElementById("boot-log");
    const progress = document.getElementById("boot-progress");
    const stamp = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      return `[${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(
        d.getMilliseconds()
      ).padStart(3, "0")}]`;
    };

    const total = BOOT_LINES.length;
    let i = 0;

    function next() {
      if (i >= total) {
        progress.style.width = "100%";
        setTimeout(resolve, 350);
        return;
      }

      const { text, cls } = BOOT_LINES[i];
      const row = document.createElement("div");
      row.className = cls;
      row.textContent = `${stamp()} ${text}`;
      log.appendChild(row);

      i++;
      const pct = Math.round((i / total) * 100);
      progress.style.width = `${pct}%`;

      const delay = 120 + Math.random() * 160;
      setTimeout(next, delay);
    }

    setTimeout(next, 250);
  });
}
