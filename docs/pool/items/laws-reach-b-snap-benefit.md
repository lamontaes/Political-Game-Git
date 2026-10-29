---
id: laws-reach-b-snap-benefit
title: "A baseline SNAP benefit is paid by a benefits writer, and the work requirement counts each person's own months"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr: #5720
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** SG-GOV-REACH-B-assistance-benefits. No baseline SNAP benefit is paid, and the work requirement time-limits only the raised welfare line. Add a benefits writer (person or household, program, monthly amount, payer account, from, to) that pays an eligible household monthly from the treasury, and have the work requirement count each person's own months of benefit.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps.json

Sent back 2026-10-20 from PR #5443 (branch claude/snap-benefit): the played-year test returns early where no SNAP law is in force; redraw instead; finish on that branch, merge main into it first.

**Notes.** Checked Oct 19 before building: SNAP and means-tested benefits appear nowhere in docs/roadmap/political-process-baseline.md, the golden path, DECISION-REGISTER.md or OWNER-DECISIONS.md. AGENTS.md ("This is a game, not a spreadsheet") makes a new baseline benefit a question for the owner, not a feature. OWNER QUESTION: should the game pay households a baseline SNAP benefit, or should the assistance law stay a rule on the welfare line's raise only? Until he rules, leave this item unbuilt. Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.

Sent back 2026-10-20 from PR #5720 (branch claude/political-game-pool-yucp92-bt): merging main conflicts in the group-b food-aid and money code: #5652 already put a SNAP benefit on main, so reconcile with it first; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5720 (branch claude/political-game-pool-yucp92-bt): the changed played-world test raises its timeout from 240 to 900 seconds without a measured reason; the umbrella still requires annual reader/stopgap proof while this table leaves months open, so give the completed redraw slice a bounded valid item; finish on that branch, merge main into it first.

Oct 29 (laws lead's SNAP helper, from the chk2-c red in Caliente, Nevada, place 3208500, seed 97de418c56d113d5): the time limit counts months only for the household's payee (recordDraws), and the benefit never drops a stopped member's share. So a stop changes nothing when another member is the payee (household_0898e50f43a0ccf9: person_1f33b443275fd027 was stopped from April 2025 while the household kept drawing through person_1f33b343275fce74, obligation reach-b:benefit:snap-maximum:US|person_1f33b343275fce74:2025-04-01), and it stops the whole household when the stopped person is the payee. Under 7 CFR 273.24 each covered adult uses a countable month whenever the household receives benefits, and only that person's share drops out. This is the "counts each person's own months" half of this item.
