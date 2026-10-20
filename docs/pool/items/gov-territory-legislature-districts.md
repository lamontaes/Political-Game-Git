---
id: gov-territory-legislature-districts
title: "The four smaller territories' legislative seats are elected by their own districts with their real members"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/offices-state.ts elects every legislative seat in Guam, American Samoa, the Northern Marianas and the Virgin Islands at large, because the Census Gazetteer has no districts for them. Read each territory's election commission for its districts (Guam at large, the Virgin Islands by island, the Northern Marianas by island and village, American Samoa by county and district) and sitting members, put them in data with citations, and elect seats by district. Closes SG-GOV-territory-legislature-districts.

**Rules.** One rule, all 56 places: the territories get the same district reader as the states, from data. Research before building: each district list cites the commission page.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn territory and a seed named, a legislative seat record names its district and sitting member from data, and src/core2/offices-state.test.ts checks each of the four territories' seat count against its cited source.

**Files.** src/core2/offices-state.ts, src/core2/offices-state.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-territory-legislature-districts.
