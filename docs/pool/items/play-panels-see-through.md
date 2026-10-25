---
id: play-panels-see-through
title: "Menu screens and person cards show the scene through their text"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-play-stop-17
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T17:39:07.393Z
---

**What.** On main, the menu, the Politics, People and Who you are sheets and a person's card are drawn as glass: 72 to 82 percent opaque with a 6-pixel blur, so the first evening's room and its people show behind small text. Only Calendar and News had their own solid override. In West Wareham, Massachusetts the new panels check found the person card see-through. This is the bench-checkable part of play-stop-17.

**Rules.** Replace, never layer: one solid rule for reading screens replaces the per-layout overrides.

**Done when.** src/bench/panels.browser.mjs passes in a drawn place on the first evening (the menu, News, Politics Government and a person card each opaque, no backdrop blur, text at WCAG AA 4.5 to 1) with the place and seed named and screenshots inspected, and fails on main's styles.

**Files.** src/bench/play.css, src/bench/panels.browser.mjs

**Notes.** TODO
