---
id: journal-volunteer-sister-line-said-twice
title: "The Journal says a relative's volunteer shifts once, not as the same line twice"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: Words read of pull request 9512 at its merged head, Nov 17
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The player's Journal holds the same line twice for a sister who knocked on doors: "Because of that, my sister Jaden knocked on 45 doors for me."
Two moments of the same shift series each wrote a line with the same words and the count of doors.
Seen: Ili'ili, American Samoa, seed losslife:5, the pinned family-loss test's VOLUNTEER LINES output at head 07488dbdaf, 3 lines of which the first two were identical.

**Cause.** Measured: at Ili'ili, American Samoa, seed losslife:5, by `npx vitest run src/director/family-loss-stake-scene.test.ts` at head 07488dbdaf, the test prints VOLUNTEER LINES with two identical lines; the writer is the volunteer-shift moment in the Journal composer (`composeJournal` in src/director/journal.ts).

**Fix.** Fold the shifts of one volunteer in one race into the one line the Journal keeps (the count of doors from the record), by the moment ids the lines already carry; add the identical-line check to the played test.

**Time box.** 3 hours for a Sonnet session.

**Rules.** The chain is the acceptance: the line follows the volunteer-shift record to the Journal line and back, by record id, once.

**Done when.** A second session sees, in a drawn place where a relative volunteered (name the place and seed), that the Journal holds one line for the relative's doors, by record id, in the played world.

**Waits on.** Nothing.

**Files.** src/director/journal.ts, src/director/family-loss-stake-scene.test.ts

**Notes.** Filed Nov 17 from the Words read of pull request 9512; not fixed in that pull request.
