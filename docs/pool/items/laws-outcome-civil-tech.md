---
id: laws-outcome-civil-tech
title: "Civil, privacy and redistricting laws (housing and work discrimination, abortion, social-media age checks, facial recognition, data privacy, independent redistricting) reach people as a read"
area: laws
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/laws-civil-tech
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:53:46.962Z
---

**What.** Six group A policies in src/core2/data/laws/reach-group-a.json still have mechanic `none`: the housing and work discrimination ban, the abortion restriction, social-media age verification, the limit on government facial recognition, the consumer data privacy law and independent redistricting, each with its own SG-GOV-REACH-A stopgap. Each needs a real reader in the engine that owns the decision, or a registered reason it cannot have one yet. Most already have their own build items (world-hiring-discrimination-ban-refusal and justice-discrimination-complaint for the ban, gov-justice-facial-recognition, the gov-redistricting parts, the data-privacy business charge), so this item is the roll-up: wire whichever are reachable now, replace the `none` handler with that reader, and point each remaining stopgap row at the item that will close it.

**Rules.** An effect is a read, not a record: a policy counts only when the hiring, rental, police, business or districting engine reads it at the moment it decides or pays. No dice: whether an employer, landlord or officer complies comes from their records and the law in force. One rule, all 56 places: the check names a drawn place and seed. Look before you ask: the Oct 20 ruling on background pregnancies binds the abortion row, and the employer-pass-over ruling binds the discrimination row.

**Done when.** For each of the six policies, either a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR body) shows the owning engine reading the law by record id at a decision (a refused hire, a barred identification, a business charge, a plan choice), or the stopgap row in src/core2/data/stopgaps.json names the pool item that replaces it; a test in src/core2/law-reach chain tests fails if any of the six handlers is still `none` without such a row.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a.ts, src/core2/data/stopgaps.json, src/core2/law-reach-balance.test.ts

**Notes.** Oct 20 (pool feeder): write-up filled from the six SG-GOV-REACH-A rows (discrimination, abortion, age-verification, facial-recognition, data-privacy, redistricting). Related open PR: #5474 (data privacy cost read by the business engine).
