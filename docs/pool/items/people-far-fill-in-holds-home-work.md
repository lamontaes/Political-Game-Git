---
id: people-far-fill-in-holds-home-work
title: "A person filled in far from the played town holds the work their home town's counts show, and every engine reads it through one reader"
area: people
kind: bug
priority: 1
size: M
status: merged
standard: 2
root: none
claimed-by: civic roles builder
pr: 9470
after:
blocked-on:
lead: people
source: "Account lead, Nov 15, finding B on #9438"
model: sonnet
effort: medium
---

**What.** A cabinet pick drawn from another town of the state was filled in with no work, so the post ask read them as jobless and they always said yes (18 of 18 asked at Edgar, Wisconsin, lean 0.40 to 0.97). Running mates offered and people met on a trip already got the work their home town's counts show, each by its own copy of the same steps. Seen: a person asked to serve who lives elsewhere can say no for the work they would give up, and their card names that work.

**Cause.** Found in code: `seatCabinetPerson` in src/core2/modules/executive.ts filled the elsewhere candidate in with `fillInIdentity` and no `work`; `offerNewcomer` (src/core2/modules/voting.ts) and the trip in src/core2/office-day-federal-president.ts each drew work with `coarsePlace` and `metResident` and mapped it by hand; nothing in the core read the `identity:work` record, only src/bench/campaign.ts.

**Fix.** One helper, `workFromHome` in src/core2/coarse-place.ts, used by the cabinet fill-in and the running mate (the trip keeps its counted age and uses `metWork`); one reader, `workHeld` in src/core2/person-work.ts (an open job here, else the identity's work), used by the running-mate card and by the post ask's pay and own-job terms.

**Time box.** 3 hours for one session.

**Rules.** One rule, all 56 places: the work comes from each town's counts. No dice: seeded generation of who exists. Replace, never layer: the two hand mappings are removed.

**Done when.** A second session plays a governor at a small town that is not the state's seat (a drawn place, named with its seed), opens a cabinet post, asks a drawn person from another town, and sees their work on the record and a refusal when that work pays more than the post. Pinned: src/core2/far-fill-in-holds-work.test.ts at Edgar, Wisconsin.

**Waits on.** nothing.

**Files.** src/core2/coarse-place.ts, src/core2/person-work.ts, src/core2/modules/executive.ts, src/core2/modules/voting.ts, src/core2/office-day-federal-president.ts, src/core2/modules/serve-asks.ts, src/bench/campaign.ts, src/core2/far-fill-in-holds-work.test.ts (new)

**Notes.** Relatives who live elsewhere work by jobs-elsewhere with no wage kept: item people-husk-work-has-no-wage.
