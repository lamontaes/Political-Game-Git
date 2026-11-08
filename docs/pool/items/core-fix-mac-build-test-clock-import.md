---
id: core-fix-mac-build-test-clock-import
title: "Import CoreState from types in the filing test clock"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: mac-build-fix
pr: #7303
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-05T22:06:36.806Z
---

**What.** The Mac build typecheck failed because gov-test-clock imported CoreState from state, which does not export it. It now imports from types.

**Rules.** One engine per mechanic. No dice.

**Done when.** Typecheck of the app project passes

**Files.** src/core2/gov-test-clock.ts

**Notes.** TODO
