---
id: guards-montage-people-entry
title: "The families guard on main: montage reaches inside the people family"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: lane-4/montage-import
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T06:43:27.753Z
---

**What.** src/bench/montage.ts imports keyPeopleOf from core2/opening-key-people, inside the people family; the families guard fails on main (named by Lane 5 in #7190).

**Rules.** Import a family's entry, never its insides (tests/guards/families.test.ts). Nothing loosened.

**Done when.** tests/guards/families.test.ts no longer names src/bench/montage.ts; the opening montage behaves the same (the entry re-exports the same function).

**Files.** src/bench/montage.ts

**Notes.** TODO
