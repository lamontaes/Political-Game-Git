---
id: world-county-opens-almost-jobless-in-the-counts
title: "The vital-statistics tool reads a county as jobless because it skips the county sample's employment rows"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: haiku
effort: low
root: design-one-model-two-tiers
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 7, "The long world stops making sense")
checked: fable 2026-11-10
---

**What.** The crew's vital-statistics tool reads 1.6 to 6 percent of adults at work at the opening, and 98 percent of households in poverty. The world is not like that: the town and its nearby places open with about two thirds of adults at work, and the county's sampled workers are carried as county employment rows that the tool never counts. Make the tool count them, and stop it calling the county's unpaid records poor. The town's own Metrics tab reads the town alone and is already right. Guards: the vital statistics the crew reports to the owner after a played run, which said the county was jobless.

**Cause.** Measured: Townsend, Delaware (place key 1072510, world seed 50a1b5116b69667928c30949d59ec893d9b92d60fa285085a628ee8fd0377f1a, `buildBenchWorld` with `twoLevel`) on main d64255aa, at the opening, by place. The town (1,006 records, weight 1) has 553 counted jobs plus 829 unplaced workers on 2,010 adults, 69 percent. The second place (3,867 records, weight 1) has 2,873 unplaced workers on 4,328 adults, 66 percent. The county (2,554 records standing for 251,495 households and 399,755 adults) has no jobs and 16 raw unplaced workers (2,065 weighted). But its records carry 153 county employment rows (`CountedHousehold.employment`, the county sample's employer by sector, stopgap SG-LIVES-county-sample-employers), which are 254,073 workers weighted, 64 percent. Found in code: `vitals` in scripts/dev-tests/vitals.ts (line 219) adds `residentCounts` workers, the weighted `unplacedWorkers` and full workers, and never reads `employment`. So it printed 6,392 workers on 406,214 adults (1.6 percent). The same households have no pay flow (the stopgap's own words: "no wage flow, payroll or job record"), so `householdIncome` reads them as zero, and the tool's poverty share reads 98.4 percent. The engines that need the county's workers already count them: `residentsPart` (src/core2/modules/residents.ts, the `county` branch at about line 2559) feeds them to the state's figures. The Metrics tab's `townJobsPanel` (src/core2/modules/world-panels.ts) reads the town's place alone, where the share is right. The earlier lead (`collapseToTwoLevels` sizing by `options.weights`) is not the cause: the county's records carry their weights.

**Fix.** In scripts/dev-tests/vitals.ts: (1) Count each counted household's `employment` rows times its weight as workers, beside the unplaced workers (one row is one worker; skip a member who also holds a counted job). (2) Report poverty only over households whose income the engines model. A household whose only work is a county employment row has no pay flow by design (SG-LIVES-county-sample-employers), so count it out of the poverty share and print how many were left out. (3) Add a unit test beside the tool, or extend an existing one, that builds a drawn place and checks the opening's share of adults at work is between 40 and 85 percent. Giving the county's workers real pay is that stopgap's replacement, not this item.

**Time box.** 2 hours for one Haiku session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a place's adults at work start from its real average with a per-world spread, marked as an estimate with its source, never from near zero. One model, two tiers: a record that stands for many households holds jobs for all of them, by the same rule as one household times its count. One rule, all 56 places: the county's rate comes from its own data row, never a named place. Owner, November 8: "ranges aren't targets"; this sets the opening only, and nothing pulls the figure back to a real level after day one.

**Done when.** A second session runs the vital-statistics tool at the opening in two drawn places (place and seed named), Townsend, Delaware (1072510) among them, and reads about two thirds of adults at work, with poverty printed over modeled households and the number left out beside it. In the running game the Metrics tab's People at work for the town matches the tool's town line. The new test passes.

**Waits on.** Nothing.

**Files.** scripts/dev-tests/vitals.ts, src/core2/modules/residents.ts, src/core2/modules/world-panels.ts, src/core2/data/stopgaps/lives.json

**Notes.** From the Fable audit, Pillar 7. Measured there: the Wickliffe, Oklahoma world's jobs broken down household by household for the first year. The audit did not look up which place each of the world's three place records is, and did not find why the county is nearly jobless; the question in What is its open question. Helper's check on main, Nov 10 (a run of `scripts/dev-tests/drift-played.ts` at the opening and a read-only breakdown by place; drawn place Townsend, Delaware, place key 1072510, world seed 50a1b5116b69667928c30949d59ec893d9b92d60fa285085a628ee8fd0377f1a): the tool read 1.6% of adults at work and 98.4% of households in poverty on day one. By place: the town's 1,006 households held 553 recorded jobs and about 829 share jobs for 2,010 adults; a second place's 3,867 households held no recorded job and about 2,873 share jobs for 4,328 adults; the third place's 2,554 records, standing for 251,495 households and 399,755 adults, held no recorded job and about 2,065 share jobs. So recorded jobs exist only in the played town, and the large surrounding place's share is about the size of its sampled records, not of the households they stand for. A lead from reading the code, not confirmed by a run: `collapseToTwoLevels` counts each place's adults in the sampled homes and multiplies by `options.weights?.[placeId] ?? 1`, so a place whose weight is carried on each household record instead of in that table is sized as if every record stood for one household. Related: `jobs-counted-household-job-share-runs-away` (what happens to these counts over the years), `world-opening-jobs-vs-lodes-commuting` (blocked) and `world-commuters-in-opening` (open), which change how the town's own residents are split between town firms and work elsewhere.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Wickliffe, Oklahoma opening, count jobs and working-age adults per place before and after `collapseToTwoLevels` (src/core2/residents.ts line 309) and at `openingUnplaced` (src/core2/modules/residents.ts line 565), and see at which step the surrounding places' adults lose their jobs or never get them. The fix then gives each place its employment from its own data row with a per-world spread, by the same rule as a full household.

Nov 11 (cause finder for Fable B): measured on main d64255aa with a probe outside the repository that split the opening's records by place. The county is not jobless: its workers are county employment rows that only the vitals tool skips. Its poverty reading comes from those rows having no pay, which is the registered stopgap. I did not rerun Wickliffe, Oklahoma; the same three-place shape is expected there.
