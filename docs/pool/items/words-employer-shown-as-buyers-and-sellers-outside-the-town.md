---
id: words-employer-shown-as-buyers-and-sellers-outside-the-town
title: "A new coworker works at 'Buyers and sellers outside the town', and a candidate 'works as police chief at CITY OF DANVILLE treasury'"
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
root: rc4-hand-written-words
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** A scene opens 'Lucia Nelson just started at Buyers and sellers outside the town doing the same job you do', and she asks 'you do the same job I do at Buyers and sellers outside the town'. The ballot's 'What I know about them' says 'Christopher Salas / Works as police chief at CITY OF DANVILLE treasury.' Both are record names, not the names a person says. Seen: the new-coworker scene (Feb 2 and Jul 30, 2025) and the ballot's side panel on election day.

**Cause.** Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); Advanced start as Quinn Pugh, whose job is at the counted outside-market employer. Found in code: not yet; the scene and the ballot panel print the employer organization's stored name, which for the outside market and a government treasury is a bookkeeping name.

**Fix.** Say an outside-the-town employer as the work and the place ('a warehouse in Burlington', from the record's county and industry) and a government employer as its department ('the Danville police'), from the English engine's banks. List the lines needed for the Story session.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Screens show record data only through worded labels (player-screen-text).

**Done when.** A second session plays a life on main in a drawn place, named with its seed, where someone works outside the town, and no scene or panel prints 'Buyers and sellers outside the town' or a treasury as a workplace.

**Waits on.** Fable A's read of the new employer words (Words session).

**Files.** src/bench/legislature.ts, src/bench/ui/ballot-paper.mjs
