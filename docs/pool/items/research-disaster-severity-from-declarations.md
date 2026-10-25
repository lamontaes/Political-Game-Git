---
id: research-disaster-severity-from-declarations
title: "A severe disaster is recorded from the disasters engine's own records, so home values and moving can read it"
area: core
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Two outcome-web links wait on disaster.severe, which no engine records: disaster-to-home-values (size -0.052) and disaster-to-out-migration. Their study (Boustan, Kahn, Rhode and Yanguas 2020) calls a disaster severe by deaths, 25 or more in a county within a decade, with the price effect holding from 20 to 100 deaths, and measures prices over that decade. The disasters engine replays FEMA's recorded declarations for each place, which carry damage, aid and damaged homes but not deaths. Find a sourced mapping from the records the game keeps to the study's severity (or a sourced county death record that can be added as data), and how long the effect lasts, so disaster.severe can be registered as an engine measure.

**Rules.** Research before building: the mapping and duration come from fetched, quoted sources, tagged SOURCED or ESTIMATED with their spread. Real data checks the simulation and never decides one actor's outcome. One rule, all 56 places.

**Done when.** A research note under data/research cites the sources for the severity mapping and the effect's duration; disaster.severe is defined from the disasters engine's records with those values in a parameter table; and a follow-up wiring item names the played-year test (a drawn place with a recorded severe disaster, seed named) in which the housing engine's home price and the moves engine read the factor by record id.

**Files.** data/research/outcome-web/links.json, src/core2/modules/disasters.ts

**Notes.** Filed Oct 25 by the effects lead from web-reach-places-services; see that item's Oct 24 note.
