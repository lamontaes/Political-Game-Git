---
id: research-town-counts-34-places
title: "Source a population count for the 34 places the Census estimates leave out"
area: play
kind: research
priority: 4
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: low
root: rc9-place-facts-one-default
source: Stand-in triage, Nov 10, 2026 (SG-PLAY-town-count-estimate)
---

**What.** 34 of 32,508 places (mostly military posts and merged places) have no count in the Census Vintage 2025 estimates or the ACS 2020-2024 table, so they open at the model's own size and the creator's list marks it an estimate. This closes stand-in SG-PLAY-town-count-estimate with a sourced count for each.

**Cause.** Found in code: src/bench/creator.ts line 194 (`population ? population.value : parameter("targetPopulation")` with `estimated: true`); the count source is `placeReferencePopulation` in src/core2/gov-rules/place-population.ts line 110.

**Fix.** List the places `placeReferencePopulation` returns null for (a short script over the place base), find each one's Census 2020 decennial count or the base's own published figure, fetch and quote the page, add the counts as rows in the same data table `placeReferencePopulation` reads (SOURCED, with the citation), then delete the estimate branch in `creatorTowns`. A place with no published count at all keeps the estimate and stays registered.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building (skill researcher): real counts check the world and never decide an outcome. One rule, all 56 places: counts are data rows, no place named in logic. Estimate, never UNKNOWN until the source lands.

**Done when.** A second session lists the creator's towns for three drawn states (names and seeds in the PR) and sees no town marked as an estimate where a count was sourced, and the same town opens at the number the list shows. Each count row quotes its page.

**Waits on.** Nothing.

**Files.** src/bench/creator.ts, src/core2/gov-rules/place-population.ts, src/core2/data/stopgaps/play.json
