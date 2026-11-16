---
id: gov-journal-tells-a-bill-the-chair-held
title: "A sponsor's Journal says the committee chair held their bill without a hearing"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9596
blocked-on:
source: "the Account lead, Nov 15: a held player bill got no Journal line, no scene and nothing to press"
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** When the chair of a committee holds a bill without a hearing, the record names the sponsor and puts a journal-line row on their schedule, yet the Journal says nothing, because no Journal row reads `bill-held-in-committee`. A player whose bill is held reads that it was introduced and then nothing, so the bill seems to have vanished. Seen: the played world at Texas (place 4846968, seed 8647-mason), where the state senator in seat 016 drafts a paid family leave bill, the Senate labor chair holds it on Feb 9, and the Journal lists the introduction and no hold.

**Cause.** Measured: at place 4846968, seed 8647-mason, by `npx vitest run src/director/journal-held-bill.test.ts`, the Journal composer finds the held bill's moment and drops it, because `src/director/data/journal-rows.json` has a row for `event:bill-failed` and none for `event:bill-held-in-committee`, and `data/english/parts/journal.json` has no line for it. A moment with no row or no sentence is left out by design.

**Fix.** One row in `journal-rows.json` reads the hold record's bill and chair and tells it only in the sponsor's own Journal (the record also names the chair and every committee member), and five lines from the Words lead word it, three with the bill alone and two with the chair's full name. The row is told even when the sponsor does not know the chair by name (found by play: a sponsor whose chair was a stranger told nothing), and the four orphaned memoir-hook pieces that claimed a later act of the person named ("Little did I know what {other} would do next.", "That wasn't the last I'd see of {name}.", "I would see a lot more of {name} after that.", "{name} would come back into my life.") are deleted: the composer no longer renders the hook field, so they could only mislead if it came back. No line says the bill died; a bill whose session ends still held is the existing failed-in-committee line's job.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** The Journal is a view of the committee record, so nothing new is stored. No dice: the chair's own record decides the hold. The same row serves every chamber, from data.

**Done when.** At Texas (place 4846968, seed 8647-mason) a played test by the sponsor's own presses shows the Journal of the seat 016 senator holds a line naming SB 2 and the hold, no line says it died, and the chair and the other committee members' Journals do not tell it; a second session on main, in a place and seed it names, finds a held bill's line in the sponsor's Journal.

**Waits on.** The Words lead's line on the played Journal entry. The player sees the hold in the Journal beside the introduction.

**Files.** src/director/data/journal-rows.json; src/director/journal.ts; data/english/parts/journal.json; src/director/journal-held-bill.test.ts (new)
