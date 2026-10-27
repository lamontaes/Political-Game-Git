---
id: traits-outcome-hardship-coping
title: "What a person does after a layoff or eviction reads the stress it caused and their temperament"
area: people
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #5979
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A layoff or an eviction now raises a person's stress by their temperament (src/core2/emotion.ts, weights from Bolger and Schilling 1991). But what they do next does not read that stress. Filing for unemployment, applying for a loan and moving away are weighed the same as on any other day, and falling behind on a debt gives no stress at all. Make the coping decisions that already run (jobs-benefits.file-claim, credit.borrow, moves.move-away) read the hardship's stress through the shared trait helper at a size taken from a study, and give missed debt payments the same Holmes and Rahe stress as a layoff, so outcome.hardship-coping is read by its owning engine.

**Rules.** No dice: stress and temperament shift a weighed reason, never a roll. This is a game, not a spreadsheet: no new activity, only decisions that already run. Research before building: the size cites its study in data/research/trait-effect-sizes.json.

**Done when.** In one year of buildBenchWorld in a place drawn from all 56, seed named, a person laid off or evicted has a following coping decision record (claim, loan application or move) whose reasons name the hardship's stress, beside a person in the same plight with the opposite temperament who chose differently, by record id, and data/content/trait-outcomes.json grades outcome.hardship-coping as read with that record and the engine line. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/emotion.ts, src/core2/jobs-benefits.ts, src/core2/modules/credit.ts, src/core2/modules/moves.ts, data/content/trait-outcomes.json

**Notes.** Split Oct 24 by the traits lead from traits-outcomes-unread.

Sent back 2026-10-26 from PR #5979 (branch claude/traits-outcome-hardship-coping): Declared parent5587 remains open with its unsourced-weight return unresolved; this child still carries jobs.apply0.7 and owner-draw0.35 against assumed targets, so merging it would bypass that return; land the repaired parent or isolate coping on main, preserving its new witnesses and research gaps, before the own local gate; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5979 (branch claude/traits-outcome-hardship-coping): Parent5587 is now landed, but the current-main merged Vermont year no longer reproduces the promised July12 departure and opposed October11 eviction even with hardship recipients in focus; refresh Done-when rows1-2 with runnable current-head played proof and both actual coping record IDs, update wired:true evidence and its outdated equal-severity phrase; finish on that branch, merge main into it first.
