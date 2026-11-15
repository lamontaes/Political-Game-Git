---
id: words-sharp-reply-is-earned
title: "A sharp or refusing reply is offered only when the record earned it: the 95 shared replies that require no placing fact are counted and may only fall"
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
source: Words lead, rule 112, from the owner's play of the reporter's call, Nov 14 22:17Z
checked: M1 2026-11-14
---

**What.** The reporter's first plain question was answered by offering "Read the ordinance before you write about it." and "I'm not doing this in a hallway." The owner asked why she was so combative already. Seen: sharp and refusing replies offered after a first plain question.

**Cause.** Measured: 95 reply uses of the moves confront, blame, disagree, refuse, decline, deny and withdraw are shared (keyed routine) and require none of the placing facts pressed, tie-rival and printed-against: press-comment 49 (with its variants), owed-apology 29 (all arcs), mentor-advice 12, friend-ask 3, filing-clerk 1, ally-return 1. `npm run words:placement` lists each. The shared replies are placed by nothing, so they play after any question.

**Fix.** A placement check (`src/english/placement-checks.ts`, moves and facts in `data/english/placement-checks.json`) counts them and the guard `tests/guards/english/placement-checks.test.ts` holds the count at or below its baseline, so it only falls; no line is pulled. The reporter's-call builder sets the facts in purpose-scene.ts (pressed, tie-rival, printed-against); each use then requires one of them, or comes out. A plain "Not now." (leave, deflect) is always allowed and is not read.

**Time box.** 2 hours, Sonnet.

**Rules.** No dice; one rule, all 56 places. No hand-written player text: this item writes no line.

**Done when.** `npm run words:placement` reports 0 for this check and the baseline says 0; a second session plays a press-comment talk and a money apology at drawn places in the running game and sees no sharp reply offered at a first plain question.

**Waits on.** The reporter's-call builder's facts (pressed, tie-rival, printed-against in purpose-scene.ts).

**Files.** src/english/placement-checks.ts, data/english/placement-checks.json, data/english/line-rules.json, tests/guards/english/placement-checks.test.ts

**Notes.** Filed by M1 on branch claude/words-machine-sharp-reply-earned, stacked on #9357 and #9360.
