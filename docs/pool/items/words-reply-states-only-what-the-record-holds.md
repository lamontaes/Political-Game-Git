---
id: words-reply-states-only-what-the-record-holds
title: "A reply that states the player's vote or stance requires the fact that says it: the 12 uses that do not are counted and may only fall"
area: words
kind: bug
priority: 3
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
root: rc6-scenes-repeat
source: Words lead, rule 113, from the owner's play of the reporter's call, Nov 14 22:17Z
checked: M1 2026-11-14
---

**What.** After "You voted against it. Why?" the player was offered "I never had a problem with the ordinance." The player's replies that state a vote or stance say it whether or not the record agrees. Seen: a reply the player's own record contradicts.

**Cause.** Measured: of the scene-talk reply uses where the player speaks and says "I voted", "I support", "I'm against" and the like, 12 require none of the facts that say a vote or side (`voted-yes`, `voted-no`, `voted-for`, `voted-against`, `reason-last-vote`): press-comment 2, recall-confront 2, neighbor-argument 3, law-reaches 1, lobby-remembers 1, floor-debate 1, ask-support.same-party 2. `npm run words:placement` lists them.

**Fix.** A placement check (`src/english/placement-checks.ts`, words and facts in `data/english/placement-checks.json`) counts the breaks and the guard `tests/guards/english/placement-checks.test.ts` holds the count at or below its baseline so it only falls; no line is pulled. Each break then gets the matching vote or stance fact, is marked a lie where the scene reads lies, or comes out (the Words lead names who fixes each scene).

**Time box.** 2 hours, Sonnet.

**Rules.** No dice; one rule, all 56 places. No hand-written player text: this item writes no line.

**Done when.** `npm run words:placement` reports 0 breaks for this check and the baseline says 0; a second session plays a press-comment talk after a vote at a drawn place in the running game and sees the reply offered only when the player's own vote matches it.

**Waits on.** None.

**Files.** src/english/placement-checks.ts, data/english/placement-checks.json, tests/guards/english/placement-checks.test.ts, scripts/words/placement.ts

**Notes.** Filed by M1 on branch claude/words-machine-reply-states-record. Rules 110, 112 and 111 reuse the placement check file.
