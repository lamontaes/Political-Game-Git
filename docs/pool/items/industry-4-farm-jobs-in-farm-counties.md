---
id: industry-4-farm-jobs-in-farm-counties
title: "Farm counties have farm jobs: a farm-employment row per state, spread to counties"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-3-energy-laws-reach-the-towns-plant-and-mines
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** Farms are almost missing from every town. Sioux Center IA (1973290), in one of the biggest farm counties, gets 0.8% of its jobs on farms; every other place printed gets 0.0% (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, gap 1). The laws that reach farms (groundwater, farmland, resource spending, the federal farm line) land on almost nothing. Seen: the Jobs screen and Travel in a farm county list no farm.

**Cause.** Found in code: `townEmploymentMix` (src/core2/town-employment-mix.ts:78) reads only County Business Patterns, which leaves out crop and animal production (NAICS 111 and 112); its sector 11 counts farm support, forestry and fishing.

**Fix.** One ESTIMATED farm-employment row per state (hired and self-employed farm workers), labeled "from memory; replace with BEA CAEMP25N county farm employment", with a wide spread, in a parameter table. Each state's farm jobs go to its counties by the county's share of the state's CBP sector-11 jobs (farm support follows farms), which the corpus holds. The farm kind takes them through `SECTOR_WORKPLACES`. The item industry-4b replaces the rows with BEA's county file.

**Time box.** 4 hours, Opus, medium.

**Rules.** Estimate, never UNKNOWN: each row ESTIMATED with source and spread. One rule, all 56 places: every state and territory has a row (zero only where the territory has no farms, said so). Research calibrates, never decides one farm's outcome.

**Done when.** A pinned test shows Sioux Center IA reads as a farm county: its farm share of jobs printed before and after against the row, with two more named places (a city and a mining county) where it stays near zero; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees farms on Travel at a drawn farm-county place it names with its seed.

**Waits on.** industry-3 in the order; nothing in code.

**Files.** src/core2/town-employment-mix.ts, a parameter table under src/core2/data (new), its test.
