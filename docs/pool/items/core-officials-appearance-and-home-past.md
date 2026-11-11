---
id: core-officials-appearance-and-home-past
title: "Officials are filled in with a stored look, a past in their home state, and the inauguration has its venue"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: CTO opening root-cause report, Oct 27
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-officials-appearance-and-home-past
---

**What.** An official is filled in with a stored look now (src/core2/state.ts `lookOf`, line 2616, used at line 2747), so the appearance part of this item is already fixed on main. Two parts remain. First, the inauguration record (src/core2/modules/offices.ts, id `inauguration:<date>`, line 851) has the player's town as its place, so nothing says where the oath was taken. Second, national officials are filled in at the player's state, so the President from Wyoming went to school in Iowa (Representative Saunders, official:term:seat:US-IA:us-house:01:2025-01-20, Iowa City, seed 28c0b8150290 was the example). Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Cause.** Found in code: src/core2/modules/offices.ts writes the `inauguration:<date>` record with `placeId: townPlaceId` (line 851), so the oath's place is the player's town. In src/core2/modules/officials.ts the national officials' deep past is placed at the player's state; re-read the function that builds it (the item's Oct 27 note cited around line 711) before changing it, because the officials file has moved since.

**Fix.** Give the inauguration record the Capitol's place. Place a national official's school and past records in the state their home-state record names, and a state official's in the seat's state. Add a test beside the officials tests (src/core2/official-living.test.ts is the nearest) that checks both in a drawn place.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the past is placed from the official's own record and read by the same engines as any resident's. One rule, all 56 places: an official's deep past is placed at their home-state record for national offices and their seat's state otherwise, never a state named in logic. Replace, never layer: no second appearance field and no second place field.

**Done when.** A second session, not the builder, plays a drawn place and a seed it chose in the played world (buildBenchWorld, or the bench with dev mode). The President's school records sit in the state their home-state record names, a state official's past sits in the seat's state, and the inauguration record's place is the Capitol's, each shown by record id. A test beside the officials tests checks all three in a drawn place and names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/modules/officials.ts, src/core2/state.ts, src/core2/official-living.test.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: m0-m2.

Released (2026-11-11): Not built. Cause holds (offices.ts recordInauguration uses townPlaceId at line 851; officials fill in at the player's state) but two parts need a decision before code: (1) no data row names the Capitol's place (federal-executive-2026.json has none) and the rules bar naming a place in logic, so a sourced capital place key must be added to data and the federal acts that also use townPlaceId (office-day-federal-president.ts lines 419, 538, 621, 945) decided together; (2) a national official's school and past follow identity.homeState through fillInIdentity (state.ts ~2627) and pastForLater, a separate change in the officials fill-in. Continue on branch claude/pool-core-officials-appearance-and-home-past.

Released (2026-11-11): Cause differs from the Fix: giving the inauguration record the Capitol's place drops it from the log, because a public record is kept only when its place is in core.visiblePlaceIds (src/core2/state.ts:745), so the press and the opening address lose it (tried: opening-story and game-start tests fail on it). The record needs a separate where-field (a fact) or the capital added to visible places, which is a design call; the national officials' school placement is untouched. Continue on branch claude/pool-core-officials-appearance-and-home-past.
