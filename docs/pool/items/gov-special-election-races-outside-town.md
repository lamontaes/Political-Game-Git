---
id: gov-special-election-races-outside-town
title: "Special elections for state and federal seats outside the town are real races, not the registered stand-in"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A state or federal seat that does not cover the town is filled after a vacancy by the registered stand-in `SG-GOV-special-election-appointee`: on the election date an appointee is seated in the election's name. Only seats that cover the town get a real race (filing, residents deciding to run, the vote). Make the special election for a seat outside the town a real race at the coarser level the rest of the country runs at, so its winner comes from candidates and a vote, with the same filing and voting engines, and retire the stand-in.

**Rules.** Never start a parallel engine: use the elections and voting modules. Other places run at a coarser level (AGENTS.md): a counted electorate for the district, not individual voters. One model, two tiers. No dice: the winner follows candidates, views and the vote. One rule, all 56 places.

**Done when.** In a one-year run of a drawn place (name and seed in the PR body) a state legislative seat outside the town that falls vacant under a special-election rule has a contest record, candidates and a result by record id, its winner has a took-office record, and the stand-in stopgap row is resolved.

**Files.** src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/data/stopgaps.json

**Notes.** From PR 4678 (gov-vacancy-fills-leave-no-record), which gave stand-in fills a took-office record but left the race itself. See also gov-empty-special-repeats, which shares code.
