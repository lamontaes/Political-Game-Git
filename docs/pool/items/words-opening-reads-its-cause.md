---
id: words-opening-reads-its-cause
title: "A scene's opening is placed by its cause: the 16 scene types whose every narration piece is keyed routine are counted and may only fall"
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
source: Words lead, rule 110, from the owner's play of the reporter's call, Nov 14 22:17Z
checked: M1 2026-11-14
---

**What.** The reporter's call opened "The roll on {bill} is recorded." The owner could not tell what had happened. Seen: an opening that states record status, not the event.

**Cause.** Measured: 16 scene types have narration, all of it keyed "routine" (placed by no cause): press-comment and its four variants, the five owed-apology arcs, ally-return, filing-clerk, mentor-advice, care-visit, first-date, friend-ask. Four types have no narration at all (ask-signature.plain, ask-support.plain, campaign-answer, talk), listed not flagged. `npm run words:placement` lists them.

**Fix.** Saying "is recorded", "the roll on" or "on the roll" is a counted report, not a pull: the three press-comment lines that say them stay in play until the reporter's-call builder replaces them. A placement check counts the types and the guard `tests/guards/english/placement-checks.test.ts` holds the counts (16 types, 3 lines) at or below their baselines, so they only fall. Each type then gets an opening keyed to its cause that says the event in plain words; the Words lead names who writes them ("Fix the reporter's call scene" for press-comment).

**Time box.** 2 hours, Sonnet.

**Rules.** No dice; one rule, all 56 places. No hand-written player text: this item writes no line.

**Done when.** `npm run words:placement` reports 0 types for this check and the baseline says 0; a second session plays a press-comment talk and a housemate's apology at drawn places in the running game and sees each open on the event that caused it.

**Waits on.** None.

**Files.** src/english/placement-checks.ts, data/english/placement-checks.json, data/english/line-rules.json, tests/guards/english/placement-checks.test.ts

**Notes.** Filed by M1 on branch claude/words-machine-opening-reads-cause, stacked on words-reply-states-only-what-the-record-holds (#9357).
