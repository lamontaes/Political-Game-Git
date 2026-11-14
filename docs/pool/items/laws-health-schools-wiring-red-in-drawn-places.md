---
id: laws-health-schools-wiring-red-in-drawn-places
title: "The health, assistance and school law wiring test is red in drawn places on main and on the train: a Medicaid work requirement and a voucher law reach nobody"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Account lead F1, Nov 14, 2026, checking whether #8582's two red tests were its own"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** `src/core2/law-wiring-health-schools.test.ts` follows a health, assistance or school law from the bill to a household, the money it moves and an outcome. It fails in drawn places, and `src/core2/outcome-web-health-played.test.ts` fails on "medicaid-expansion-to-coverage ran" in every place it was drawn. A law that exists on the books reaches nobody, so a player who passes a Medicaid work requirement or a voucher law would see no household change. Seen: on a resident's Money tab and in dev mode's "Who it reached" after the law takes effect.

**Cause.** Measured: on clean main fa34439db86808e0f2b62ccae52607c13f8feb81 and on the train head (the same results on both): `law-wiring-health-schools` at Golden Valley, Nevada (3228860, GOLDEN_PATH_PLACE_KEY, world seed e2b1eb54f164b08653d4ff16f23fbd3fa490bab7a4df18e9658d3693aa31bdca): "us-policy-positions:health-human-services.medicaid-work-requirement: no applied record: expected undefined to be defined"; at Coolidge, Arizona (0415500, world seed 1514d1dc5d2be012d1c7889e759af302d79189864ce4df6c59c4076dcdc4b23c): "vouchers paid nothing: expected 0 to be greater than 0". `outcome-web-health-played`: "medicaid-expansion-to-coverage ran: expected undefined to be defined" at Epping, New Hampshire (US-NH, seed b3e99f8fc9b2daf3), Wilbur Park, Missouri (seed 5f92c71401acbc17), Coral Bay, U.S. Virgin Islands (seed d9f7d643a67f8b9b) and Hightstown, New Jersey (seed 01bfe6497333bab2). Not yet found: whether the law reach engine skips these laws, or the tests expect a record the engines no longer write; read `appliedTo` (src/core2/law-reach/applied.ts) for the Golden Valley household after the work requirement takes effect.

**Fix.** Replay Golden Valley and Coolidge with a probe that prints, for the law, its row in the laws table, the households it should reach and the reach records written. Fix the engine that does not write a record the web or the payer reads, or change the test where the law is rightly out of reach in that place and say why.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read (owner, Oct 13): the fix is proved by a dollar on the journal or a household marked reached, read by another engine. Ask why: a household's reach cites the law row by id.

**Done when.** A second session, not the builder, runs both tests on main in Golden Valley, Nevada and Coolidge, Arizona (the seeds above, as drawn places) and in one place nobody chose, and each passes, or the item states for each place why the law rightly reaches nobody and the test no longer asserts it.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/outcome-web-health-played.test.ts, src/core2/law-reach/applied.ts, src/core2/modules/outcome-web.ts
