---
id: industry-4b-farm-jobs-from-bea-county-file
title: "Replace the estimated farm-employment rows with BEA's county farm employment"
area: core
kind: research
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: industry-4-farm-jobs-in-farm-counties
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** The farm-employment rows of industry-4 are ESTIMATED from memory by state and spread to counties by farm-support jobs. A county whose farms hire little support work reads too few farm jobs, and one with much reads too many. The farm laws then land on the wrong counties. Feeds: industry-4-farm-jobs-in-farm-counties.

**Cause.** Found in code: `townEmploymentMix` (src/core2/town-employment-mix.ts:78) has no farm source of its own; containers here cannot reach bea.gov to fetch CAEMP25N (survey: /mnt/project-files/account-lead/t54-industry-gaps.md).

**Fix.** Where the network allows bea.gov, fetch CAEMP25N (farm employment by county), compile it with a committed script into the generated county table, and read it in place of the state rows. The rows are deleted in the same change.

**Time box.** 2 hours, Sonnet, medium. A container that cannot reach bea.gov stops and says so.

**Rules.** Research before building: the BEA file calibrates the county mix and never decides one farm. Data files are rebuilt by their committed script, never hand-edited.

**Done when.** A pinned test prints the farm share at Sioux Center IA and two named places is printed from the file against the old rows. A second session sees in dev mode at a drawn farm-county place it names with its seed the farm jobs cited to BEA.

**Waits on.** industry-4; a container that can reach bea.gov.

**Files.** src/core2/town-employment-mix.ts, scripts/source/regional-money/export-town-employment.ts, src/core2/reference/town-employment.generated.ts.
