---
id: laws-reach-b-snap-benefit
title: "A baseline SNAP benefit is paid by a benefits writer, and the work requirement counts each person's own months"
area: laws
kind: stopgap
priority: 3
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-laws-reach-b-snap-benefit
pr: #8609
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T05:06:12.001Z
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A baseline SNAP benefit is already on main (PR #5652). What is still wrong is the work requirement: the time limit counts months only for the household's payee, so stopping a person who is not the payee changes nothing, and stopping the payee stops the whole household. Under 7 CFR 273.24 each covered adult uses a countable month whenever the household receives benefits, and only that person's share drops out when they are stopped. Measured in Caliente, Nevada (3208500), seed 97de418c56d113d5: household_0898e50f43a0ccf9, person_1f33b443275fd027 was stopped from April 2025 while the household kept drawing through person_1f33b343275fce74 (obligation reach-b:benefit:snap-maximum:US|person_1f33b343275fce74:2025-04-01). Stopgap SG-GOV-REACH-B-assistance-benefits stays open until the baseline benefit is accepted or dropped.

**Cause.** Measured: Caliente, Nevada (3208500), seed 97de418c56d113d5, household_0898e50f43a0ccf9 (the chk2-c red of Oct 29). Code: `recordDraws` in src/core2/law-reach/group-b-money.ts (line 576) counts months for the household payee only.

**Fix.** Make the work requirement count each covered adult's own months (7 CFR 273.24) and drop only a stopped member's share of the benefit; SG-GOV-REACH-B-assistance-benefits stays open.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** A second session, not the builder, replays the Caliente, Nevada (3208500) world on seed 97de418c56d113d5 on main and sees: when a non-payee adult of household_0898e50f43a0ccf9 is stopped by the work requirement, the household's next benefit is lower by that person's share, by obligation record id, and a stopped payee no longer stops the whole household. The same holds in a second drawn place (place and seed named), counted households follow the same rule times their count, and a test in src/core2/law-reach-group-b.test.ts covers both.

**Waits on.** Nothing. The owner question about a baseline SNAP benefit is moot after PR #5652.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b-food-aid.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps/gov.json, src/core2/law-reach-group-b.test.ts

Sent back 2026-10-20 from PR #5443 (branch claude/snap-benefit): the played-year test returns early where no SNAP law is in force; redraw instead; finish on that branch, merge main into it first.

**Notes.** Checked Oct 19 before building: SNAP and means-tested benefits appear nowhere in docs/roadmap/political-process-baseline.md, the golden path, DECISION-REGISTER.md or OWNER-DECISIONS.md. AGENTS.md ("This is a game, not a spreadsheet") makes a new baseline benefit a question for the owner, not a feature. OWNER QUESTION: should the game pay households a baseline SNAP benefit, or should the assistance law stay a rule on the welfare line's raise only? Until he rules, leave this item unbuilt. Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.

Sent back 2026-10-20 from PR #5720 (branch claude/political-game-pool-yucp92-bt): merging main conflicts in the group-b food-aid and money code: #5652 already put a SNAP benefit on main, so reconcile with it first; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5720 (branch claude/political-game-pool-yucp92-bt): the changed played-world test raises its timeout from 240 to 900 seconds without a measured reason; the umbrella still requires annual reader/stopgap proof while this table leaves months open, so give the completed redraw slice a bounded valid item; finish on that branch, merge main into it first.

Oct 29 (laws lead's SNAP helper, from the chk2-c red in Caliente, Nevada, place 3208500, seed 97de418c56d113d5): the time limit counts months only for the household's payee (recordDraws), and the benefit never drops a stopped member's share. So a stop changes nothing when another member is the payee (household_0898e50f43a0ccf9: person_1f33b443275fd027 was stopped from April 2025 while the household kept drawing through person_1f33b343275fce74, obligation reach-b:benefit:snap-maximum:US|person_1f33b343275fce74:2025-04-01), and it stops the whole household when the stopped person is the payee. Under 7 CFR 273.24 each covered adult uses a countable month whenever the household receives benefits, and only that person's share drops out. This is the "counts each person's own months" half of this item.
