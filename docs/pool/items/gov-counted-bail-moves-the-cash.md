---
id: gov-counted-bail-moves-the-cash
title: "Counted defendants who post bail move no money to the court"
area: gov
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/counted-bail-cash
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T17:31:10.522Z
---

**What.** The public-safety engine's monthly case flow (src/core2/public-safety.ts, batchCase and unableToPost) splits a counted group's adult defendants into those who cannot post bail, who are detained, and the rest, who are released on bail, but nothing moves for the ones who post: no money leaves the group's fund and nothing is held for the court. Full people who post bail move it on the journal from their own cash into the court escrow under the prosecuting government's treasury, and get it back when the case is heard (src/core2/modules/justice.ts, holdBail and returnBail). Under one model, two tiers, the counted group should post the same bail from its fund, times the count that posts, into the same court escrow, and get it back at the case's due month when the batch case closes.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, so posting bail must move money for counted defendants exactly as it does for a full person, and a rule that applies only to full people is an unregistered placeholder. An effect is a read: the held bail is a dollar on the journal the group's spending reads.

**Done when.** In a drawn place (buildBenchWorld with placeKey from drawPlace, seed named in the PR body), one played year shows a counted group's bail posted from its fund into the court escrow and returned at the batch case's due month, named by the public-safety case record id and both journal entry ids; the public-safety and justice tests (npm test -- src/core2/public-safety src/core2/justice src/core2/law-wiring-justice) pass.

**Files.** src/core2/public-safety.ts, src/core2/modules/justice.ts, src/core2/counted-money.ts, src/core2/law-wiring-justice.test.ts

**Notes.** Found Oct 23 while finishing justice-bail-moves-the-cash: batchCase records the detained share and the bail law's effect for counted adult defendants each month, but no posting for the share that posts bail, while a full person's posted bail is a journal entry. The full-person bail lives in src/core2/modules/justice.ts (escrowOf, holdBail, returnBail); reuse that escrow account rather than adding a second one.
