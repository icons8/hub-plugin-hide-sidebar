# Hide sidebar: an Agents Hub plugin

> Original author: [@Eugenius-S](https://github.com/Eugenius-S) · upstream: [Eugenius-S/hub-plugin-hide-sidebar](https://github.com/Eugenius-S/hub-plugin-hide-sidebar). This is the copy the Hub catalog installs; the author's updates are taken into it from upstream.
>
> License: MIT (Eugenius-S)

A button with a panel icon folds and restores the hub sidebar, like in Claude. The button sits in the sidebar header: on top are the button, the plugins avatar (mascot) and the ☰ menu, below is the search at full width; while the sidebar is folded, the button sits at the left edge of the page, in the same place. The fold is the hub's own (`hub.sidebar`, Plugin API 1.31): the same state as the divider's handle, remembered by the hub; the plugin keeps no state of its own. The sidebar smoothly slides out and in (about 260 ms) when you press the button; only position and opacity move. With "reduce motion" set in the system, the sidebar just fades. Right after the page loads there is no animation, and neither in a browser without View Transitions. On a phone the session list is a separate screen, so there is no button.

The button label is English by default and Russian when the hub language is Russian.

## Themes with their own button

If a theme draws its own sidebar button, this plugin shows no button: both would work the same hub fold. The plugin looks for it by markup, not by theme name: any button marked `data-sidebar-toggle`, or a button whose class contains `fold` in the search row (`.search-row`) or directly in `#app` (the Clean theme). It looks again after every change of the page, so a theme switch needs no reload. A theme author can mark the button with `data-sidebar-toggle`.

## For other plugins

Call the hub directly: `hub.sidebar({ open: false })` folds the sidebar, `hub.sidebar({ open: true })` restores it, `hub.on("sidebar", fn)` follows the changes (check `hub.capabilities?.sidebar === 1`).

The older event on `window` still works while this plugin is installed: it folds the sidebar for the time of a view and restores it after.

```js
dispatchEvent(new CustomEvent("hub-sidebar", { detail: { hide: true, by: "my-plugin" } }));    // entered the view
dispatchEvent(new CustomEvent("hub-sidebar", { detail: { hide: false, by: "my-plugin" } }));   // left the view
```

When the last one releases, the sidebar comes back if it was open before. If the owner moved it by hand during the view, that stays. While the sidebar is folded, `<html>` has the class `hs-folded`, and a button (32×32) sits in the top left corner, so leave room for it.

## Changes

- 1.5.0: the button works the hub's own fold (`hub.sidebar`) instead of a second "hidden" state of the plugin; a choice saved by an older version becomes the hub's fold once. Needs Plugin API 1.31.
- 1.4.0: a theme with its own sidebar button (Clean) - one button instead of two; the plugin's header layout also stays out of such a theme's header.

## Install

"Settings" → "Plugins" → paste the link to this repository → "Check and install". Needs a hub with Plugin API 1.31+ (`hub.sidebar`).

## Tests

```
python3 -m unittest discover -s tests
node --test tests/*.test.mjs
```

Code — MIT.

Icon — [3D Fluency](https://icons8.com/icons/3d-fluency) by Icons8.
