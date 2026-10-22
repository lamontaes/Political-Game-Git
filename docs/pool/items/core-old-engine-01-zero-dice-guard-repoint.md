---
id: core-old-engine-01-zero-dice-guard-repoint
title: "Re-point the zero-dice guard at src/core2 and the live folders before the old core goes"
area: core
kind: cleanup
priority: 1
size: S
status: claimed
claimed-by: claude/zero-dice-roots
pr:
after:
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md sections F and G2 step 10"
claimed-at: 2026-10-22T04:48:46.976Z
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit found that `scripts/zero-dice-guard.mjs` scans `SCANNED_ROOTS` of `src/simulation`, `src/presentation` and `src/crisis`, and `src/crisis` does not exist. `src/core2` is scanned for list-picks only, and `src/bench` and `src/director` are not scanned at all. 103 of the guard's 136 allow-list entries name old-core files. When the old core is deleted the guard scans nothing, so this step comes first: re-point the roots at `src/core2`, `src/bench` and `src/director` in full, remove the dead `src/crisis` path, and drop the 103 old-core allow-list rows. Game code is already clean (0 `Math.random` in `src/` outside tests), so the re-pointed guard should pass without new allow-list rows.

**Rules.** Replace, never layer: the old roots and the 103 old-core allow-list rows are deleted in the same PR as the new roots are added, not left beside them. No dice: the guard is the proof of that rule, and it must watch the engine that runs the game. Checks stay light: the guard keeps running under `npm run zero-dice` in the gate. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `grep -n "src/crisis\|src/simulation\|src/presentation" scripts/zero-dice-guard.mjs` returns nothing; `npm run zero-dice` scans `src/core2`, `src/bench` and `src/director` and reports the scanned file count; the guard still fails on a `Math.random` added to a core2 file in a scratch check; and the golden-path suite passes on a drawn place.

**Files.** scripts/zero-dice-guard.mjs

**Notes.** Audit section F: "When the old core goes, the guard scans nothing." Parent: core-delete-old-engine. The audit's pool row for this was `release-zero-dice-roots`; this id replaces it.
