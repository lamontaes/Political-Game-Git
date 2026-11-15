---
id: industry-1b-plants-placed-from-zip-business-patterns
title: "Large employers are placed where they really are, from ZIP Code Business Patterns"
area: core
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-1-largest-employers-sized-from-county-establishments
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "Account lead's ruling, Nov 15 21:17Z: the ZIP-level data replaces the placing rule later; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** After industry-1, a county's large establishments are placed whole in one of its places by a seeded rule weighted by population, not where the real plant or mine stands. A town that really hosts its county's plant may open without it, and a neighbor may open with it. Feeds: industry-1-largest-employers-sized-from-county-establishments.

**Cause.** Found in code: the placing rule industry-1 adds to src/core2/town-employment-mix.ts reads only county-level data, because the County Business Patterns corpus (data/source/county-business-patterns/regional-corpus.json.gz, read by `load` in scripts/source/regional-money/export-town-employment.ts:69) is county-level. Containers here cannot reach census.gov for the ZIP file.

**Fix.** Where the network allows census.gov, fetch ZIP Code Business Patterns (establishments by size class and NAICS by ZIP), compile it with a committed script, map ZIPs to places, and place each large establishment in the place whose ZIPs hold it. The seeded placing rule stays only where a county's ZIP data is withheld, and says so.

**Time box.** 4 hours, Sonnet, medium. A container that cannot reach census.gov stops and says so.

**Rules.** Research before building: the file calibrates where plants stand and never decides an actor's outcome. One rule, all 56 places: territories without ZIP Business Patterns keep the seeded rule, said so. Data files are rebuilt by their committed script.

**Done when.** A pinned test at three named places with seeds prints each large establishment's place from the file against the seeded rule. A second session sees in dev mode at a drawn place it names with its seed a plant placed where the file puts it.

**Waits on.** industry-1; a container that can reach census.gov.

**Files.** scripts/source/regional-money/export-town-employment.ts, src/core2/town-employment-mix.ts, src/core2/reference/town-employment.generated.ts.
