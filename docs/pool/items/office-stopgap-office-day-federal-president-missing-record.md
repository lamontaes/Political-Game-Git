---
id: office-stopgap-office-day-federal-president-missing-record
title: "Stopgaps in office-day-federal-president (missing-record): 2 open"
area: office
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr: #5124
blocked-on:
after: world-other-places-coarse-population
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-federal-president.ts, kind missing-record"
claimed-at:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
lead: governing
size: M
checked: fable 2026-11-10
---

**What.** When a president visits another town, the person they meet is a recorded identity with no household, job or records beyond the meeting (SG-OFFICE-FED-trip-residents). Fill in that person from the other place's coarser counts, as the player's own town does, so they have a job, pay and family that match what the place's records say. The situation-room row of this item is already resolved. The player notices meeting a real resident of another town with a job and a family.

**Cause.** Found in code: src/core2/office-day-federal-president.ts line 849 calls api.stopgap("SG-OFFICE-FED-trip-residents"); the row is at src/core2/data/stopgaps/office.json line 123. The other row, SG-OFFICE-FED-situation-room, was resolved when the situation room began opening on FEMA disaster records.

**Fix.** Fill in a person met on a presidential trip from that state's cell in the country tier, by the standard fill-in rule, with a job and pay that agree with the cell (docs/design/country-tier.md, section 7, "Results first": a person met in another state is filled in from their cell). Seed them from the world so the same person comes back, and mark the row resolved.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a person met in another place is filled in from that place's counted population by the same rule, matching what the records already say about their job and pay. No dice: who is met follows the records. One rule, all 56 places: no place is named and other places are kept coarser. Placeholders: the row closes only when the real record exists. Speed: filling in happens when the player meets the person.

**Done when.** A second session plays a President on a trip in a one-year run of the played world (buildBenchWorld, a place drawn from all 56 and a seed the builder did not choose, both named in the PR body), meets a resident, and sees a household, job and pay consistent with that other town's counts, by person and place record ids. SG-OFFICE-FED-trip-residents is resolved in src/core2/data/stopgaps/office.json. Tests sit beside src/core2/office-day-federal.test.ts.

**Waits on.** Nothing. (world-other-places-coarse-population, which it once waited on, was replaced by the country tier.) The state cells are on main (`stepCountry` in src/core2/country-model.ts, read through `countryStateNow` in src/core2/modules/macro.ts).

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps/office.json, src/core2/office-day-federal.test.ts

**Notes.** First row: The people a traveler meets in a town other than the player's are recorded identities of that place (drawn from the world's seed and the town), with no household, job or other records there beyond the meeting.

Oct 20 (cto): PR #5124 merged. SG-OFFICE-FED-situation-room resolved (situation room opens on FEMA disaster records, daily brief observes crisis). SG-OFFICE-FED-trip-residents remains open.

Deferred Oct 25: nothing on screen reads it yet.

**Notes (depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given the resident a president meets abroad a job and family, but it only shows when playing as president, which early access does not wait for.
