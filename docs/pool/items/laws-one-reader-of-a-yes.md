---
id: laws-one-reader-of-a-yes
title: "Whether a policy is law here has one reader, the laws engine's, instead of six hand copies that skip its rules"
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/dup-law-in-force
pr: #6475
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:50:34.922Z
---

**What.** Six places each read whether a policy question is law for the town by taking the latest row at each level: inForceHere and reassertStandingLaws in the law-reach host, yesLevels in group-a-records, questionRow in group-b-money and groceryExemption in budgets. The laws engine's lawInForce is the sourced reader and also applies tiers, a county ordinance that covers only unincorporated areas, and statutes enacted in play; the copies skip those rules, so they can disagree with the law the Issues screen shows (duplicates report row C4).

**Rules.** One source per fact (owner, Oct 27) and An effect is a read: every engine that asks whether a law is in force reads the laws engine's own answer, so the six copies are deleted and their callers move to one yesLevels in modules/laws.ts, with no alias left behind.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, a year's durable log (every record id, kind and facts) is identical on main and on this branch by fingerprint, the law wiring and starting-law tests pass, and grep finds no inForceHere or questionRow and one yesLevels.

**Files.** src/core2/modules/laws.ts, src/core2/law-reach/host.ts, src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-b-money.ts, src/core2/modules/budgets.ts

**Notes.** TODO
