---
id: press-address-ties-break-on-the-alphabet
title: "The President's address ties a cabinet nomination on the national desks and loses on the alphabet"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-opening-address-leads-with-the-presidents-own-causes
blocked-on:
lead: laws
model: opus
effort: medium
root: rc1-world-outside-town
source: the federal views helper, Nov 11, 2026, tracing the red press check in src/director/opening-story.test.ts
checked:
claimed-at:
branch:
---

**What.** In Arrowhead Springs, Wyoming (seed `da5c1844fcee4270`), every national outlet printed a cabinet nomination instead of the President's inaugural address in the week of January 27. The address stays fresh for 14 days, so it had two chances, and lost the second to another state's law until that half was fixed. So the opening-story check "is printed by the press as national news within weeks" stays red after press-other-place-law-involves-no-one. Seen: the national stories in dev mode's news in a new life's first two weeks.

**Cause.** Found in code: the address's wire item takes the default topic in `wireItem` (src/core2/press-topics.ts), its kind `president.address`, so the readers' care term in `runDesk` (src/core2/press-desk.ts) adds nothing. It and a cabinet nomination each name one high official, both score 1.693, and the sort breaks the tie on the id, so `cabinet-nominated:` comes before `president.address:`.

**Fix.**

1. The address event carries its first policy point as its topic: one line in `recordOpeningStory` (src/director/opening-story.ts), the question of the address's first stand, so the national desk weighs the readers' care for it as it does for a bill.
2. The press desk never breaks a tie by the alphabet: between equal scores, the record more people witnessed leads (the event's witnesses), then the earlier date, and only then the id.

**Time box.** 2 hours.

**Rules.** No dice: the order comes from the records, never a draw. One rule, all 56 places: nothing names a place. Replace, never layer: the sort's tie rule changes in place.

**Done when.** src/director/opening-story.test.ts passes on a fresh draw and on Arrowhead Springs, Wyoming (seed `da5c1844fcee4270`) and Carnuel, New Mexico (seed `12aef90a529b9e19`). A second session on main, in a drawn place it writes down with its seed, reads the national stories of a new life's first two weeks in dev mode and finds the President's address printed.

**Waits on.** words-opening-address-leads-with-the-presidents-own-causes and #8743, so one writer is in the address file at a time.

**Files.** src/director/opening-story.ts, src/core2/press-desk.ts, src/core2/press-topics.ts

**Notes.** Found while tracing the red; the other half is press-other-place-law-involves-no-one (#8761).
