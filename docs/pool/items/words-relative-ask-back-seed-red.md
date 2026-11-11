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
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** On Washington Mills, New York (GOLDEN_PATH_SEED=e2ddb122b8bfe482, GOLDEN_PATH_PLACE_KEY=3678454), src/director/conversation.test.ts 'answers a question about the player's relative, and may ask back about theirs' fails on clean main. The player's lean is to carry talk on, yet no talk offered the ask-back about the neighbor's relative among the four replies, so the count of turned talks is zero. Find why the ask-back reply is not offered there: no recorded event for the neighbor's relative, the reply ranked out of the four, or the family opener not chosen. Fix it at the root, not in the test. Guards: the ask-back-about-a-relative talk test on main; the player is never offered that reply in this town.

**Cause.** Needs cause. Looked at the item only: GOLDEN_PATH_SEED=e2ddb122b8bfe482, GOLDEN_PATH_PLACE_KEY=3678454 (Washington Mills, New York), src/director/conversation.test.ts "answers a question about the player's relative, and may ask back about theirs" fails because no ask-back about the neighbor's relative is among the four replies; whether it is a missing family event, a ranking out of the four, or the family opener not chosen is not found.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session, to find which of the three it is by record and rewrite this item with Found in code and a real Fix.

**Rules.** No dice: the player's traits rank the four replies. Ask why: the ask-back cites the neighbor's family record. One rule, all 56 places: the test passes on any drawn place and seed.

**Done when.** A second session, not the builder, reads the rewritten item and finds the cause named by record id with a Fix in plain words, then runs src/director/conversation.test.ts on Washington Mills, New York (seed e2ddb122b8bfe482) and on three more places drawn from all 56 with seeds nobody chose (each named) and sees it pass.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts, src/director/data/conversation-rules.json

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=3678454 GOLDEN_PATH_SEED=e2ddb122b8bfe482 npx vitest run src/director/conversation.test.ts` (Washington Mills, New York): green, 21 of 21. Fresh draw `GOLDEN_PATH_SEED=fbd20867a28a0e8b`: green. The place is not printed on a pass. Proposed for the CTO: drop as fixed on main.
