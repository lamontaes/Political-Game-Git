---
id: words-office-labels-and-counter-seat-said-by-area
title: 'Office acts say "yes" and "abstain", a charter township is "Charter Township of Green Board", and the filing counter says "the senate in Edgar"'
area: words
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: S4 (Fix town job titles and labels)
pr: 9144
blocked-on:
source: Words lead, Nov 14 (Your office acts rows; Paris, Michigan; Edgar, Wisconsin special U.S. Senate race at the filing counter)
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** The acts rows in Your office print the stored vote word ("yes", "abstain"). A charter township's board is said "Charter Township of Green Township Board". The clerk at the filing counter says "Your name's in for the senate in Edgar." for a U.S. Senate race, and a district's seat there is "the seat". Seen: Your office, the office and meeting panels, and the clerk's counter.

**Cause.** Found in code: `officeActsOf` keeps the vote as the engine's word and the office screen prints `a.detail` as stored (`src/bench/play.mjs`); `placeOfBody` in `src/core2/offices-local.ts` matches only "Town|Village|City|Plantation|Township of"; `seatSaid` in `src/english/journal-words.ts` says any body after the first mention by its last word and the counter's `{place}` fact is always the player's town (`placeFact` in `src/director/filing-visit.ts`).

**Fix.** The vote word goes through the controls data (`officeStops.voteCast`: "Yes", "No", "Abstained"). A charter, civil or metro township is a township in `placeOfBody`. `seatSaid` takes the office record's level: a county, state or federal body is said whole every time ("the United States Senate", "the state Senate, District 17"), and the counter's place is the county or state the seat covers, none for a district's seat.

**Time box.** 3 hours, Sonnet.

**Rules.** No hand-written player text in code; one rule for all 56 places; replace, never layer.

**Done when.** Lines as played before and after at three drawn places are in `/mnt/project-files/words-lead/9108/`; tests pin Edgar, Wisconsin and Bramwell, West Virginia. A second session, on main, files for a state or federal seat and reads the full body name with the state.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/core2/offices-local.ts, src/english/journal-words.ts, data/english/seat-words.json, src/director/filing-visit.ts, src/bench/filing.ts

**Notes.** Filed by builder S4, Nov 14, with its fix. Not fixed here: the other acts details are still raw ("sign", "veto", "for", "against", "missed: at home in the district", a bare list of item numbers); a card's employer for a government payroll reads "TOWN OF RANCHESTER treasury".
