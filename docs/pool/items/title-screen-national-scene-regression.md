---
id: title-screen-national-scene-regression
title: "Title-screen national scene test fails on current main"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The current main title-screen test fails before and after PR #6178 because TITLE_SCENES includes lincoln-memorial while the test rejects it. Reconcile the generated title scene list with the approved screen and backdrop rulings. Preserve the unrelated shared-panel implementation and report the original failing assertion.

**Rules.** Follow the screens owner rulings and replace, never layer. Read the approved title backdrop decision before changing the test or production list; never add a bypass just to clear the assertion.

**Done when.** Run node --test desktop/tests/title-screen.test.mjs on the corrected head and record both tests passing. Name the approved backdrop ruling that justifies the chosen scene list, and verify the title still renders a real manifest backdrop with its menu controls.

**Files.** src/bench/title.ts, desktop/tests/title-screen.test.mjs, art/backdrops/manifest.json

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (no failing assertion on main).
