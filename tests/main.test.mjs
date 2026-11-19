// Page strings: English by default, Russian when hub.lang is "ru". Run: node --test tests/main.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { STR, makeT } from "../main.js";

test("English is the default, Russian when the hub language is Russian", () => {
  const hub = {};
  const t = makeT(hub);
  assert.equal(t("hide"), "Hide sidebar");
  hub.lang = "ru";                                  // the language is read at use time, not at load
  assert.equal(t("hide"), "Спрятать боковую панель");
  assert.equal(t("show"), "Показать боковую панель");
  hub.lang = "en";
  assert.equal(t("show"), "Show sidebar");
});

test("any other language falls back to English", () => {
  for (const lang of ["uk", "de", "xx", "", null, undefined]) assert.equal(makeT({ lang })("hide"), "Hide sidebar");
});

test("Russian has every key English has", () => {
  assert.deepEqual(Object.keys(STR.ru).sort(), Object.keys(STR.en).sort());
});

// ---- the theme's own sidebar button ----
import { NATIVE, hasNative } from "../main.js";

// a page as a list of {selector-parts it matches}: the stub answers querySelector for the NATIVE selector only
const page = (...nodes) => ({ querySelector: (sel) => (sel === NATIVE ? nodes.find((n) => n.native) ?? null : null) });

test("a page with a theme button is native, without one it is not", () => {
  assert.equal(hasNative(page()), false);
  assert.equal(hasNative(page({ native: false })), false);
  assert.equal(hasNative(page({ native: true })), true);
});

test("the selector finds the marked button and the fold buttons of a theme, never our own", () => {
  for (const part of ["[data-sidebar-toggle]", '.search-row button[class*="fold"]', '#app > button[class*="fold"]']) assert.ok(NATIVE.includes(part), part);
  assert.ok(!/hs-/.test(NATIVE));
});
