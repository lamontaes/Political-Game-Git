---
id: roadmap-m0-flip-proven-five
title: "Roadmap M0-01, M0-02, M0-03, M0-04 and M0-06 read passes: true, with their runs and bench screenshots"
area: play
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr: #5869
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The M0-M2 lead's baseline on main b09ba675cd ran every M0 command in the place the golden-path runner draws for it. M0-01 to M0-04 and M0-06 passed, and their tests cover their whole spec text. This item flips those five flags in docs/roadmap/features.json with the runs and a bench screenshot each, so the owner can see what of M0 is finished. M0-05 and M0-07 wait on their own items.

**Rules.** Wire to the world: each flag flips only on its command passing in a place drawn from all 56 and the spec played in the bench. Never edit a spec's test text; only passes changes.

**Done when.** docs/roadmap/features.json reads passes: true for M0-01, M0-02, M0-03, M0-04 and M0-06; the PR body names each command's place and full seed, its output, and a bench screenshot of the spec played in a drawn place.

**Files.** docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m0-bench-flags and roadmap-m0-life-flags (on the CTO's branch until #5858 lands).

Sent back 2026-10-24 from PR #5869 (branch claude/quirky-ride-vrwwz4-m0-flags): M0-04 spec requires 20 sampled explanations with scores but evidence has only 10, and its command permits no-saved-reason without requiring scores; prove the unchanged spec or split only the other accepted flags; finish on that branch, merge main into it first.

The four delivered flags M0-01, M0-02, M0-03 and M0-06 are bounded by roadmap-m0-flip-proven-four for PR #5869. This five-flag acceptance remains open until M0-04 is actually proved, also tracked by play-m0-04-why-scores-all-sampled; no feature test text or missing proof was removed.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: same; narrow to M0-04.
