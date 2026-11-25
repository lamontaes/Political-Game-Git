---
id: world-disasters-own-risk
title: "National disasters happen on FEMA's real days; they must come from each world's own exposures"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
after:
pr: 0
blocked-on:
model: sonnet
effort: medium
root: none
source: "owner's calibration answers, Nov 16, 2026: disasters come from each world's own risks, never a real year's list"
lead: world
---

**What.** Up to the end of the recorded history every world had FEMA's real disasters on their real days, so two worlds with the same laws had the same list.
Seen: dev mode's national disasters list in two drawn places.

**Cause.** Found in code: `generateMonth` in `src/core2/modules/national-events.ts` replayed the recorded disasters inside the record and only made them from the climate's levels afterward.

**Fix.** `generateMonth` always makes them from the state and hazard exposures, each starting from the world's seed (`exposure-start`) and growing with the climate's levels. Three tests that asserted real days now check an exposure row for every disaster and play on until one with aid shows, failing if none within three years (CTO line, comment 6935980417, Nov 17). The new check `national-disasters-own-risk.test.ts` is red on the old code.

**Time box.** 3 hours.

**Rules.** No dice, no real year's list, one engine.

**Done when.** A second session opens two drawn places in the running game (places and seeds named), runs a year with the same laws in dev mode and sees different disasters in each, each traced to its exposure.

**Waits on.** Nothing.

**Files.** src/core2/modules/national-events.ts, src/core2/national-disasters-own-risk.test.ts, src/core2/national-events.test.ts, src/core2/national-events-climate.test.ts, src/core2/disaster-aid.test.ts
