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
---

**What.** On Washington Mills, New York (GOLDEN_PATH_SEED=e2ddb122b8bfe482, GOLDEN_PATH_PLACE_KEY=3678454), src/director/conversation.test.ts 'answers a question about the player's relative, and may ask back about theirs' fails on clean main. The player's lean is to carry talk on, yet no talk offered the ask-back about the neighbor's relative among the four replies, so the count of turned talks is zero. Find why the ask-back reply is not offered there: no recorded event for the neighbor's relative, the reply ranked out of the four, or the family opener not chosen. Fix it at the root, not in the test.

**Rules.** No dice: the player's traits rank the four replies. Ask why: the ask-back cites the neighbor's family record. One rule, all 56 places: the test passes on any drawn place and seed.

**Done when.** The test passes on Washington Mills, New York, seed e2ddb122b8bfe482, and on three more places drawn from all 56 with seeds the builder did not choose, each named in the PR body.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts, src/director/data/conversation-rules.json

**Notes.** TODO
