---
id: industry-1-largest-employers-sized-from-county-establishments
title: "A town's largest employers are sized from its county's establishments, so a town can depend on one plant or mine"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** No town opens with most of its jobs at one employer. Each industry's jobs are split over a fixed number of businesses, so the largest employer anywhere is about a fifth of a town's jobs: Lebanon KY (2144344) has 44.5% of its jobs in factories split over 2 plants, and Gillette WY (5631855) 18% in one mine (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, section 3). Owner, Nov 15 21:09Z: "everyone works at the power plant... maybe that power plant closes, and then that town". Seen: Travel and the Jobs screen name the town's employers and their staff, and none is the town's main employer.

**Cause.** Found in code: `outlets` in src/core2/town-workplaces.ts:54 fixes each workplace's count (utility 1, quarry 1, manufacturing 2), and `opening-town-jobs.ts:746` splits a sector's jobs evenly over them. The county's establishments by size class are in the County Business Patterns corpus (data/source/county-business-patterns/regional-corpus.json.gz) and are not read.

**Fix.** Account lead, Nov 15 21:17Z: "a large establishment is one building in one place". The county's establishments of 100 staff or more (County Business Patterns class 100-249 and up) are each placed whole in one of the county's places, or in the county outside any town. They are sized from their class, a withheld class from what is left of the sector's county employment. The placing is weighted by the places' populations in the county-part table, by a hash of the world seed, county, sector and index (seeded generation of what exists). The town's mix is its population share of the county's small-class jobs plus every large establishment placed in it, one business each. The small classes stay spread as now. The fixed `outlets` count is deleted. Numbers come from the corpus through the committed export script, never hand-edited. In-commuters from neighboring places and naming the plant other towns' commuters go to are a later item. The ZIP-level item (industry-1b) replaces the placing rule with where plants really are.

**Time box.** 5 hours, Opus, medium.

**Rules.** One rule, all 56 places: the size classes are read the same way for every county. Day one is in motion: the opening's businesses are the size a real place has. Replace, never layer: the fixed outlet counts go.

**Done when.** At Gillette WY, Lebanon KY and a small town that hosts a large establishment, each named with its seed, a pinned test prints before and after the largest employer's share of the jobs located in town and of the town's working residents, and where the other residents work; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees in dev mode, at a drawn place it names with its seed, the town's largest employer and its staff.

**Waits on.** Nothing.

**Files.** src/core2/town-workplaces.ts, src/core2/opening-town-jobs.ts, scripts/source/regional-money/export-town-employment.ts, src/core2/reference/town-employment.generated.ts.
