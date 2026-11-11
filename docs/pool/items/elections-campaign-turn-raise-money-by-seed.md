---
id: elections-campaign-turn-raise-money-by-seed
title: "campaign-turn's raise-money case fails by seed in Whiteville, North Carolina"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governing lead, Nov 2 (found by the platform workflow on Nov 1, red on main too)
lead: governing
checked: fable 2026-11-10
---

**What.** src/core2/campaign-turn.test.ts, the case that raises money and spends it on the journal, fails with "expected 0 to be greater than 0" in Whiteville, North Carolina (3773660) on GOLDEN_PATH_SEED=53cc0ecaeb4fa8faa359aa4d217f1bef751915df839c9f9e668e38aba1d6ac6c. The governing lead's platform workflow found it on Nov 1, and it fails the same way with main's engine files swapped in. Find whether the candidate raised nothing because no one they reached had a reason or money to give, or because the test's pick of candidate leaves them no donors, and fix that cause.

**Cause.** Needs cause. Looked at: `src/core2/campaign-turn.test.ts` (line 173, the raise-and-spend case) at Whiteville, North Carolina (3773660) on GOLDEN_PATH_SEED=53cc0ecaeb4fa8faa359aa4d217f1bef751915df839c9f9e668e38aba1d6ac6c gives raisedMinor 0, "expected 0 to be greater than 0", and it fails the same way with main's engine files swapped in. Whether no one reached had a reason or money to give, or the test's candidate pick leaves no donors, is not known; the Nov 2 donor-call ruling may have changed who is reached.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session, to rerun on the donor-call ruling, find the cause and fix it.

**Rules.** Never loosen the assertion: fix the generated inputs or the engine. One rule, all 56 places: the test names the place and seed it drew. No dice.

**Done when.** A second session runs `src/core2/campaign-turn.test.ts` on the Whiteville, North Carolina seed above and on two fresh drawn place seeds (names and seeds written down) and it passes. The cause of the candidate raising nothing is named by record id (the asks made and who they reached), and in a played campaign in a drawn place the candidate raises money from donors who were reached.

**Waits on.** Nothing.

**Files.** src/core2/campaign-turn.test.ts

**Notes.** Filed by the governing lead, Nov 2; the Done when was lengthened by the CTO to pass the pool check (Nov 2, 00:30). The donor call list ruled at 00:25 (OWNER-DECISIONS) may change who is reached; rerun on it before tracing.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=3773660 GOLDEN_PATH_SEED=53cc0eca...6c npx vitest run src/core2/campaign-turn.test.ts`: the test draws its place from the seed, not the key, so it ran in Virgie, Kentucky (2179860) and not Whiteville. The raise-and-spend case named here passed; a different test failed: "a rich rival holds an event on a day it is offered and a poor one does not": "expected null to be 'event'". Fresh draw `GOLDEN_PATH_SEED=e1e888d61a8c2875` (Cascade, Montana, 3012775): the same test fails with the same message. Still red, on a different assertion.
