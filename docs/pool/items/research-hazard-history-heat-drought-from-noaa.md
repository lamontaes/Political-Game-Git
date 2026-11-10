---
id: research-hazard-history-heat-drought-from-noaa
title: "Heat and drought get a recorded county history from NOAA storm episodes, so the climate's heat and drought levels move something"
area: world
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc1-world-outside-town
source: stand-in triage of nation.json, Nov 10, 2026 (SG-NATION-hazard-heat-drought-history)
---

**What.** The climate keeps five hazard levels (heat, flood, storm, wildfire, drought) but a county's recorded rate comes only from FEMA declarations, which cover flood, storm and wildfire. Heat and drought have no recorded history, so warming moves nothing there. Build their county-by-season history from NOAA's Storm Events database.

**Cause.** Found in code: scripts/climate/build-hazard-history.mjs:7 names the stopgap; src/core2/data/climate/hazard-history.json lists only "flood", "storm", "wildfire" in `hazards`; src/core2/modules/climate.ts:240 reads `byCounty` and has no heat or drought rows to read. Design: owner, Nov 8 (weather is basic climate change through the effect map).

**Fix.** Fetch NOAA Storm Events episode counts for excessive heat, extreme heat and drought by county and season (cite the pages fetched, quote the field definitions), extend scripts/climate/build-hazard-history.mjs to write them into hazard-history.json under the same shape with ESTIMATED tags and their spread, read them in recordedHazardRate, and check that disasters after the FEMA record (national-events.ts and disasters.ts) do not turn each episode into a federal disaster (FEMA declared almost none). Real counts calibrate rates and never decide one actor's outcome.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: every figure from a fetched, quoted source, tagged SOURCED or ESTIMATED with its spread. One rule, all 56 places: county rows in data, no place named in logic. No dice: a level, never a roll, decides what happens. Speed: read by index, no scans.

**Done when.** A second session (not the builder) plays a one-year world in a drawn place and seed it names and sees the county's heat and drought rate print with its source, and a warming change in the effect map move that rate (by record id); a test in src/core2/climate.test.ts states the chain; SG-NATION-hazard-heat-drought-history is marked resolved.

**Waits on.** Nothing.

**Files.** scripts/climate/build-hazard-history.mjs, src/core2/data/climate/hazard-history.json, src/core2/modules/climate.ts, src/core2/climate.test.ts, src/core2/data/stopgaps/nation.json
