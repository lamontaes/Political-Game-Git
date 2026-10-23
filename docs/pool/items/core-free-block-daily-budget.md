---
id: core-free-block-daily-budget
title: "Free hours hold a whole day's plan: several acts per need, needs that move between planned days, plans kept with the world"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/free-block.ts fills a person's free hours from one scoring pass per activation: at most one act per need each day, needs other than company held at their activation value between planned days, and the plan kept in memory, not in the world's saved state. The ATUS reserve for activities the game does not model is already read, so what is left is the plan itself. Let needs move on each planned day from their own causes, allow a second act for a need when it still scores, keep plans with the world, and check the town's share of adult-days with a visit against ATUS 2025 (28.2% to 32.5%, data/research/core/atus-2025-socializing.json). Closes SG-P15-free-block-plan.

**Rules.** No dice: which act fills an evening comes from the person's needs, ties, money and traits scored in their own reasons, never a draw against the ATUS share. Speed: the plan is made once per activation and read by date, never a daily scan of the world, within the 20% year budget.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR), scripts/research/core-year.ts prints the town's share of adult-days with a visit, by tier, inside the ATUS band, naming two person ids whose planned acts changed a later day's need, and a test in src/core2/free-block.test.ts shows a need that regrows between planned days.

**Files.** src/core2/free-block.ts, src/core2/free-block.test.ts, src/core2/data/free-block.json, data/research/core/atus-2025-socializing.json, src/core2/data/stopgaps.json

**Notes.** TODO
