---
id: core-stopgap-world-races-missing-data
title: "Stopgaps in world-races (missing-data): 2 open"
area: core
kind: stopgap
priority: 3
status: in-pr
standard: 2
claimed-by: claude/pool-core-stopgap-world-races-missing-data
pr: #8626
after:
blocked-on:
milestone:
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: governing
source: "src/core2/data/stopgaps.json, src/core2/modules/world-races.ts, kind missing-data"
claimed-at: 2026-11-11T05:24:27.722Z
size: S
checked: fable 2026-11-10
---

**What.** Two missing-data stopgap rows remain on the out-of-town races: SG-GOV-world-race-lean and SG-GOV-delegate-race-size (src/core2/data/stopgaps/gov.json). This item narrows to the delegate-race size row; the lean row stays open for the district-results data and is reduced by core-race-candidates-who-runs. A territory delegate race is sized by a default rather than its votes cast. Oct 20 research found the 2024 votes cast: Puerto Rico about 1,220,000 (derived from 530,540 at 43.48 percent; the State Commission of Elections certifies the exact count), Guam about 29,300 (derived), U.S. Virgin Islands 14,167 (certified, vivote.gov), American Samoa about 9,900 (derived), Northern Mariana Islands 12,225 (unofficial).

**Cause.** Found in code: src/core2/modules/voting.ts (`racePlaces` line 3552, `statePlaces` imported at line 168 and used at lines 4265 and 4587) holds rows SG-GOV-world-race-lean and SG-GOV-delegate-race-size (src/core2/data/stopgaps/gov.json); a territory delegate race is sized by a default rather than its votes cast.

**Fix.** Size each territory's delegate race as votes cast over the state or national turnout (`cpsTurnout`) with `votes2024` set to votes cast, reading each commission's certified results first (values above are the Oct 20 research), drop `api.stopgap("SG-GOV-delegate-race-size")` and resolve that row; keep SG-GOV-world-race-lean open for the district-results data.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the five territories are sized by the same rule as states, from per-place data, and no territory is named in logic. Estimate, never UNKNOWN: a territory whose certified count is not found starts from the derived figure, marked ESTIMATED with its source. Never close a row by deleting it.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place in a year with a territory delegate race (place and seed named) and opens each territory's delegate race: its size equals votes cast over turnout, shown by race record id, and SG-GOV-delegate-race-size is resolved while SG-GOV-world-race-lean stays open for the district-results data.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/race-places.ts, src/core2/data/stopgaps/gov.json

**Notes.** First row: A race the town doesn't vote in is counted on the counted residents' engine at a coarser level (a House district's, the state's counties', a legislative district's eligible voters, voting as the town's counted residents

Oct 20, 2026 (research left for the session on claude/world-races-delegate, not built here): the 2024 delegate race votes cast found by search, with their quality. Puerto Rico: Hernández 530,540 at 43.48 percent, so about 1,220,000 cast (derived, not a reported total; the State Commission of Elections certifies the exact count). Guam: Moylan 15,422 at 52.69 percent and Cruz 13,703, so about 29,300 (derived). U.S. Virgin Islands: 14,167 votes cast for candidates in the certified count (Plaskett 10,397, Smith 2,323, Pickard 1,348, write-ins 99; vivote.gov). American Samoa: Radewagen 7,394 at 74.78 percent and Kuaea 1,840, so about 9,900 (derived). Northern Mariana Islands: 12,225 votes cast (King-Hinds 4,931; unofficial results). The wiring point is `racePlaces` in `src/core2/modules/world-races.ts`: `statePlaces(usps, eligible)` already takes a territory's eligible voters; size it as votes cast over the state or national CPS turnout (`cpsTurnout`) and set `votes2024` to the votes cast, then drop `api.stopgap("SG-GOV-delegate-race-size")`. Read each commission's certified results before calling the row resolved.

Sent back 2026-10-23 from PR #5304 (branch claude/world-races-delegate): the body lacks the required Done-when evidence table and one-year played-world reader proof by record ID; one of the two named stopgaps explicitly remains open, so route the delegate-only slice to a bounded valid item; finish on that branch, merge main into it first.
