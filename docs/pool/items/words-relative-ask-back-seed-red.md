---
id: words-relative-ask-back-seed-red
title: "A player who carries talk on is never offered the ask-back about a neighbor's relative on some drawn places"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: director
standard: 2
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** On Washington Mills, New York (GOLDEN_PATH_SEED=e2ddb122b8bfe482, GOLDEN_PATH_PLACE_KEY=3678454), src/director/conversation.test.ts 'answers a question about the player's relative, and may ask back about theirs' fails on clean main. The player's lean is to carry talk on, yet no talk offered the ask-back about the neighbor's relative among the four replies, so the count of turned talks is zero. Find why the ask-back reply is not offered there: no recorded event for the neighbor's relative, the reply ranked out of the four, or the family opener not chosen. Fix it at the root, not in the test.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). `GOLDEN_PATH_PLACE_KEY=3678454 GOLDEN_PATH_SEED=e2ddb122b8bfe482 npx vitest run src/director/conversation.test.ts -t "may ask back"` (Washington Mills, New York) passes, and so does a fresh draw, `GOLDEN_PATH_SEED=cause-fresh-7731`. This morning's re-run on 79d23fa596 also passed the whole file (21 of 21) on the same seed, and a fresh draw, fbd20867a28a0e8b, passed too. That is four passes on two mains and three seeds.

**Fix.** Nothing to build. The CTO drops the item as done by main. If the ask-back test fails again by seed, file a new item from that run's place and seed.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** No dice: the player's traits rank the four replies. Ask why: the ask-back cites the neighbor's family record. One rule, all 56 places: the test passes on any drawn place and seed.

**Done when.** A second session, not the builder, reads the rewritten item and finds the cause named by record id with a Fix in plain words, then runs src/director/conversation.test.ts on Washington Mills, New York (seed e2ddb122b8bfe482) and on three more places drawn from all 56 with seeds nobody chose (each named) and sees it pass.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts, src/director/data/conversation-rules.json

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=3678454 GOLDEN_PATH_SEED=e2ddb122b8bfe482 npx vitest run src/director/conversation.test.ts` (Washington Mills, New York): green, 21 of 21. Fresh draw `GOLDEN_PATH_SEED=fbd20867a28a0e8b`: green. The place is not printed on a pass. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): passed again on main d64255aa at the item's seed and on a fresh draw, cause-fresh-7731. I propose dropping the item as done by main, as this morning's re-run did.
