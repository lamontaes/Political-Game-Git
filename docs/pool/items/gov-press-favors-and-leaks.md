---
id: gov-press-favors-and-leaks
title: "Press favors and leaks as relationship acts and a conversation move (SG-PEOPLE-press-favors-and-leaks)"
area: words
kind: wiring
priority: 3
size: M
status: dropped
claimed-by:
pr: #5606
blocked-on:
after: people-interview-screen
standard: 2
lead: governing
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A reporter's closeness to a candidate gives access and gentler copy, but a candidate cannot do a reporter a favor or leak them a story, and a reporter cannot hold a story back for a friend. Build a leak as a conversation move that puts a record on the reporter's wire with the leaker named in their knowledge, and favors as relationship acts that the reporter's drives and closeness read, in src/core2/modules/press.ts.

**Cause.** Found in code: src/core2/modules/press.ts has the stopgap marker SG-PEOPLE-press-favors-and-leaks at line 1917 (reporter choice by closeness only) and a leak function leakToReporter (line 2787), but no favor act exists; SG-PEOPLE-press-favors-and-leaks and SG-PEOPLE-press-endorsements (marker at line 3585) are open in src/core2/data/stopgaps/people.json.

**Fix.** Add favors as relationship acts that the reporter's drives and closeness read, move a held story only from those reads, connect the existing leak to the player's conversation, and close the favors-and-leaks row. Also confirm SG-PEOPLE-press-endorsements (built in #5581) and resolve that row with its reader named. This item takes the dropped gov-stopgap-press-missing-mechanic.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text; no dice (the reporter's traits, drives and closeness decide whether a leak runs); an effect is a read; replace never layer.

**Done when.** A second session finds SG-PEOPLE-press-favors-and-leaks resolved in src/core2/data/stopgaps/people.json and, in a played year of buildBenchWorld in a drawn place (seed named), a leak reaching a reporter's wire with the leaker named and a favor moving the reporter's closeness, each followed to a printed story by record id.

**Waits on.** people-interview-screen (open).

**Files.** src/core2/modules/press.ts, src/core2/data/stopgaps/people.json

**Notes.** TODO

Sent back 2026-10-20 from PR #5606 (branch claude/press-favors-leaks): edits src/director/press-interview.ts (Words-session area) and adds a dated 'Done Oct 20' note in the stopgap resolution text; stacked on #5602, which was sent back for the same reasons; finish on that branch, merge main into it first.

Oct 25 audit: From the dropped people-favors-and-leaks-stopgap-sg-people-press: leakToReporter is on main (PR #5163); press-owners.test.ts must not return early when the story is already in print.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added a leak to a reporter as a move in a talk; no ruling asks for it. The owner can ask for it back.
