
export const bus = {
  _listeners: new Map(),

  on(evt, fn) {
    if (!this._listeners.has(evt)) this._listeners.set(evt, new Set());
    this._listeners.get(evt).add(fn);
    return () => this.off(evt, fn);
  },

  off(evt, fn) {
    this._listeners.get(evt)?.delete(fn);
  },

  emit(evt, payload) {
    this._listeners.get(evt)?.forEach((fn) => fn(payload));
  },
};

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const uid = (prefix = "id") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const pad = (n, len = 2) => String(n).padStart(len, "0");

export function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatFetchUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""}, ${m} min${m > 1 ? "s" : ""}`;
  if (m > 0) return `${m} min${m > 1 ? "s" : ""}, ${sec} sec${sec > 1 ? "s" : ""}`;
  return `${sec} sec${sec > 1 ? "s" : ""}`;
}

export const bootTime = Date.now();
