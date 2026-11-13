---
id: metrics-opening-year-sourced-last-year
title: "On day one, the town's Metrics rows show last year from the opening's sourced figure, marked as an estimate"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-13
source: CTO on issue #8928, Nov 13 2026 02:34Z (comment 6842106471), squaring the owner's Nov 5 ruling in docs/design/output-numbers.md with the CTO's review of the first registry attempt
---

**What.** On a new life's first day the town's rows on Metrics (typical monthly rent, typical home value) show no last year, and none until a year has been kept (#8966). The owner ruled on Nov 5 that the tab is never blank: "last year on day one is the opening's source figure, marked as an estimate, and from month 13 both columns are simulated". The CTO, Nov 13: "on day one, last year may be the opening's **sourced** figure, tagged ESTIMATED with its citation. For example, the Census figure the opening's rent and home value are built from, for that town, a year earlier where the source has one... give a sourced prior-year figure to every town row that has one; rows with no source (notices, claims) stand alone until a year is kept." Never the engine's own day-one counts (people at work, people looking, rentals): those have no source, and copying them as last year was the fault in the first attempt. Seen: Metrics on day one, the town's rent and home value each with "Last year" beside them, marked as an estimate, in a place nobody chose.

**Cause.** Found in code: `keptOutputNumber` (src/core2/output-numbers.ts) returns last year only from the year row of the year before, and nothing writes a year row for the year before the world opens: `world-metrics` writes its first row on the opening day (src/core2/modules/world-metrics.ts, the opening fold). The sourced figures exist but only for the opening year: src/core2/data/housing/housing.json carries ACS 2020-2024 B25064 (median gross rent) and B25077 (median owner home value), read at the opening by `rentValueOf` in src/core2/modules/housing.ts (the county's or municipio's median gross rent, scaled to each household); the town's typical rent and home value on Metrics are then counted from its households by `townFigures`. No earlier vintage of either table is in the repository.

**Fix.** 1. Research (skill `researcher`): add the prior vintage of the same two tables (ACS 2019-2023 B25064 and B25077) for every place the game draws, at the same geography the opening reads, from pages fetched and quoted. 2. On the opening day, `world-metrics` writes the town's row for the year before the start through the registry, holding only the fields that have a sourced prior figure, each tagged ESTIMATED with its citation in the row's `inputs`. 3. `keptOutputNumber` already reads that row as last year; it returns the tag so the screen can mark the figure. 4. The mark's words go through Fable A on #8928 before the screen shows them. 5. Rows with no source (eviction notices, people claiming now, the jobs and rental counts) get no prior row and stand alone until a year is kept.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN (standing rule): a value a player can see starts from the real average with a spread, marked as an estimate with its source. One rule, all 56 places: the prior figure comes from data for every place, never a named place in logic. A small town shows its own figure (owner, Nov 12): today the opening's rent is the county's or municipio's median gross rent scaled to the town, so the prior-year figure must be scaled by the same rule and say so in its citation; if a place-level table exists for the town, use it. An effect is a read, not a record: the prior row is read by Metrics and by the years table (order 13). Speed: one write per place on the opening day, nothing monthly.

**Done when.** A second session starts a new life in a drawn place on main, naming the place and seed, opens Metrics on the first day, and sees last year beside the town's typical monthly rent and typical home value, each marked as an estimate; in dev mode the prior year's row names its source table and vintage; eviction notices and people claiming now show no last year; and after 14 months the same rows show the kept year, not the estimate.

**Waits on.** metrics-output-numbers-registry (#8966).

**Files.** src/core2/modules/world-metrics.ts, src/core2/output-numbers.ts (new), src/core2/data/output-numbers.json (new), src/core2/data/housing/housing.json (or a new prior-vintage data file beside it), src/bench/play.mjs, src/bench/data/controls.json, src/bench/metrics-registry.test.ts (new)

**Notes.** Filed Nov 13 2026 by Account lead T7 from the CTO's answer on #8928 (comment 6842106471) to the Account lead's question (comment 6842096884). #8966 merges as built; this is the row it leaves out. Not checked: at which geography the opening reads B25077 for home values; the builder reads the opening's home-value code in housing.ts first.

**Research, Nov 13 2026 (Account lead T15, before any engine edit).** (1) The Census API and file hosts (api.census.gov, www2.census.gov) are refused from the cloud container, so the ACS 2019-2023 vintage cannot be fetched there; a builder needs a session that can reach them, or the figure comes from a source already in the repository. (2) The opening's rent is the county's ACS B25064 median moved once by the world's own offset (`rentValueOf`, housing.ts:273), then scaled to each renter household by income (housing.ts:766); the town's typical rent on day one is the median of those, so it is county-derived, not a town table. (3) The opening's home value is the county's B25077 median, dated at the ACS window's middle and moved to the start by the state's FHFA index (`homePriceRatio`, housing-prices.ts:94), so the repository already holds a sourced one-year move for home values (data/research/housing/fhfa-hpi-state-2026q2.json) and needs no new vintage for that row. (4) No rent time series is in the repository. See the thread's table on #8928 for the row-by-row plan.
