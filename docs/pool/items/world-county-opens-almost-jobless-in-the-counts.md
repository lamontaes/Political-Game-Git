---
id: world-county-opens-almost-jobless-in-the-counts
title: "The counted records for a town and its county open with about 6 jobs for every 100 working-age adults (Wickliffe, Oklahoma: about 1,550 jobs for 25,600 adults)"
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
model: opus
effort: high
root: design-one-model-two-tiers
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 7, "The long world stops making sense")
checked: fable 2026-11-10
---

**What.** At the opening the counted records cover the played town and the county around it, and almost nobody in them has a job. Measured in Wickliffe, Oklahoma (seed 8832429ff1e53841): 2,339 records standing for about 19,100 households, whose 25,600 working-age adults hold about 1,550 jobs between them, or 6%. That agrees with the crew's vital-statistics tool, which read 5.7% of adults at work at the opening. No real county looks like that, and every reader of the counts starts from it: the Metrics tab, household income, poverty, who is looking for work. Find out first whether the counts carry only the played town's employers' jobs. Then fix it at the cause for every place: either the opening counts carry the county's real employment (each surrounding place's adults at work at its own rate, sized by the households its records stand for), or the reading tools stop calling this figure the employment rate.

**Cause.** Needs cause. Looked at: Wickliffe, Oklahoma, seed 8832429ff1e53841 opens with about 1,550 jobs for 25,600 working-age adults (6 percent); Townsend, Delaware, place key 1072510, world seed 50a1b5116b69667928c30949d59ec893d9b92d60fa285085a628ee8fd0377f1a reads 1.6 percent of adults at work (scripts/dev-tests/drift-played.ts at the opening). Where recorded jobs sit: only in the played town; the large surrounding place's share is about the size of its sampled records, not of the households they stand for. Candidate sites, from reading, not confirmed by a run: collapseToTwoLevels in src/core2/residents.ts (line 309; it multiplies adults by `options.weights?.[placeId] ?? 1` at line 893, so a place whose weight is carried on each household record instead of in that table is sized as if every record stood for one household) and openingUnplaced in src/core2/modules/residents.ts (line 565).

**Fix.** None until the cause is found.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a place's adults at work start from its real average with a per-world spread, marked as an estimate with its source, never from near zero. One model, two tiers: a record that stands for many households holds jobs for all of them, by the same rule as one household times its count. One rule, all 56 places: the county's rate comes from its own data row, never a named place. Owner, November 8: "ranges aren't targets"; this sets the opening only, and nothing pulls the figure back to a real level after day one.

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. On day one, before any time passes, the Metrics tab's People at work and dev mode's Watch panel on the Calendar show, for the town and for each surrounding place in the counts, jobs held and working-age adults (the builder adds the surrounding places' line to Watch from the same records if none shows it); each place's share of adults at work is reported beside its source figure and the screenshot names the place, the seed and the source. Then the named repro, Wickliffe, Oklahoma, seed 8832429ff1e53841: the opening no longer reads about 1,550 jobs for 25,600 working-age adults. Follow the dollars: the wages those added workers earn are paid from each place's outside account on the journal from the first payday, by record id, and the journal balances. If the finding is instead that the counts carry only the town's jobs, the tool and the Watch line are renamed so no screen or report calls the figure an employment rate, and the PR body says so. A test draws a place and fails when a place in the counts opens with almost no adults at work against what its own data row says. The owner plays it: on day one the Metrics tab shows most working-age adults in his town and county at work.

**Waits on.** Nothing.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/opening-employment.ts, src/core2/modules/world-panels.ts, scripts/dev-tests/vitals.ts, src/bench/ui/dev-watch.mjs

**Notes.** From the Fable audit, Pillar 7. Measured there: the Wickliffe, Oklahoma world's jobs broken down household by household for the first year. The audit did not look up which place each of the world's three place records is, and did not find why the county is nearly jobless; the question in What is its open question. Helper's check on main, Nov 10 (a run of `scripts/dev-tests/drift-played.ts` at the opening and a read-only breakdown by place; drawn place Townsend, Delaware, place key 1072510, world seed 50a1b5116b69667928c30949d59ec893d9b92d60fa285085a628ee8fd0377f1a): the tool read 1.6% of adults at work and 98.4% of households in poverty on day one. By place: the town's 1,006 households held 553 recorded jobs and about 829 share jobs for 2,010 adults; a second place's 3,867 households held no recorded job and about 2,873 share jobs for 4,328 adults; the third place's 2,554 records, standing for 251,495 households and 399,755 adults, held no recorded job and about 2,065 share jobs. So recorded jobs exist only in the played town, and the large surrounding place's share is about the size of its sampled records, not of the households they stand for. A lead from reading the code, not confirmed by a run: `collapseToTwoLevels` counts each place's adults in the sampled homes and multiplies by `options.weights?.[placeId] ?? 1`, so a place whose weight is carried on each household record instead of in that table is sized as if every record stood for one household. Related: `jobs-counted-household-job-share-runs-away` (what happens to these counts over the years), `world-opening-jobs-vs-lodes-commuting` (blocked) and `world-commuters-in-opening` (open), which change how the town's own residents are split between town firms and work elsewhere.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Wickliffe, Oklahoma opening, count jobs and working-age adults per place before and after `collapseToTwoLevels` (src/core2/residents.ts line 309) and at `openingUnplaced` (src/core2/modules/residents.ts line 565), and see at which step the surrounding places' adults lose their jobs or never get them. The fix then gives each place its employment from its own data row with a per-world spread, by the same rule as a full household.
