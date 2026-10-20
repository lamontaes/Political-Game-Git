---
id: laws-reach-b-snap-benefit
title: "A baseline SNAP benefit is paid by a benefits writer, and the work requirement counts each person's own months"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr: #5443
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
