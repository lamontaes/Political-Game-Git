---
id: journal-race-margin-reads-the-race-read
title: "The Journal says a race was close from the one race read, not its own margin"
area: words
kind: cleanup
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
source: Words lead, Nov 16 (the line register's leftovers deletion kept the three margin lines for this fix)
claimed-at:
checked: story builder 2026-11-16
---

**What.** The Journal decides a race was close or wide with a margin of its own, two tuned parameters, instead of the race read the concession call already uses. "It was very close." should play only when a recount is automatic, "It was close." only when a recount is offered, and "It wasn't close." goes with the wide margin. Built by the election results thread, which owns the race read.
Seen: a Journal entry after the player's race says close only where the race read offers or forces a recount.

**Cause.** Found in code: `raceMargin` in src/director/race-margin.ts (lines 37 to 41) computes the winner's lead over the second place from the result's totals and compares it with journalRaceCloseMargin and journalRaceWideMargin in src/director/data/director.json (stopgaps SG-WORDS-param-journalRaceCloseMargin and SG-WORDS-param-journalRaceWideMargin in src/director/data/stopgaps.json), while the concession call reads the race through raceReadFacts (src/director/race-turnout-facts.ts, from the election results thread's concession work).

**Fix.** Have the Journal read raceReadFacts for the player's own race: journal.election-line-own-result.it-was-very-close plays only on recount-automatic and journal.election-line-own-result.it-was-close only on recount-offered. Delete journal.election-line-own-result.it-wasnt-close, both margin parameters, their two stopgap rows, `raceMargin` if nothing else reads it, and the wide-margin claims in src/director/journal-race-margin.test.ts.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the Journal's own margin and its two parameters are deleted in the same change that reads the race read. One rule, all 56 places: the recount rule comes from each state's data row, never a named state.

**Done when.** A second session plays a drawn place from all 56 (place and seed named) through an election the player runs in, opens the Journal and sees "It was close." only where the race read offers a recount and "It was very close." only where it is automatic; src/director/journal-race-margin.test.ts checks each claim against the race read, and the two margin parameters and stopgap rows are gone.

**Waits on.** The election results thread's race read (raceReadFacts) on the Train.

**Files.** src/director/race-margin.ts, src/director/data/director.json, src/director/data/stopgaps.json, src/director/journal-race-margin.test.ts, data/english/parts/journal.json

**Notes.**

- Filed Nov 16, 2026 by the story builder for the Words lead, on the leftovers branch (words-line-register-leftovers); the three margin lines stay there until this lands.
