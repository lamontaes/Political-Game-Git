---
id: core-approach-office-no-staff-throws
title: "A planned approach to an office that has lost its staff lapses instead of stopping the world"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/approach-office-staffed
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T10:16:55.943Z
---

**What.** A resident with a cause plans to approach a town office while it has staff (the known-office offers keep only staffed offices), but the plan is carried out later, and by then the office's last staff member can be gone. The approach performer then throws 'An official approach requires a recorded staff member.' (src/core2/modules/life.ts). On clean main it stops Long Hollow, South Dakota (4638760, seed 5da89cbd151c955ac0720c2296a9156c17fbdb7025128c169387a27ff8f7aeff, the paired performance check's draw for one commit) on February 20, 2025, so any PR whose head draws that town fails the paired performance check.

**Rules.** No dice. A plan whose target changed lapses by the same eligibility check that offered it; nothing is decided by a fallback. Fix at the root, not in the check.

**Done when.** An eligibility rule on approaching an office checks it still has staff when the plan is carried out; src/core2/approach-office-staffed.test.ts plays Long Hollow on that seed past February 20, 2025 without a throw, and fails on clean main.

**Files.** src/core2/modules/life.ts, src/core2/data/content.json, src/core2/approach-office-staffed.test.ts

**Notes.** Filed Oct 25 by the effects lead from the paired performance failure on PR 6004.
