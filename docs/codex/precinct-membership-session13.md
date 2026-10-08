# Precinct membership is saved beside town wards

Before: the town membership writer had no voting precincts or precinct populations.

After: residents can receive deterministic, saved precinct membership using compiled Census populations. Missing published VTD rows use labeled population estimates. Opening and move writers still need to call the producer; this part does not deliver the played election-night scene.

## Source and saved records

Measured: the compiler processes 52 jurisdictions and produces 29,460 place joins where VTD assignments are published. It records 104 source hashes. California, Hawaii and Oregon archives lack a VTD member; that absence remains explicit. The other four territories also require estimated precinct populations.

Inspected: `src/simulation/living-world/town-wards.ts` adds establishVotingPrecinctMembership(world, townId, reason), syncVotingPrecinctArrival(world, personId), votingPrecinctOfPerson(world, townId, personId, asOf), and votingPrecinctPlan(world, townId). Opening assigns residents in saved person order using population-share quotas. All assignments disclose the address-free estimate. Arrival preserves existing assignments. The existing census writer invokes the redraw producer only in its allowed census year.

The canonical event types are local.voting-precinct-map and local.voting-precinct-arrival. Readers return null for an absent or future map. Saved plans retain the population vintage, estimate basis and donor states. This replaces no existing ward or legislative district record.

## Checks and remaining work

Measured: five compiler checks pass. Four membership checks pass, including all 56 jurisdictions, quota bounds, save/reload, an actual recorded home move, and dated census redraws. Receipts are in docs/codex/evidence/session13-precinct-membership.

Session 7 owns opening integration; Session 6 owns canonical home writes. Their bounded calls should use these producers without another clock. Census 2020 weights do not establish historical precinct boundaries. Count grouping and result persistence are the next election-owned part. Ordinary-player clerk and election-night proof remain pending.

Method: the source join uses block population, never land area. Tests use small generated worlds and dated canonical household records. No annual benchmark was started; Session 5 retains that lane.
