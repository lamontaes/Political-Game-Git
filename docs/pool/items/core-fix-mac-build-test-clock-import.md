---
id: core-fix-mac-build-test-clock-import
title: "Import CoreState from types in the filing test clock"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The Mac build typecheck failed because gov-test-clock imported CoreState from state, which does not export it. It now imports from types.

**Rules.** One engine per mechanic. No dice.

**Done when.** Typecheck of the app project passes

**Files.** src/core2/gov-test-clock.ts

**Notes.** TODO
