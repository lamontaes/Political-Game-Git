---
id: core-stopgap-counted-groups-faked-mechanic
title: "Stopgaps in counted-groups (faked-mechanic): 1 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr: #4500
blocked-on:
after: core-counted-views-delete
milestone:
source: "src/core2/data/stopgaps.json, src/core2/counted-groups.ts, kind faked-mechanic"
claimed-at: 2026-10-20T00:26:28.869Z
---

**What.** The stopgap row(s) SG-CORE-counted-person-views in src/core2/counted-groups.ts mark a shortcut that is still live in play. Today engines that read counted people one by one (jobs, business, campaigns, retirement claims, housing, place prices, candidacy) get a person or household record built on demand from the counted group's packed columns by a stand-in. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: a counted member is read with the same rule as a full person and a filled-in person matches the group's records. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a counted member read by the jobs and housing engines and the same person after fill-in agree on job, pay and home by person record id and group id, named by record id. The test in src/core2/counted-groups.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: click a neighbor who was only a count and see the job and home the town's records gave them.

**Files.** src/core2/counted-groups.ts, src/core2/data/stopgaps.json, src/core2/counted-groups.test.ts

**Notes.** First row: Engines that still read counted people one by one (jobs, business, campaigns, retirement claims, housing, place prices, candidacy) get a person or household record built on demand from the counted group's packed columns,

**Split (Oct 15).** The row names seven engines, so the claiming session split the item by engine: `world-counted-reads-jobs`, `world-counted-reads-business`, `world-counted-reads-housing`, `gov-counted-reads-campaigns`, `gov-counted-reads-retirement-claims`, `core-counted-views-delete`. The item is done when the last one is.

Oct 20: Switched from blocked to the automatic after: gate on core-counted-views-delete, so it opens by itself the moment those items are done.
