// The button and the hub-sidebar requests work the core's own fold (hub.sidebar): no state of our own.
// Run: node --test tests/bridge.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequests, toggle, migrate, OLD_KEY } from "../main.js";

// the core's hub.sidebar: {open, available}; only a boolean changes state
const core = (open = true, available = true) => {
  const calls = [];
  const sidebar = (o = {}) => {
    calls.push(o.open);
    if (available && typeof o.open === "boolean") open = o.open;
    return { open, available };
  };
  return { sidebar, calls, get open() { return open; }, set open(v) { open = v; } };
};
const mem = (init = {}) => {
  const m = { ...init };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, m };
};

test("the button flips the core's fold, both ways", () => {
  const c = core(true);
  assert.equal(toggle(c.sidebar), false);
  assert.equal(c.open, false);
  assert.equal(toggle(c.sidebar), true);
  assert.equal(c.open, true);
});

test("on a phone the core has no fold: the button changes nothing", () => {
  const c = core(true, false);
  toggle(c.sidebar);
  assert.equal(c.open, true);
});

test("a plugin folds the panel for its view and the panel comes back after", () => {
  const c = core(true);
  const req = createRequests(c.sidebar);
  req({ hide: true, by: "hub-design" });
  assert.equal(c.open, false);
  req({ hide: false, by: "hub-design" });
  assert.equal(c.open, true);
});

test("the owner folded it before: a plugin's release does not open it", () => {
  const c = core(false);
  const req = createRequests(c.sidebar);
  req({ hide: true, by: "a" });
  req({ hide: false, by: "a" });
  assert.equal(c.open, false);
});

test("the owner's own move during a view stays after it", () => {
  const c = core(true);
  const req = createRequests(c.sidebar);
  req({ hide: true, by: "a" });
  toggle(c.sidebar, req);            // opened by hand during the view
  toggle(c.sidebar, req);            // and folded again by hand
  req({ hide: false, by: "a" });
  assert.equal(c.open, false);       // the owner's choice, not a restore
});

test("two plugins: the panel comes back when the last one releases", () => {
  const c = core(true);
  const req = createRequests(c.sidebar);
  req({ hide: true, by: "a" });
  req({ hide: true, by: "b" });
  req({ hide: false, by: "a" });
  assert.equal(c.open, false);
  req({ hide: false, by: "b" });
  assert.equal(c.open, true);
});

test("garbage and a release by one who did not hold change nothing", () => {
  const c = core(true);
  const req = createRequests(c.sidebar);
  for (const d of [null, undefined, "x", { hide: "yes" }, { hide: false, by: "x" }]) req(d);
  assert.equal(c.open, true);
  assert.deepEqual(c.calls.filter((v) => typeof v === "boolean"), []);
});

test("the old plugin's saved 'hidden' becomes the core's fold once, then the key is gone", () => {
  const c = core(true);
  const st = mem({ [OLD_KEY]: "1" });
  migrate(st, c.sidebar);
  assert.equal(c.open, false);
  assert.equal(OLD_KEY in st.m, false);
  c.open = true;                      // the owner opens it later: no second migration
  migrate(st, c.sidebar);
  assert.equal(c.open, true);
});

test("the old 'shown' choice only removes the key, storage errors are harmless", () => {
  const c = core(false);
  const st = mem({ [OLD_KEY]: "0" });
  migrate(st, c.sidebar);
  assert.equal(c.open, false);
  assert.equal(OLD_KEY in st.m, false);
  const broken = { getItem() { throw new Error("no"); }, removeItem() { throw new Error("no"); } };
  migrate(broken, c.sidebar);
});
