---
id: world-commuters-in-opening
title: "Some of the town's workers live in other places, and some residents work elsewhere, in the opening"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: jobs
model: opus
effort: medium
root: design-one-model-two-tiers
source: "gov-stopgap-budgets-faked-mechanic, found claiming it"
claimed-at:
checked: fable 2026-11-10
---

**What.** No full worker lives elsewhere and works in the town, and no resident works elsewhere: the opening treats a place's residents as its workers, and notes only that many unplaced workers commute. The commuting flows it needs are on main (world-commute-flow-data): data/source/lodes-commuting/place-commuting.json, read by src/core2/commuting-shares.ts, which gives each place the share of its residents who work in it and the share of its jobs held by people who live elsewhere. Use those shares in the opening so a place's commuters, in and out, are real workers with paychecks traced by record id. This also unblocks gov-stopgap-budgets-faked-mechanic, whose nonresident local tax and tax owed to another state cannot fire without it. The player would see it as a choice among people, never a form. Feeds: world-opening-jobs-vs-lodes-commuting and the other items that wait on it; drop it if the lead drops them.

**Cause.** Found in code: src/core2/commuting-shares.ts (`commutingSharesOf`) reads the place-commuting table but nothing outside its own test imports it, and the opening's employment pass (src/core2/opening-employment.ts and opening-town-jobs.ts) works from the town's residents as the workers. The unplaced workers are one flow per place (residents:unplaced-wages:<place>), so recording commuters with their own employers is a counted-groups change, not a data one (item Notes, Oct 18).

**Fix.** Read commutingSharesOf in the opening so that a place's workers who live elsewhere and its residents who work elsewhere are real workers with their own employers and paychecks, and delete the all-residents-live-here assumption where it stood.

**Time box.** 6 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the shares come from commuting data per place, never a named town. One model, two tiers: a counted group commutes by the same rule as a full person, times its count. Estimate, never UNKNOWN: a place without commuting data starts from the real national average marked ESTIMATED with source and spread. No dice: who commutes follows from the jobs and homes the data places, not a roll. Replace, never layer: the all-residents-live-here assumption is deleted where it stood.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`) in a drawn place (seed named in the PR body) and sees commuters in and out as real workers, the place's commuter share reported beside the place's figure from the table, and a named commuter's paycheck traced by record id; a test in src/core2 states it. On screen: nothing yet; it would show on Jobs and study, and News, and nothing there reads it. The owner plays it: a town's neighbors work in town and some residents work elsewhere.

**Waits on.** Nothing.

**Files.** src/core2/opening-employment.ts, src/core2/commuting-shares.ts, src/core2/population.ts, src/core2/data/opening-employment.json

**Notes.** The commuting flows it needs are on main (world-commute-flow-data, #5143): `data/source/lodes-commuting/place-commuting.json`, read by `src/core2/commuting-shares.ts`. Blocks gov-stopgap-budgets-faked-mechanic (nonresident local tax and tax owed to another state cannot fire without it).

Checked Oct 18 (claude/lodes-reachable), nothing built. The census LEHD LODES files are reachable from the cloud sessions' network (`https://lehd.ces.census.gov/data/lodes/LODES8/<state>/od/<state>_od_main_JT00_2021.csv.gz` and `<state>/<state>_xwalk.csv.gz` both returned 200; Vermont's pair is 1.7 MB). The crosswalk gives each census block's place (`stplc`), county subdivision (`ctycsub`, the town in New England) and county, so home-to-work flows between places can be summed for every state and D.C. from one OD file and one crosswalk each (about 150 MB for the country, read once by a script; the territories have no LODES and would start from the national figure marked ESTIMATED). The earlier notes that LODES was the blocker for this line should be read with that in mind. What stays hard is the opening side: the unplaced workers are one flow per place (`residents:unplaced-wages:<place>` in `src/core2/residents.ts`) threaded through counted households, fill-in, demotion and law reach (`unplacedWorkers`), so making them recorded commuters with their own employers is a core counted-groups change, not a data one.

Sent back 2026-10-21 from PR #5139 (branch claude/pool-commute-split): The final docs-only split is stale against current main. docs/pool/items/world-commute-flow-data.md:16 says the repository has no commuting flows, and the new parent Notes at world-commuters-in-opening.md:24 repeats that block. Main already has data/source/lodes-commuting/place-commuting.json with 31,976 place rows, read by src/core2/commuting-shares.ts, and a README with the matching SHA-256 64eb9eeee797f7e7df9d083c9ee53be54373960d579fbb31e7f9476435396a5f. The data item is already done under #5143. Reconcile the specification and historical split note with that delivered work; the new Done when at :20 also names a separate lock file, while that source directory contains only the table and README, so supply the named artifact or accurately document the existing checksum contract. Preserve current main claims and the commuter feature's named-paycheck acceptance. The body's first-line parent marker would automatically complete that unfinished feature even though the final diff only changes docs: use a truthful specification/notes scope that cannot close it. Main merged cleanly locally; no standard-gate green or implementation completion is claimed.; finish on that branch, merge main into it first.
