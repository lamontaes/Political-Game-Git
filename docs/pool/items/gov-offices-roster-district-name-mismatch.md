---
id: gov-offices-roster-district-name-mismatch
title: "Offices: Census district names that differ from the roster's seat phantom legislators"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6116
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** stateOffices in src/core2/offices-state.ts matches each Census legislative district to the Open States roster by name, and when the names differ it seats the Census district with no member (party unknown) and then seats the roster's members again under the roster name. One state's House gets 150 seats for 141 members (a Census 'State Legislative Subdistrict 1A' against the roster's '1A', and Census codes with a leading zero), one Senate 48 for 40 (hyphenated Census names against the roster's 'X, Y and Z'), and two more chambers one extra seat each ('South East' against 'Southeast'); run stateOffices over all 56 places and compare each chamber's seat count with its legal size to list them. Each phantom seat votes in its chamber with a party the officials engine can only estimate (SG-OFFICIALS-unrecorded-party), found by research-gov-sourced-parameters.

**Rules.** One rule, all 56 places: the matcher must normalize every place's district names by one rule in data or code (subdistrict words, leading zeros, hyphens against commas and 'and', compass words), never a fix for one state, and a chamber's seat count must equal its legal size from the research.

**Done when.** In buildBenchWorld for a drawn place and in a test over all 56 places, every legislative chamber whose member roster holds its legal number of members (vacant districts counted as empty seats) has exactly the legal size from data/research/offices/state-offices.json from stateOffices, and every roster member sits in exactly one seat, checked by a test in src/core2/offices-state.test.ts naming the place and seat ids. The test checks at least one chamber and lists the four chambers whose roster data itself disagrees with the legal size, so a new disagreement fails it; those four wait on gov-legislature-roster-size-data.

**Files.** src/core2/offices-state.ts, data/research/offices/legislature-party-counts-2026.json, data/research/offices/state-offices.json

**Notes.** TODO

Merger 0: Sent back 2026-10-26 from PR #6116 (branch claude/roster-district-names): legal-size assertions skip four unresolved chambers despite the all-chambers acceptance; complete the proof or assign an accurate bounded item and retain the broad item open; finish on that branch, merge main into it first.
