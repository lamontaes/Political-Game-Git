---
id: elections-campaign-turn-raise-money-by-seed
title: "campaign-turn's raise-money case fails by seed in Whiteville, North Carolina"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Nov 2 (found by the platform workflow on Nov 1, red on main too)
lead: governing
---

**What.** src/core2/campaign-turn.test.ts, the case that raises money and spends it on the journal, fails with "expected 0 to be greater than 0" in Whiteville, North Carolina (3773660) on GOLDEN_PATH_SEED=53cc0ecaeb4fa8faa359aa4d217f1bef751915df839c9f9e668e38aba1d6ac6c. The governing lead's platform workflow found it on Nov 1, and it fails the same way with main's engine files swapped in. Find whether the candidate raised nothing because no one they reached had a reason or money to give, or because the test's pick of candidate leaves them no donors, and fix that cause.

**Rules.** Never loosen the assertion: fix the generated inputs or the engine. One rule, all 56 places: the test names the place and seed it drew. No dice.

**Done when.** src/core2/campaign-turn.test.ts passes on the Whiteville seed above and on two fresh seeds named in the pull request body, with the cause named by record.

**Files.** src/core2/campaign-turn.test.ts

**Notes.** TODO
