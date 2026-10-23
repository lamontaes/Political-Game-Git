---
id: gov-offices-roster-district-name-mismatch
title: "Offices: Census district names that differ from the roster's seat phantom legislators"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** stateOffices in src/core2/offices-state.ts matches each Census legislative district to the Open States roster by name, and when the names differ it seats the Census district with no member (party unknown) and then seats the roster's members again under the roster name. Maryland's House gets 150 seats for 141 delegates (Census 'State Legislative Subdistrict 1A' against roster '1A'), the Massachusetts Senate 48 for 40 ('Berkshire-Hampden-Franklin-Hampshire District' against 'Berkshire, Hampden, Franklin and Hampshire'), the Massachusetts House 161 for 160 and the Vermont Senate 31 for 30 ('Chittenden South East' against 'Chittenden Southeast'). Each phantom seat votes in its chamber with a party the officials engine can only estimate (SG-OFFICIALS-unrecorded-party), found by research-gov-sourced-parameters.

**Rules.** One rule, all 56 places: the matcher must normalize every place's district names by one rule in data or code (subdistrict words, leading zeros, hyphens against commas and 'and', compass words), never a fix for one state, and a chamber's seat count must equal its legal size from the research.

**Done when.** In buildBenchWorld for a drawn place and in a test over all 56 places, every legislative chamber's seat count from stateOffices equals the size in data/research/offices/state-offices.json and every roster member sits in exactly one seat, checked by a test in src/core2/offices-state.test.ts naming the place and seat ids.

**Files.** src/core2/offices-state.ts, data/research/offices/legislature-party-counts-2026.json, data/research/offices/state-offices.json

**Notes.** TODO
