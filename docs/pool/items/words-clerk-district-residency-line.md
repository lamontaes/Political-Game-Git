---
id: words-clerk-district-residency-line
title: "The filing clerk says why a candidate may not file for a ward seat they do not live in"
area: words
kind: wiring
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The filing clerk says why a candidate may not file for a ward seat they do not live in. Today the refusal gives no reason in words. The clerk's line comes from the English engine, reading the district residency refusal the filing rules already record.

**Rules.** No hand-written player text: the line is composed by the English engine from the refusal record, not written in a screen. Ask why: the line cites the recorded district and the candidate's recorded home.

**Done when.** In the played world, a candidate who lives outside a council ward files for that ward in a drawn place, and `src/director/filing-visit.test.ts` shows the clerk's line naming the ward and the refusal record id, with no fixed text in the screen.

**Files.** src/core2/modules/filing-clerk.ts, src/director/filing-visit.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: say district only where the place's records do (OD:411).

Oct 29 (CTO, second account): PR #5066 closed as stale under the owner's standing approval; back to open. Branch `claude/dazzling-heisenberg-w2egp9` is kept; claiming this item takes it over.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. Commit 18dc1ebd42 (Nov 8, the clerk says plainly why you can't file) puts the residency refusal in words: checkEligibility in src/core2/modules/elections.ts (line 1033) records the required and actual place by name, src/director/filing-visit.ts words it, and scripts/dev-tests/filing-residency.ts proves it. Caveat: it names the town or state, not a ward; the look-first audit (OD:411) said to say district only where the place's records do, so no ward line is needed.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
