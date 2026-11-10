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
effort: medium
root: none
source: the builder of director-conversation-test-sparse-town, Nov 10, 2026 (pull request 8176); filed by Fable
checked: fable 2026-11-10
---

**What.** After the conversation test was fixed for towns where the player knows few people, one drawn town still fails it in two places. Both failures are also on main. One turn offers a single reply where the test needs at least two, and the test of a lie being believed finds the date one day short after the world is advanced. Guards: conversation.test, red on main in one drawn town (a turn with one reply, a lie that is believed a day early).

**Cause.** Needs cause. Looked at: the builder's report on pull request 8176. In McMechen, West Virginia (place key 5450260, draw seed beginning 1076092e; the full seed is in that builder's session, titled "Builder: the conversation test in a town where the player knows few people"), src/director/conversation.test.ts fails at its assertion that replies are distinct (near line 280) and at the lie test's date (near line 469: 2021-01-04 after an advance to 2021-01-05). Not yet known: why the composer offers one reply on that turn, and why the advance stops a day early there.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to replay the town and rewrite this item with both causes. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One rule, all 56 places: the cause is found in the composer or the clock, never patched for this town. No test is weakened to pass: the two assertions stay.

**Done when.** A second session runs src/director/conversation.test.ts in McMechen, West Virginia with the recorded seed and in three more drawn places it names with their seeds, and all 21 tests pass in each; in the running game in a drawn place every turn of a talk offers at least two replies.

**Waits on.** Pull request 8176.

**Files.** src/director/conversation.test.ts, src/director/conversation.ts
