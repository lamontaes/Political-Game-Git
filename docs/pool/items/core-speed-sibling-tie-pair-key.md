---
id: core-speed-sibling-tie-pair-key
title: "The opening's sibling-tie key is built with pairKey instead of sorting a two-element array"
area: core
kind: cleanup
priority: 3
size: S
status: in-pr
claimed-by: claude/speed-people-sort
pr: #5409
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T22:22:45.860Z
---

**What.** buildPopulation (src/core2/population.ts) keys each sibling tie as [child, sibling].sort().join(':'), a temporary array and a sort per tie; the kernel's pairKey builds the same key without them. The remaining slice of PR 5409 after main carried pairKey and its other call sites.

**Rules.** The key and every id built from it stay byte-identical; the speed umbrella core-speed-gc-churn stays open.

**Done when.** The sibling-tie key uses pairKey, and the opening's past-fact ids hash the same on main and on the branch for a named seed.

**Files.** src/core2/population.ts

**Notes.** TODO
