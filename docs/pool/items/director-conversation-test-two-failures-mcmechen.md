---
id: director-conversation-test-two-failures-mcmechen
title: "The conversation test still fails twice in one drawn town: a turn with one reply, and a date a day short"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: low
root: none
source: the builder of director-conversation-test-sparse-town, Nov 10, 2026 (pull request 8176); filed by Fable
checked: fable 2026-11-10
---

**What.** After the conversation test was fixed for towns where the player knows few people, one drawn town still fails it in two places. Both failures are also on main. One turn offers a single reply where the test needs at least two, and the test of a lie being believed finds the date one day short after the world is advanced.

**Cause.** Measured: `GOLDEN_PATH_SEED=53a743e4444dbef2 npx vitest run src/director/conversation.test.ts` on main 061eda78 (West Hazleton, Pennsylvania) fails the lie test with "expected '2021-01-04' to be '2021-01-05'". The engine is right and the test picks the wrong hearer. Found in code: the hearer, person_3babfaa4c65588c4, lives with a family member, person_3babfba4c6558a77, who works at the player's employer (organization_2482cd7ac270b8e9). On Jan 4 their ordinary daily visit (relationship reason `visit:2021-01-04:person_3babfaa4c65588c4:person_3babfba4c6558a77`) reached `beliefsModule.onRelationshipChange` in src/director/conversation.ts (about line 3345). That housemate knows the truth, so the module emitted `...:found-out:person_3babfaa4c65588c4:2021-01-04`, and `settleLies` in src/director/ledger.ts (line 1833) ended the lie that day, before the test's own talk on Jan 5. The test chooses `believing` (src/director/conversation.test.ts, about line 199) from `strangers`, which excludes people at the player's employer but not people whose household or family includes someone there. The other failure (a turn with one reply) does not reproduce: McMechen passed 21 of 21 on Nov 11, and West Hazleton, Sunfield, Michigan (cf-c-fresh-2), Millville, Utah (cf-c-fresh-3), Ivalee, Alabama (cf-c-fresh-4) and Monte Rio, California (cf-c-fresh-5) pass the replies test today.

**Fix.** Change only the test's choice of hearers, never an assertion. In src/director/conversation.test.ts, filter `believing` to strangers none of whose household members or `familyIds` work at the player's employer (`myOrg()`) or live in the player's household. Those are the people who would set a hearer straight on their own before the test's knower talks to them. Keep the filter general, never naming a place. Run the file in West Hazleton (seed 53a743e4444dbef2) and three fresh draws. If the one-reply failure ever comes back, file it as a new item with its full seed; it is not part of this fix.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One rule, all 56 places: the cause is found in the composer or the clock, never patched for this town. No test is weakened to pass: the two assertions stay.

**Done when.** A second session runs the test file src/director/conversation.test.ts in West Hazleton, Pennsylvania (seed 53a743e4444dbef2) and in three more drawn places it names with their seeds, and all 21 tests pass in each, with the lie test's assertions unchanged.

**Waits on.** Nothing.

**Files.** src/director/conversation.test.ts, src/director/conversation.ts

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=5450260 GOLDEN_PATH_SEED=1076092e npx vitest run src/director/conversation.test.ts` (McMechen, West Virginia; only the seed's first eight characters are on record): green, 21 of 21 passed. Fresh draw `GOLDEN_PATH_SEED=53a743e4444dbef2` (West Hazleton, Pennsylvania): still red, the lie test: "expected '2021-01-04' to be '2021-01-05'". The one-reply failure did not appear there. Still red.

Nov 11 (cause finder for Fable B): reproduced the date failure in West Hazleton and traced it with two temporary logs, since undone. The lie ended a day early because the hearer's housemate works at the player's employer and their daily visit set the hearer straight, which is the game working. The fix is in how the test picks its hearers. The one-reply failure did not come back in five more draws.
