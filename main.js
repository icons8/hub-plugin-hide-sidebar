// "Hide sidebar": a button with a panel icon folds and unfolds the hub's own left panel. The fold is the core's
// (hub.sidebar, capability "sidebar", Plugin API 1.31): the same state as the divider's handle, remembered by the core.
// The plugin keeps no state of its own; it only draws the button and mirrors the core's fold on <html> (hs-folded) to place
// the button. The button sits in the sidebar header (slot sidebar.header, before the menu); while the panel is folded it
// sits at the left edge of the page. On a narrow screen (phone) the list is a separate view: no button.
//
// A theme may draw its own sidebar button (a button marked data-sidebar-toggle, or a "fold" button in the search row or at
// the top of #app, like the Clean theme). Then the plugin shows no button in the header: both work the same core fold.
//
// For older plugins: the hub-sidebar event on window, {detail: {hide, by}}, folds the panel for the time of a view and
// restores it after (createRequests). New plugins call hub.sidebar({open}) themselves.

// UI strings: English by default, Russian when the hub language is Russian (hub.lang).
export const STR = {
  en: { hide: "Hide sidebar", show: "Show sidebar" },
  ru: { hide: "Спрятать боковую панель", show: "Показать боковую панель" },
};
// the language is read at the moment of use, not at module load
export const makeT = (hub) => (k, v) => {
  let s = (STR[hub.lang] ?? STR.en)[k] ?? STR.en[k] ?? k;
  for (const [name, val] of Object.entries(v ?? {})) s = s.replaceAll(`{${name}}`, String(val));
  return s;
};
const NS = "http://www.w3.org/2000/svg";

// the theme's own sidebar button; our buttons (.hs-btn) never match it
export const NATIVE = '[data-sidebar-toggle], .search-row button[class*="fold"], #app > button[class*="fold"]';
export const hasNative = (root) => !!root.querySelector(NATIVE);

// the button: flip the core's fold; `requests` learns that the owner moved by hand (their choice outlives a plugin's view)
export function toggle(sidebar, requests) {
  const now = sidebar();
  if (!now?.available) return now?.open;
  requests?.owner();
  return sidebar({ open: !now.open })?.open;
}

// hub-sidebar requests of older plugins ({hide, by}): fold while anyone holds, then restore what was before, unless the
// owner moved the panel by hand meanwhile. Only who holds is kept here; open or folded is the core's.
export function createRequests(sidebar) {
  const holders = new Set();
  let restore = null;   // open before the first hold; null - nothing to restore
  const req = (detail) => {
    const d = detail && typeof detail === "object" ? detail : {};
    if (typeof d.hide !== "boolean") return;
    const by = String(d.by || "?");
    if (d.hide) {
      if (!holders.size) restore = !!sidebar()?.open;
      holders.add(by);
      sidebar({ open: false });
    } else {
      if (!holders.delete(by)) return;   // did not hold - nothing to release
      if (!holders.size) {
        if (restore) sidebar({ open: true });
        restore = null;
      }
    }
  };
  req.owner = () => { restore = null; };
  return req;
}

// up to 1.4 the plugin kept its own "hidden" in this browser; once it becomes the core's fold and the key goes away
export const OLD_KEY = "hub.hideSidebar";
export function migrate(storage, sidebar) {
  let old = null;
  try { old = storage.getItem(OLD_KEY); storage.removeItem(OLD_KEY); } catch { return; }
  if (old === "1") sidebar({ open: false });
}

// the panel: a frame and a vertical line at the left edge
function panelIcon() {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", "hs-icon");
  s.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of [["rect", { x: 3, y: 4.5, width: 18, height: 15, rx: 3.5 }], ["path", { d: "M9.5 4.5v15" }]]) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    s.append(n);
  }
  return s;
}

export default function register(hub) {
  if (hub.capabilities?.sidebar !== 1 || typeof hub.sidebar !== "function") return;   // an older hub: no core fold
  const sidebar = (o) => hub.sidebar(o);
  const t = makeT(hub);
  const root = document.documentElement;
  const buttons = [];   // in the sidebar header and at the page edge

  // mirror the core's fold for the button's place and label
  const apply = (open = sidebar()?.open !== false) => {
    root.classList.toggle("hs-folded", !open);
    for (const b of buttons) {
      const label = t(open ? "hide" : "show");
      b.title = label;
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", String(!open));
    }
  };
  // slide out and in: View Transitions snapshot the old and new view, the panel slides with transform + opacity
  // (style.css, hs-vt). No API, or the first second after load (a view asks to fold on entry) - no animation;
  // "reduce motion" - only a crossfade. Only our own moves animate; the divider's handle is the core's.
  const loadedAt = performance.now();
  const animated = (fn) => {
    if (!document.startViewTransition || performance.now() - loadedAt < 1000) return fn();
    root.classList.add("hs-vt");
    const vt = document.startViewTransition(() => { fn(); apply(); });
    vt.finished.finally(() => root.classList.remove("hs-vt"));
  };
  const requests = createRequests(sidebar);

  const button = (cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `hs-btn ${cls}`;
    b.append(panelIcon());
    b.addEventListener("click", () => animated(() => toggle(sidebar, requests)));
    buttons.push(b);
    return b;
  };

  hub.addStyle("style.css");
  document.body.append(button("hs-edge"));
  hub.addSlot("sidebar.header", {
    id: "hide-sidebar",
    order: -1,
    render(r) { if (!r.firstChild) r.append(button("hs-head")); apply(); },
  });
  hub.on("sidebar", ({ open }) => apply(open));
  addEventListener("hub-sidebar", (e) => animated(() => requests(e.detail)));

  // the theme's button comes and goes with the theme: look again once per frame after a change of the page
  let native = false, looking = false;
  const look = () => {
    looking = false;
    const now = hasNative(document);
    if (now !== native) { native = now; root.classList.toggle("hs-native", native); }
  };
  const lookSoon = () => { if (!looking) { looking = true; requestAnimationFrame(look); } };
  new MutationObserver(lookSoon).observe(document.body, { childList: true, subtree: true });
  addEventListener("hub-theme", lookSoon);
  look();
  migrate(localStorage, sidebar);
  apply();
}
