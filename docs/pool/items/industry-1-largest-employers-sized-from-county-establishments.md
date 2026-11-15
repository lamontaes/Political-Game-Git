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

**Fix.** The opening sizes a sector's businesses from its county's establishments by size class: the town's share of the county's establishments, largest first, each sized from its class, so a county whose mining is two big mines opens one or two big employers, and a county of small shops many small ones. The fixed `outlets` count is deleted. Numbers come from the corpus through the committed export script, never hand-edited.

**Time box.** 5 hours, Opus, medium.

**Rules.** One rule, all 56 places: the size classes are read the same way for every county. Day one is in motion: the opening's businesses are the size a real place has. Replace, never layer: the fixed outlet counts go.

**Done when.** At Gillette WY, Lebanon KY and a third named place with seeds, the largest employer's share of jobs is printed before and after, with the county's published largest size class beside it; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees in dev mode, at a drawn place it names with its seed, the town's largest employer and its staff.

**Waits on.** Nothing.

**Files.** src/core2/town-workplaces.ts, src/core2/opening-town-jobs.ts, scripts/source/regional-money/export-town-employment.ts, src/core2/reference/town-employment.generated.ts.
