---
id: legislature-vote-trade-without-stage
title: "A vote on a bill with an unstaged trade stops with Module data must be finite (legislature.test.ts seeds a2, a3, a6)"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A vote on a bill with a trade that carries no stage stops with "Module data must be finite, acyclic JSON data" (legislature.test.ts seeds a2, a3 and a6). The vote row copies each trade's stage, and a trade made outside a markup or the floor has none, so the row holds an undefined value that module data refuses. Leave the stage out of the row when the trade has none.

**Rules.** Replace, never layer: fix the row where it is written rather than catching the error beside it. Ask why: the vote still cites each trade the member took, with its kind and terms.

**Done when.** src/core2/legislature.test.ts passes with GOLDEN_PATH_SEED set to a2, a3 and a6 and in a drawn place and a seed the builder did not choose, and a member's vote row cites the trade by kind and terms with no undefined field.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature.test.ts

**Notes.** Reproduced on clean main with seed a2: the minimum wage ordinance test stops at the vote.
