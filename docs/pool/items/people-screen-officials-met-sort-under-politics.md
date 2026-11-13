---
id: people-screen-officials-met-sort-under-politics
title: "People lists a board member the player met at public comment under Politics, not Other"
area: people
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
effort: low
root: none
source: added with npm run pool -- add
---

**What.** A member of a council or county board whom the player met at public comment shows on the People screen under Other, with no group, because the meeting writes a plain contact tie and the screen sorts only by tie kind. The player has no cue that the person is an official, and the Politics group stays empty. Seen: the People screen's roster, where a seated member the player has met sits under Politics. The label for the group is Fable A's to word. Seen: the People screen roster, where officials the player has met sit under Politics.

**Cause.** Found in code: src/bench/card.ts line 86, groupsOf, returns a group only for tie kind family, coworker, friend or politics, a relation word or a shared home; a contact tie returns none, and src/bench/ui/people-screen.mjs line 12, groupOf, then files the person under other. Played check South Woodstock VT, seed d9e1, Nov 13: the three board members met at public comment each came back with kind contact and groups empty.

**Fix.** In groupsOf (src/bench/card.ts line 86) add politics for a person who now holds a seat in an elected body, read from the office-holder record, not from the tie, so a member stays under Politics whatever last changed the tie. Do not add a tie kind and do not rewrite the meeting. Fable A words the group label if it changes.

**Time box.** 2 hours

**Rules.** Replace never layer: one grouping rule in groupsOf, no second sorter in the screen. Wire to the world: the group reads the office-holder record that another engine writes. Player-screen-text: the label is a worded control name.

**Done when.** A second session sees it in the running game: in a played year in a drawn place and seed the builder did not choose, after a resident has met the seated members of their town board, the People screen lists each of them under Politics, and a guard or test names the office-holder record the grouping reads.

**Waits on.** Nothing

**Files.** src/bench/card.ts, src/bench/ui/people-screen.mjs
