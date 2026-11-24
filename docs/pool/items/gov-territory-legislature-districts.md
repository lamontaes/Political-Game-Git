---
id: gov-territory-legislature-districts
title: "The four smaller territories' legislative seats are elected by their own districts with their real members"
area: gov
kind: research
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** src/core2/offices-state.ts elects every legislative seat in Guam, American Samoa, the Northern Marianas and the Virgin Islands at large, because the Census Gazetteer has no districts for them. Read each territory's election commission for its districts (Guam at large, the Virgin Islands by island, the Northern Marianas by island and village, American Samoa by county and district) and sitting members, put them in data with citations, and elect seats by district. Closes SG-GOV-territory-legislature-districts.

**Cause.** Found in code: src/core2/offices-state.ts line 686 registers SG-GOV-territory-legislature-districts: the Census Gazetteer has no districts for Guam, American Samoa, the Northern Marianas and the Virgin Islands, so every seat is elected at large; American Samoa's Senate is chosen by county councils, not elected (note in data/research/offices/state-offices.json).

**Fix.** Research each territory's election-commission districts and sitting members with citations, elect seats by district through the same reader as the states, and mark American Samoa's Senate chosen so no past election is written for it.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the territories get the same district reader as the states, from data. Research before building: each district list cites the commission page.

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld) in a drawn territory and a seed named, finds a legislative seat record naming its district and sitting member from data, and src/core2/offices-state.test.ts checking each of the four territories' seat count against its cited source.

**Waits on.** Nothing.

**Files.** src/core2/offices-state.ts, src/core2/offices-state.test.ts, src/core2/data/stopgaps/gov.json, data/research/offices/state-offices.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-territory-legislature-districts.

Nov 1 evidence (governing lead, elections-past-race-votes-from-electorate on governing/past-race-votes): American Samoa's Senate is not elected by ballot. state-offices.json's own note says its 18 senators are matai chosen by county councils under Samoan custom, yet offices-state.ts seats the chamber as elected, so the opening's paper prints a past "election" for each Senate seat (Malaeloa/Ituau, seed plv-1 draw 22: 18 Senate races). When the districts are read, mark that chamber as chosen, not elected, so no past race is written for it.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have elected four territories' legislatures by their real districts; the at-large election already seats a legislature.
