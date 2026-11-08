---
id: elections-out-party-fields-district-seats
title: "The out-party fields a candidate for the town's House and legislative seats, from candidacy, not a stand-in"
area: elections
lead: elections
kind: bug
priority: 2
size: M
status: open
blocked-on:
source: Elections, Nov 8 replay (PR #7649)
---

**What.** At Castanea, Pennsylvania (seed t5) 7 people filed for the U.S. House seat and all 7 were Democrats; 6 lost the primary and the general ballot had one name. The same shape at Royal Hawaiian Estates HI (y1) and North Haverhill NH (x9). Across 15 drawn places 5 of 15 House generals had one major party (Ballotpedia: 0.087 of House seats with no major-party competition, in `benchmarks.json`). Statewide races get a stand-in nominee for each major party (`fileStandingCandidates`, stopgap `SG-GOV-who-runs-stand-in`), but a district seat does not (`contest.district` returns early), and the party ask (`partyProspects`) draws only from the town's own named members.

**Rules.** No dice and one engine: the out-party's candidate comes from candidacy's own reasons (a party ask drawing on the state's pool of people with standing, `standingPool`, by the same chooser), never a widened stand-in for district seats. Ranges are checked against, never steered to.

**Done when.** In played years at five places drawn from all 56 (names and seeds printed), a House seat's general ballot has both major parties wherever the state's pool holds a member of the out-party who clears the chooser, each filing's recorded reasons and party ask named by record id, and the House no-competition share is reported next to 0.087 with the cause of any gap.

**Files.** src/core2/modules/candidacy.ts (`partyProspects`), src/core2/modules/voting.ts (`fileStandingCandidates`)

**Notes.** Elections, Nov 8: probe `scripts/dev-tests/zero-general.ts <seed> 2` prints every filing's party and status on a one-name ballot.
