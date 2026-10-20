---
id: gov-other-state-legislatures
title: "Every state's legislature exists as offices and sitting members, so the Politics screen can list any state's legislators"
area: gov
kind: feature
priority: 3
size: L
status: claimed
claimed-by: claude/state-legislature-seats
pr: #5277
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:45:28.676Z
---

**What.** The offices engine seats only the legislature of the player's own state (a drawn place in Indiana had 150 serving members, and no other state had any: one state's offices and terms in the whole world). Congress exists for every state, and the officials engine fills in a few other states' leaders, but no other state's lower and upper houses exist as offices, seats and terms. So the Politics screen cannot list another state's legislators, which the owner asked for on Oct 16 (item play-politics-division-filter). Seat each state's chambers at the opening at the coarser level the Keep-it-simple rule allows (seat counts, parties and terms from the researched party counts in data/research/offices/legislature-party-counts-2026.json; named members filled in only when clicked), through the same offices engine, so any state can be shown and its members open as full people when met.

**Rules.** One rule, all 56 places: the same offices module seats every state's chambers from data, with no state named in code. Two tiers: a counted member is read by the same rules as a full one, times their count where grouped. Speed: a year stays within 20 percent of its base. Estimate, never UNKNOWN: where a state's party split is missing, start from the real average and mark it.

**Done when.** In a played world (buildBenchWorld, a drawn place from all 56, seed named) the offices table holds a chamber with serving terms for each of the 50 states and the territories that have a legislature, the seat counts match the researched table, and the Politics screen filtered to another state lists that state's members. A test in src/core2/ names the place and seed.

**Files.** src/core2/modules/offices.ts, src/core2/modules/officials.ts, src/core2/data/offices/, src/bench/government.ts

**Notes.** Found Oct 17 while taking play-politics-division-filter: counted the offices and serving terms in a drawn world (St. Anthony, Indiana, seed legdiag): one state's legislature, 150 members. The Politics filter item depends on this.

**Update Oct 17 (PR #4849).** Wrong in part: `officesOfState` already creates any state's chambers, seats and serving terms the first time that state is asked for, so the Politics State picker lists any state's members now. What remains is only the done-when line's "the offices table holds a chamber for each state at the opening": decide whether seating all states up front is worth its cost (a year must stay within 20 percent), or whether on-demand is the accepted design and this item can be dropped. Check also that the seat counts and party split on demand match `data/research/offices/legislature-party-counts-2026.json`.

Sent back Oct 20 from PR #5277 (claude/state-legislature-seats): The new test in src/core2/offices.test.ts failed on drawn state US-ME (seed 7f75fb66d78d47e6d17be3d19e33687c24f283bf59c112baee4701c938063ca4): expected 151 to be >= 153. Maine's lower chamber seats 151 members, but legislature-party-counts-2026.json records 153 members. Resolve the data or test assertion before merging.

