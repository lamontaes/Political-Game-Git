---
id: world-towns-open-with-businesses-their-workers-fill
title: "Towns open with as many businesses of each kind as their workers fill, and buyers keep a regular seller"
area: world
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude-world
pr: 9784
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 ("it's just a bunch of kitchens and markets"), crew line #9747 item 6a; carries draft #9670
---

**What.** Every town opened with three stores, three restaurants and one clinic, whatever its size, so a big town's work was thin and Travel listed little. The count of each kind should come from the town's workers in that kind. Seen: owner playing, Nov 16; Danville, Virginia opened with 3 stores for thousands of workers.

**Cause.** Found in code: `src/core2/town-workplaces.ts` carried a typed `outlets` count per kind, and `censusScale()` in `src/bench/world.ts` scaled households but not businesses, so the opening never sized businesses from the town's own workers.

**Fix.** `src/core2/town-establishments.ts` sizes each kind from the town's workers over the county's usual business size (Census 2023 County Business Patterns), `opening-town-jobs.ts` and `population.ts` open the town with that many, and `src/core2/regular-seller.ts` gives each household and business one regular seller per kind. The player sees many more businesses in Travel and the town's work.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** The `wire-to-the-world` rule applies: each business is a record that employs and sells, read by the money and jobs engines. No dice: counts come from the Census size and the seller pick from the world's seeded unit by capacity, as generation of who exists.

**Done when.** In a drawn place and a seed the builder did not choose, a town's count of each kind equals its workers over the county's usual size, shown in `src/core2/town-establishments.test.ts`; a second session sees many businesses in Travel and in dev mode's Businesses view.

**Waits on.** Nothing.

**Files.** src/core2/town-establishments.ts, src/core2/regular-seller.ts, src/core2/opening-town-jobs.ts, src/core2/population.ts, src/bench/world.ts

**Notes.** Carries #9670's work by net diff onto main (its Train base is in main). Replaces #9670.
