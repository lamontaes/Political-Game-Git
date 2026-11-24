---
id: words-seat-said-form-in-talk
title: 'Talk names a seat the way a ballot prints it ("the race for the United States Senate"), not the way a neighbor says it'
area: words
kind: wiring
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
source: Words lead on #9279 at 75f702e1 (Nov 14, ruling-part1-round2.md, point 3)
---

**What.** After a count, neighbors tell the player who won "the race for the United States Senate" and "the race for U.S. representative". That is how a ballot prints the seat, not how a neighbor says it ("the Senate race", "the seat in Congress"). A real title such as "county and prosecuting attorney" stays as it is. Seen: talking to a neighbor in the week after a November count, the result is told with the ballot's name for the seat.

**Cause.** Design: the Words lead's ruling of Nov 14, 2026 on #9279, on the words line whose design is docs/design/words-machine.md. The one seat reader (`seatSaid` in src/english/journal-words.ts, read through `seatFact` in src/director/sitting-ties.ts) has the formal form and a short second mention, but no said form for talk. #9253 solved the same need for a policy question with one said form that every talk reads. Measured: Sheridan, Wyoming (5669845), Arkadelphia, Arkansas (0501870) and Astoria, Oregon (4103150), worlds opened Oct 27, 2026 and run to Nov 10 (/mnt/project-files/words-lead/8831/part1-lines.md).

**Fix.** Add a said form of a seat to the one seat reader, taken from the office's record (its level, body and district): a federal or state body's seat said by its short name ("the Senate race", "the House seat"), and a town or county office by its title. Every talk that names a seat reads that said form; the bring-it-up result lines then use it with no change to their words. Nothing is patched in a single scene.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the said form comes from the office's record, never a named state, body or list of titles. No line changes in the banks; the fact's text changes.

**Done when.** A second session, on main, talks to neighbors in a drawn place in the week after a count and hears a federal seat said as people say it ("the Senate race"), and a town office by its title, with the place and seed named.

**Waits on.** Nothing.

**Files.** src/english/journal-words.ts, src/director/sitting-ties.ts
