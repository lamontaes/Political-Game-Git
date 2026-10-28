---
id: tests-campaign-turn-rival-question-undefined
title: "campaign-turn.test's rival chooser throws on main: Cannot read properties of undefined (reading 'question')"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: wire-elections
source: wire-office session, Oct 28 (found red on main)
---

**What.** `src/core2/campaign-turn.test.ts` fails one of ten cases on clean main: the rival chooser case in Bonanza, Oregon (4107300), run seed ad381adf543851f279796cac3221d2b41f8c27e04e566f24202cedf8f76a5e4b, place seed 8710a4b0ada0ee1732d697b95910f32dfd71d34e0d27e97cd05bed7d968079db, for the filing filing:contest:seat:US-OR:us-senate:0:2026-11-03:person:press:outlet:television:0:jurisdiction_b7892e72d6c6c05a:owner:0, throws "TypeError: Cannot read properties of undefined (reading 'question')". `tests-rival-chooser-nobody-to-ask` (done) fixed an earlier failure of the same case. Every other case of the file passes in that draw, so the rival chooser alone reads a stance that is not there.

**Rules.** No dice: the rival's choice comes from their records (their stances, money and the people they can ask), so the fix finds which record the chooser expected and did not find. One rule, all 56 places: the case draws places and names them. Never weaken a test: an undefined stance is fixed at its cause, not skipped.

**Done when.** `src/core2/campaign-turn.test.ts` passes with GOLDEN_PATH_SEED=ad381adf543851f279796cac3221d2b41f8c27e04e566f24202cedf8f76a5e4b and on ten more drawn seeds, and the PR body names, by record id, the filing and the stance record whose question was missing in that played world, and the test that now holds it.

**Time box.** 2 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Files.** src/core2/campaign-turn.test.ts, src/core2/campaign-day.ts, src/core2/modules/campaigns.ts

**Notes.** Seen on main at d3ee6986bc by the wire-office session while testing the 2024 vote drawn per world.
