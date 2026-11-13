---
id: people-past-schoolmate-shown-as-at-school-now
title: 'A sister who finished school years ago shows "At school with you" on her card'
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
source: Playtester P1, Nov 13
claimed-at:
---

**What.** In Manchester, Vermont (bench seed fdbb304e-3e4b-40fb-8750-a1bba81cef52, main 5e68cde1), People, Nadia Alexander, "Sister · Age 24". Under Between us her card says "At school with you · Manchester Public Schools", while Her story on the same card says "She graduated Manchester Public Schools in 2018." The player is 17 and still in high school. Seen: the person card's Between us lines for anyone whose school years with the player ended.

**Cause.** Found in code: src/core2/shared-history.ts, `sharedHistory`, the "school years before the start" block (about line 300). Two people whose runs at a school overlapped at any time get a `schoolmate` row with no end, the same kind as two who share a school now. src/bench/card.ts (about line 1772) passes the kind through, and src/bench/data/controls.json words `schoolmate` only in the present ("At school with you").

**Fix.** In `sharedHistory`, mark a schoolmate row from past spans with the end of the overlap when either run has ended (as `coworker` rows carry `endedOn`). In src/bench/card.ts, word such a row as a past kind (for example `schoolmate-past`), as the card already does for work that ended (`worked`). The control's words for the past kind come from the Words session.

**Time box.** 1 hour for one Sonnet session.

**Rules.** No hand-written player text: the new label is a control from data. Two screens never disagree: the card's lines read the same school records as the person's story.

**Done when.** A second session, on main, starts new lives in drawn places until the player has an older sibling or neighbor who left school, opens People, and reads a past-tense school line for them, and "At school with you" only for someone in school with the player now.

**Waits on.** The Words session's label for the past kind.

**Files.** src/core2/shared-history.ts, src/bench/card.ts, src/bench/data/controls.json
