---
id: core-evicted-counted-stays-counted
title: "An evicted counted household is filled in as full people, so a college town's full people triple in a year (Storrs, Connecticut, 618 s then 1,230 s a year)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: speed/evicted-stay-counted
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T14:15:52.609Z
---

**What.** Replayed alone on main 1a2fc71d6e with the Every place nightly's own seed, Storrs, Connecticut (key 0973980, world seed 808522d29c84) ran its first year in 618 s and its second in 1,230 s under the profiler (the nightly, four places at once: 530 and 1,075 s). Its full people grew from 1,747 to 5,804 in the first year and 6,574 in the second. The cause: housing-homeless.ts removeCountedHousehold fills in every member of an evicted counted household (fillInPerson, 86 s in 2025) so placeRemovedHousehold and reviewHomeless can place them by the full-person rule. Every engine that grows with full people then slows with it: in 2026, garbage collection took 282 s, campaigns 210 s and jobs 162 s. The CTO ruled on Nov 1 that an evicted counted household stays counted (OWNER-DECISIONS, Nov 1).

**Rules.** One model, two tiers: placement after an eviction, homelessness and re-housing read the counted rule times the household's weight, the same rule a full household meets, so no housing rule works only for full people. Two-level population: an evicted counted household is filled in only when it comes to matter to the player (met, clicked, in the circle). Speed: a country's year runs under 120 seconds, and full people never grow with evictions the player never sees.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Storrs, Connecticut (key 0973980) and two places drawn from all 56, place and seed named, housing never calls fillInPerson for an evicted counted household; its members are placed, counted homeless and re-housed by the counted rule times the household's weight, by housing case and status record id; the year's homeless counts and placements by place are set beside main's in the PR body with every difference named by cause; full people in Storrs after a year stay within the player's circle and the people met; and dev mode's records proof differs from main only in the housing, residents and people tables the change names.

**Files.** src/core2/housing-homeless.ts, src/core2/modules/housing.ts, src/core2/modules/residents.ts

**Notes.** Lead: speed (CTO, Nov 1). Profiles and the replay script are in the speed lead's Nov 1 channel block.
