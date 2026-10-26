---
id: laws-outcome-justice
title: "Justice and public safety laws (civilian oversight, immigration partnership, cash bail, juvenile age, child access, concealed carry, handgun age, stand your ground) reach people as a read"
area: laws
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/political-game-pool-v8txtd
pr: #5200
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:54:42.984Z
---

**What.** Justice and public-safety laws must reach people as a read. Most of the family (police oversight, juvenile age, stand your ground, carry permit) is in PR #5088 (gov-justice-incident-records) and handgun age is in world-sale-eligibility-reads, so this item builds the one law with an existing case route: ending cash bail. A charged official who does not plead now waits for trial in custody when cash bail is law and they cannot post bail, and goes home when the law is ended.

**Rules.** The chain is the acceptance: the law record, the defendant, the hold and the release are all named by id. No dice: the hold comes from the law in force and the defendant's own cash against an estimated bail. One rule, all 56 places: the law is read through lawInForce for the drawn place.

**Done when.** In a played world in a drawn place (buildBenchWorld, seed named in the test output), src/core2/justice-pretrial.test.ts shows a poor defendant held with cash bail law and freed when it is ended, citing the statute id. The owner plays it: a charged official sits out the wait for trial unless the state ended cash bail.

**Files.** src/core2/justice-pretrial.ts, src/core2/modules/justice.ts, src/core2/data/justice/parameters.json, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-pretrial narrowed, not closed: non-officials are still not arrested. Remaining justice laws sit in gov-justice-incident-records and world-sale-eligibility-reads.
