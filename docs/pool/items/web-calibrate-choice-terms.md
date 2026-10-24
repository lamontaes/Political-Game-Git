---
id: web-calibrate-choice-terms
title: "Calibrate the outcome web's birth term in full couples' plan-a-child choice"
area: core
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/web-calibrate
pr: #5654
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T00:10:42.939Z
---

**What.** Two engines read the web's factor as a term in a choice that picks the higher score, not as a rate: full couples' plan-a-child choice (stopgap SG-WEB-births-full-tier, which has no term yet) and the jobs engine's participation pull (SG-LABOR-participation-scale, where a +0.3 older-work effect moved the share only 3%). Fit each term's weight in a played year so the group's share moves by the researched size, as counted births and counted participation already do. The fitted weight goes in the parameter table tagged TUNABLE with the researched size as its check, and the choice itself still reads each person's own records.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice; numbers live in the parameter table tagged TUNABLE with the spread checked against.

**Done when.** In a one-year bench world in a drawn place (place and seed named), a twin whose web month rows shift the unemployment-to-births link moves the place's birth-rate factor by the link's researched share a point, within its range; every full couple's review the twin shares with the base world moves its plan score's web term by renewalWebWeight times that shift (by the mother's age weight); and each plan the shift tips is followed to its pregnancy and, when due inside the year, its birth, by record id. renewalWebWeight is TUNABLE, with its spread checked on the pooled count its row cites. Stopgap SG-WEB-births-full-tier is resolved. The labor half (retirement-age-to-older-work) moved to `web-calibrate-labor-participation` on Oct 21.

**Files.** src/core2/births-plan.ts, src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** Done-when restated Oct 24 by the effects lead. The earlier text asked one town's year to show full couples' births moving 0.75% a point. A town's few dozen full couples make about one plan a year, so no realistic swing tips a whole plan; the elasticity is checked on the pooled count over four drawn places instead (renewalWebWeight's row), and the played year proves the read and the chain to named births.

Sent back 2026-10-20 from PR #5654 (branch claude/web-calibrate): src/core2/births-full-web.test.ts fails with main merged (run seed 85f1ab6ee110a92f: the factor-0.9 planning share equals the base, 0.0756 vs 0.0756, in all nine drawn places); finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5654 (branch claude/web-calibrate): docs/pool/items/web-calibrate-choice-terms.md:20 requires a one-year drawn played-world proof of full births and the retirement-age-to-older-work effect, with both stopgaps resolved. The new births test measures planning choices, and the body explicitly leaves the labor term unbuilt, so that named proof is missing. Also remove the new owner/date attribution in src/core2/births-full-web.test.ts:4; state the two-tier rule without the dated owner note.; finish on that branch, merge main into it first.
Sent back 2026-10-20 from PR #5654 (branch claude/web-calibrate): births-full-web.test.ts still fails on the merged head: the factor-0.9 planning share equals the base in every drawn place; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5643 (branch claude/pool-note-calibrate-terms): docs/pool/items/web-calibrate-choice-terms.md:31 says SG-LABOR-participation-scale is absent and src/core2/jobs-web.ts does not exist. Both are present on current origin/main: jobs-web.ts:16-18 declares and reads the labor participation outcomes, and the stopgap ID exists in stopgaps.json. The births-side correction addresses the old feedback, but the jobs-side absence claim is now stale. Update the note and body against the current readers, separating implemented terms from any remaining calibration proof. Main merged cleanly and was plain-pushed here; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5654 (branch claude/web-calibrate): Mocked web factors and three-day planning counts do not supply the required one-year unemployment-web-to-full-births 0.75-percent-per-point proof; finish on that branch, merge main into it first.

Checked against main (Oct 23, claimed and released unbuilt): both terms exist now and what is left is the fit. `SG-WEB-births-full-tier` is open in stopgaps.json (src/core2/births-plan.ts, line 159): the full couples' plan score carries a web-conditions term but its weight is not fitted to the researched 0.75 percent a point. `SG-LABOR-participation-scale` is open in stopgaps.json (src/core2/jobs-web.ts, line 206): the participation web term for mothers, married women and ages 62 to 67 is built and read there (`OLDER_WORK`, `MOTHERS`, `MARRIED_WOMEN`), but a 30 percent older-work effect moved the share at work only from 0.656 to 0.677 in a played town, so its weight is unfitted. Remaining here: fit each weight in a one-year bench world and resolve both rows.
