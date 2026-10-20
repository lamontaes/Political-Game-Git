---
id: core-opening-counts-from-census
title: "County and state counted population at the opening come straight from the census"
area: core
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/opening-counts-census
pr:
after:
blocked-on:
source: "owner ruling Oct 19; PR #5039's question"
claimed-at: 2026-10-19T21:04:27.728Z
---

**What.** The county and state counted population at the opening are generated straight from the census tables for the place, varying per world by seed, not seeded from residents' relatives. Owner, Oct 19: "Straight from the census. It'll be variable again; it just depends on the simulation." The relatives path is removed, not kept beside the new one (replace, never layer), and the opening gets faster because the counted tiers no longer walk every resident's kin. Residents still have relatives; the relatives are no longer what the county and state counts are built from.

**Rules.** One model, two tiers: counted groups match the census for the place at the coarser tier, by the same rule the town's own people follow. Seeded generation of who exists is allowed; nothing after day one is a draw, so the seed sets the counts and the year never redraws them.

**Done when.** A drawn place opens with county and state counts that match its census tables within the stated spread, two seeds of the same place differ in their counts, the opening time is measured before and after on the same base and reported in the PR, and a test names the place and seed and asserts the match. The owner plays it: the county and state around the town are the size the census says, and a new game is not the same as the last.

**Files.** Find the opening population builder: grep `relatives` in src/core2/opening*.ts or src/core2/town-*.ts and name the real path in the PR.

**Notes.** PR #5039 asked whether the counted tiers should be seeded from relatives; the owner answered from the census. Ruling in OWNER-DECISIONS.md, Oct 19.

Measured Oct 19 (claude, nothing built). In Guernsey, Wyoming (place 5634320, seed `census-counts`, `buildBenchWorld` two-level) the counted population by place at the opening is the town 1,025, a second place 3,051 and a third 1,418; the real county (Platte) holds about 8,600 people and the state about 580,000. The county and state rows are the relatives' households: `buildOpeningKin` in `src/core2/opening-kin.ts` gives each kin household a `placeId` of the county or the state (lines 457 to 462), and `collapseToTwoLevels` counts every household by its place (`residentCounts` in `src/core2/modules/residents.ts`), so those two tiers hold only people somebody in town is related to, older than a census cohort and far under its size. The counted rows are full counted households (wage and purchase flows, an account per place), each standing for `weight` households, so a census-sized tier needs representative households with weights that sum to the census figure, not relatives. Two pieces: (1) a generator of representative county and state households from the census age and household tables, weighted to the place's census population and varying with the world seed; (2) the kin builder keeps relatives as husk people but places no counted household for them. Piece (2) is the same cut as `core-light-opening-kin-only-kept`. Start with (1), checked against `data/research` county population (`BASES.countyPopulation2024`) and the state's ACS age table.
