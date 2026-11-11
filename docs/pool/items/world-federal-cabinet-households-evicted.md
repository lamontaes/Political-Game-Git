---
id: world-federal-cabinet-households-evicted
title: "The households of federal cabinet officials are evicted in a played year"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: found Nov 10 by the builder of the grievance record (pull request #8231)
checked: fable 2026-11-10
---

**What.** In two drawn places a played year evicted the households of federal cabinet officials, the attorney general's among them. A sitting cabinet secretary losing their home for unpaid rent in a small town is not believable, and the player can meet these people. Either they are housed in the played town when they should not be, or their pay never reaches the household that owes the rent.

**Cause.** Found in code: measured in Packwood, Washington (5352600; `drawPlace("a1b2c3d4e5f60718", "grievance-record")` as src/core2/modules/grievance.test.ts draws it; main d64255aa). The evicted officials are the outgoing federal cabinet, not the sitting one. Seven `housing.eviction` events on 2025-04-01 name official:cabinet:US:attorney-general:1, :education:1, :energy:1, :interior:2, :labor:2, :state:2 and :treasury:1. Their officials row has `ended` "2025-01-20", the opening day: 30 cabinet rows in the town's state ended that day. (1) `review` in src/core2/modules/official-pay.ts (line 447) seats only rows with `ended === null`. An ended row with no pay row is skipped, so `keepHousehold`/`giveLivingCost` (src/core2/official-living.ts) never gives the former secretary the savings and living cost a family at their pay keeps. The attorney general holds 0 dollars, no job and no pay row on Jan 21, Feb 5 and Mar 5. (2) `openMissingHomes` in src/core2/modules/housing.ts (about line 873) houses every household that arrived after the town's housing input, so the former secretary's one-person household on the state record "US-WA" gets lease:household:official:cabinet:US:attorney-general:1 from organization:landlord:US-WA at 525.76 dollars a month. With nothing to pay it, arrears reach 1,051.52 dollars by March and `remove` evicts on Apr 1. (3) A cabinet secretary is not treated as federal: its row has `officeKind` "cabinet-secretary", `bodyKind` "executive", `body` "US:cabinet-secretary" and `stateKey` "US-WA" (the player's state). `isFederal` (official-pay.ts line 103) checks only `FEDERAL_KEYS`, which lacks it, so `officialSalary` prices it as "US-WA treasurer" (154,000 dollars, the state table's fallback). The 15 sitting cabinet rows also had no pay row at the opening (0 of 15); why was not traced. The national press people placed on "US-DC" were evicted the same way in June and July (five of them).

**Fix.** In src/core2/modules/official-pay.ts: (1) In `review`, for an ended row whose person is alive and has no pay row, call `keepHousehold(api, row, officialSalary(row)?.annualMinor ?? 0)` once, so a former official starts with the savings and living cost their pay implied, as a seated one does. `giveLivingCost` already returns false for someone who has a living cost. (2) Make `isFederal` true for a row whose `body` starts with "US:", and price a cabinet secretary from a federal row: add `cabinetSecretary` to `data/research/offices/official-salaries-2026.json` `federal` from OPM's Executive Schedule Level I table (fetch and cite it), and map "cabinet-secretary" to it in `FEDERAL_KEYS`. (3) Check why the 15 sitting cabinet rows have no pay row (`seat` returns when `api.state.people.get(row.id)` is missing; see whether they are built later and paid on the next payday). If they never are, give `seat` the same fill-in the officials engine uses. (4) Read `seat` and `review` for the national press people on "US-DC" (src/core2/modules/press.ts staff): if their pay never reaches them, file it as its own item rather than widen this one.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: eviction scenes and news about federal cabinet officials' households, which no real cabinet member suffers.

**Rules.** No dice. One rule, all 56 places: nothing is fixed for one town by name. Wire to the world: an official's pay is a journal payment to their own household. This is a game: fix the cause for officials the player can meet, and add no new per-person loop.

**Done when.** A second session plays a year in Packwood, Washington (seed a1b2c3d4e5f60718, drawn with "grievance-record") and in one fresh drawn place (place and seed named). No sitting or former federal or state official's household is evicted, and the former attorney general's account shows the savings deposit (record id `savings:official:cabinet:US:attorney-general:1:<date>`) and paid rent. A sitting cabinet secretary's paycheck is a journal payment from the federal payer at the cited Executive Schedule salary, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/official-pay.ts, src/core2/official-living.ts, src/core2/modules/housing.ts, src/core2/modules/officials.ts, data/research/offices/official-salaries-2026.json, src/core2/modules/grievance.test.ts

**Notes.** Nov 11 (cause finder for Fable B): reproduced on main d64255aa with probes outside the repository (the eviction events by person, the attorney general's lease, cash and pay row month by month, and the officials table against the pay table). The households are the outgoing cabinet's, ended on the opening day, never given savings, and housed on the state record by `openMissingHomes`.
