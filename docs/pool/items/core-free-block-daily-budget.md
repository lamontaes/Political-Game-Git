---
id: core-free-block-daily-budget
title: "Free hours hold a whole day's plan: several acts per need, needs that move between planned days, plans kept with the world"
area: core
kind: stopgap
priority: 2
size: M
status: dropped
claimed-by:
pr:
after:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** src/core2/free-block.ts fills a person's free hours from one scoring pass per activation: at most one act per need each day, needs other than company held at their activation value between planned days, and the plan kept in memory, not in the world's saved state. The ATUS reserve for activities the game does not model is already read, so what is left is the plan itself. Let needs move on each planned day from their own causes, allow a second act for a need when it still scores, keep plans with the world, and print the town's share of adult-days with a visit beside ATUS 2025 (28.2% to 32.5%, data/research/core/atus-2025-socializing.json) as a figure to report. Closes SG-P15-free-block-plan.

**Cause.** Found in code: src/core2/free-block.ts fills a person's free hours from one scoring pass per activation (`planFreeTime` at line 359, `takePlannedActs` at line 68): at most one act per need each day, needs other than company held at their activation value between planned days, and the plan kept in memory. Stopgap SG-P15-free-block-plan (src/core2/data/stopgaps/p15.json line 137).

**Fix.** Let needs move on each planned day from their own causes, allow a second act for a need when it still scores, keep plans with the world's saved state, and print the town's share of adult-days with a visit beside ATUS 2025 as a figure to report.

**Time box.** 6 hours for an Opus session.

**Rules.** No dice: which act fills an evening comes from the person's needs, ties, money and traits scored in their own reasons, never a draw against the ATUS share. The ATUS range is a figure to report and never a target (owner, Nov 8). Speed: the plan is made once per activation and read by date, never a daily scan of the world, within the 20% year budget.

**Done when.** A second session, in a one-year run of the played world in a drawn place (buildBenchWorld, place and seed named in the PR), sees two person ids whose planned acts changed a later day's need, by record id, and sees scripts/research/core-year.ts print the town's share of adult-days with a visit, by tier, beside ATUS 2025's 28.2% to 32.5% (data/research/core/atus-2025-socializing.json) as a figure to report, not a target. A test in src/core2/free-block.test.ts shows a need that regrows between planned days. SG-P15-free-block-plan is closed.

**Waits on.** Nothing.

**Files.** src/core2/free-block.ts, src/core2/free-block.test.ts, src/core2/data/free-block.json, data/research/core/atus-2025-socializing.json, src/core2/data/stopgaps/p15.json

**Notes.** TODO

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have let a person fit several acts per need into free hours and keep the plan in the save, and the player sees the same visits and talks either way.
