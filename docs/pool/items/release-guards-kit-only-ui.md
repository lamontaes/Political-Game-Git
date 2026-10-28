---
id: release-guards-kit-only-ui
title: "A guard fails any bench file outside the UI kit that builds markup itself"
area: release
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/guards-kit-only-ui
pr: #6500
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:54:36.594Z
---

**What.** The owner ruled that every piece of UI comes from the UI kit and nothing is invented. Nothing stops a screen file from building its own markup with el, createElement, innerHTML or an HTML template. Today play.mjs and dev.mjs build 395 pieces of markup outside src/bench/ui, and a new file could add more without any check turning red.

**Rules.** Replace, never layer: a new screen piece goes into the kit, so the guard refuses new markup outside src/bench/ui and the baseline of today's offenders only shrinks. One engine per mechanic: one renderer per menu type, the kit, draws every screen.

**Done when.** tests/guards/kit-only-ui.test.ts fails when a file under src/bench outside src/bench/ui builds markup beyond its count in tests/guards/kit-only-ui-baseline.json and when a count is not lowered after a fix; the test run passes on main and fails with a createElement added to src/bench/opening.ts.

**Files.** tests/guards/kit-only-ui.test.ts, tests/guards/kit-only-ui-baseline.json, scripts/guards/index.ts

**Notes.** TODO
