---
id: talks-offer-mutual-and-named-story-subjects
title: "People can bring up a person you both know and a story that names them"
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
lead: words
model: sonnet
effort: medium
root: none
source: Words builder A, Nov 16 (the tie rule of #9663 and #9678 refused subjects it should have accepted)
claimed-at:
checked:
---

**What.** After the tie rule, a person who knows someone you also know could not bring them up, and a printed story naming a person in the speaker's own record was not tied to them. The player never hears either. Seen: at North Hornell (seed 9f8e7d6c) the mutual subject was refused 26 of 26 times and offered 0; after the fix it is offered 7 times; at Ridgeville, Alabama the intro test finds a story for a named stranger again.

**Cause.** Measured: at North Hornell (seed 9f8e7d6c) with the tie rule on, mutual subjects carried no tie record (refused 26, offered 0 at North Hornell) and `storyTie` named only household and kin, not the winner, losers, appointee or appointer a story names.

**Fix.** The mutual subject carries a tie from the last contact and the known-person source (src/director/conversation.ts); `storyTie` also ties a story through `winnerId`, `outIds`, `appointee` and `appointedBy` (src/director/subject-tie.ts); `governmentNews` reads the speaker's lean only when the views module is installed.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Wire to the world: the tie reads records the world already keeps, with no new record and no draw, proven in a played world. No line is added or changed.

**Done when.** At North Hornell (seed 9f8e7d6c) people offer the mutual subject in a played month; a second session plays a drawn place from all 56 (name the place and seed) and sees a person bring up a story that names them.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/subject-tie.ts, src/director/subject-tie.test.ts, src/director/asked-mutual-give-back.test.ts, src/director/asked-mutual-no-against-record.test.ts

**Notes.** Nov 16: built in this item's own PR. The two asked-mutual tests were re-pinned to seed d4 (Sidon, Mississippi); the old seeds no longer reach the question since start age 18. The asked-mutual talk is met in 4 of 9 seeds scanned over 120 days, once to three times, only as a follow-up: depth work for the Words lead. conversation-home-lines is red at every one of 7 drawn places (0 requests, line 154): not a pin job, no item yet.
