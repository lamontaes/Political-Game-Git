# storm-events-2000-2024

Flood, flash-flood and thunderstorm-wind **source episodes** compiled from the
NOAA NCEI Storm Events Database bulk annual `details` CSVs, for the declared
reference window **2000–2024**.

- Data product: NOAA NCEI Storm Events Database, bulk CSV details
  (`StormEvents_details-ftp_v1.0_dYYYY_cYYYYMMDD.csv.gz`).
- Publisher: NOAA National Centers for Environmental Information.
- Rights: U.S. Government work, 17 U.S.C. § 105. No attribution required.
- Compiler: `scripts/world/compile-storm-events.mjs`.
- Outputs: `corpus.json` (here) and
  `src/simulation/crisis/storm-catalog.generated.json`. They are **byte
  identical**; `corpus-manifest.json` records the SHA-256 of both.

## What the catalog claims

- For each calendar year 2000–2024, exactly one published annual `details`
  revision was retrieved, pinned by SHA-256 in `artifact-lock.json`, and read.
  No year is missing, so `window.missingYears` is empty and
  `window.exposureYears` is 25.
- A **source episode** is one NCEI `EPISODE_ID`. Every county row belonging to
  it is folded into that one entry as an affected area and an event id. A
  25-county episode is one episode, not 25 storms. `eventCount` is the number
  of reports, and reports are not independent storms.
- `monthlyCatalog` gives, for each calendar month and family, the number of
  source episodes that **began** in that month across the whole window, the
  number of underlying county event rows, and
  `episodesPerExposureYear = episodeCount / 25`. That division is the entire
  arithmetic; nothing is modelled, smoothed or extrapolated. Had any year been
  missing, every rate cell would have been emitted as `null` with
  `missingYearNote` set, rather than divided by a partial exposure.
- **A rate that averages over a reclassification.** The `flood` family is not
  reported consistently across the window. Against a median year of 620 flood
  episodes, the rule flags 2003 (7), 2004 (0) and 2005 (23), and `flash-flood`
  is correspondingly elevated in exactly those years. That is the publisher
  moving county flood reports between two event types, not weather.
  Those are present years with a real count, not missing years, so the
  compiler computes their rate cells rather than nulling them — but it also
  finds the discontinuity by rule (any family-year below a tenth of that
  family's median) and names it in `reconciliation`. A flood rate averaged over
  2000–2024 is averaging over that change. Treat the `flood` and `flash-flood`
  rates as a pair, or restrict them to a later sub-window, before leaning on
  either.
- `stateMonthlyCatalog` gives the same month-by-family cell **per state**, so a
  consumer can read a state-month rate directly instead of multiplying a
  national month share by a state share — month and place are not independent
  here, and that product would be wrong. Every state that appears anywhere in
  the window carries the full 12 months × 3 families grid; a zero is an
  observed absence across the whole window, not a missing value. Two rules
  govern it, and both are also stated in `fieldNotes`: an episode is counted in
  the month of its **`startDate`**, once, even when it runs across a month
  boundary; and an episode whose footprint spans two states is counted **once
  for each state**. Whether the state rows sum to `counts.episodesCompiled` is
  therefore a property of the data, not of the schema. In this window no
  episode's county footprint crosses a state line, so they do sum exactly —
  the reconciliation says so, with both numbers. That is measured, not
  guaranteed: a window containing a border-spanning episode would make the sum
  exceed the national total. Do not build a consumer that relies on equality.
- `stateFootprintProfile` gives, per state and family, how many episodes that
  state had and the median and 90th-percentile number of counties an episode
  touched there. Both are nearest-rank order statistics, so both are counts a
  real episode actually had.
- `reconciliation` lists the checks the compiler actually ran, with their
  numbers.

## Reading `episodesPerExposureYear`

The number is one division and nothing else: episodes recorded in that cell,
divided by the 25 non-missing years of the declared window. What a consumer may
conclude from it is exactly that — **over 2000–2024, the publisher recorded on
average this many episodes per year in this cell**. It is a descriptive average
of a past reporting record.

What a consumer may **not** conclude is that it is the probability, or the
expected number, of such a hazard in any future year. Three separate reasons,
each sufficient on its own. It counts reports, so everything unreported or
unverified is missing from the numerator while the denominator counts the year
anyway. The reporting practice behind the numerator changed inside the window —
the `flood` reclassification above is a measured instance. And a 25-year
average carries no trend, no seasonality beyond the month cell it sits in, and
no uncertainty interval, so it says nothing about whether the underlying rate
is rising, falling or steady. Using it as a per-year hazard probability would
convert a record of what was written down into a claim about the weather, which
this catalog does not support. If a consumer needs a forward-looking rate, that
is a modelling decision to be made, declared and defended somewhere else — not
a number this file already contains.

## What the catalog does **not** claim

- **It is a record of reports, not of weather.** Storm Events holds what was
  observed and written down. An unreported flood is absent from it. Reporting
  practice, staffing and verification thresholds changed across 2000–2024, and
  county-level counts move with them. Nothing here is the rate at which these
  hazards occurred. `window.note` says this inside the artifact.
- **No casualty or loss figure is here, in any form.** The compiler never
  parses `INJURIES_DIRECT`, `INJURIES_INDIRECT`, `DEATHS_DIRECT`,
  `DEATHS_INDIRECT`, `DAMAGE_PROPERTY` or `DAMAGE_CROPS`. The game does not
  reuse real deaths, injuries or dollar losses, so those columns are not
  projected, not summarised and not counted.
- **No narrative is here.** `EPISODE_NARRATIVE` and `EVENT_NARRATIVE` are not
  carried, not excerpted, and not reduced to a length. They describe real
  named people, towns and harm.
- **No territory is covered.** See the territory note below.

## County rows versus zone rows

Storm Events marks each row `CZ_TYPE = "C"` (county/parish) or `"Z"`
(forecast zone). Only `C` rows enter an episode. `Z` rows of the same three
families are counted in `counts.zoneRowsSeparate` and otherwise excluded,
because **no verified zone-to-county crosswalk exists here** and inventing one
would attach a hazard to counties the source never named.

## Territory pseudo-codes (a stated coverage gap)

The publisher's `STATE_FIPS` column uses `99` for Puerto Rico, `96` for the
Virgin Islands, `97` for American Samoa and `98` for Guam. These are not Census
state FIPS codes. Rewriting them (99 → 72, and so on) was tested against this
repository's canonical county corpus (`data/source/counties/corpus.json`,
Census Gazetteer) by matching `CZ_FIPS` and `CZ_NAME` to the target state's
county list with accents folded:

| result                          | rows |
| ------------------------------- | ---- |
| matched the canonical county    | 2985 |
| contradicted the canonical name |  695 |
| named no county in that state   | 1117 |

The contradictions settle it. Rows marked `CZ_TYPE = "C"` carry forecast-zone
labels such as `SAN JUAN AND VICINITY`, `WESTERN INTERIOR` and `NORTH CENTRAL`
on low `CZ_FIPS` numbers that collide with real municipio codes, so the rewrite
would have filed `SAN JUAN AND VICINITY` as Adjuntas Municipio. With no
verified crosswalk, those rows are excluded. This catalog therefore covers the
50 states and the District of Columbia and **no territory**. That is a stated
gap, not a claim that territories had no flooding.

## Event families

`EVENT_TYPE` is mapped exactly three ways: `Flood` → `flood`, `Flash Flood` →
`flash-flood`, `Thunderstorm Wind` → `thunderstorm-wind`. Every other event
type is ignored. The compiler additionally counts the near-miss spellings it
saw and excluded (`High Wind`, `Strong Wind`, `Coastal Flood`, `Lakeshore
Flood`, `Debris Flow`, and the `Marine …` variants) so a reader can see they
were seen on purpose. No legacy spelling such as `TSTM WIND` occurs anywhere in
2000–2024, so the three-way mapping loses nothing in this window.

## One episode, one family

A catalog entry carries a single `family`. A source episode whose rows span two
admitted families appears once per family with the same `episodeId`. The unique
key is therefore the **`(episodeId, family)` pair**, not `episodeId` alone.

## The episode-row bound

`episodes` could not hold the whole window. The complete 25-year list is
145,897 entries; minified, the array alone is 56,702,824 bytes with `czName`
and 50,396,598 bytes without it, and the artifact budget is 8 MB. Formatting
only grows those figures, so no rung carrying the whole window could fit.
`episodeDetailPolicy` inside the artifact records the exact ladder that was
applied, those measured full-window sizes, and the sub-window that was
emitted:

1. all years, with `czName`;
2. all years, without `czName`;
3. the largest number of **most-recent whole years**, without `czName`, whose
   fully formatted catalog fits the budget.

The first rung that fits is the one emitted. Within the emitted year span
nothing is dropped, reordered or sampled — it is every episode of those years.

**`episodes` is not a sample of 2000–2024 and must never be counted as one.**
Every aggregate (`counts`, `monthlyCatalog`, `stateFootprintProfile`) is
computed over all 145,897 episodes of the full window regardless of the bound.
Anything that needs the whole window must read the aggregates.

## Raw publisher bytes

The 25 annual `.gz` files total about 243 MB and are **not committed**. They
are cached outside the repository, and `artifact-lock.json` records where
(`storage: cached-outside-repository`, with `rawDir`) alongside each file's
URL, name, publisher revision, SHA-256, byte length and retrieval instant. The
compiler re-hashes every file before parsing and refuses to compile from bytes
that do not match the lock, so the cache cannot drift unnoticed.

Re-acquire them with `--acquire`, or point the compiler at an existing cache.
The cache path is deliberately kept out of the compiled artifact, so a compile
from any cache is byte-identical and `--check` passes either way:

```
node scripts/world/compile-storm-events.mjs --raw-dir /path/to/cache
```

After moving the cache, record its new location without re-downloading:

```
node scripts/world/compile-storm-events.mjs --relock --raw-dir /path/to/cache
```

`--relock` verifies every pinned digest in that directory and rewrites only
`storage` and `rawDir`; it refuses if any file is missing or altered.

## Re-running

Offline, from the pinned bytes — this is the normal path and touches no
network:

```
node scripts/world/compile-storm-events.mjs            # compile and write
node scripts/world/compile-storm-events.mjs --check    # fail if output drifted
```

Re-acquisition — the only step that reaches the network and reads a clock. It
downloads any missing annual file and rewrites `artifact-lock.json`, including
each file's `retrievedAt`:

```
node scripts/world/compile-storm-events.mjs --acquire
node scripts/world/compile-storm-events.mjs --acquire --raw-dir /path/to/cache
```

The publisher re-releases years under new `cYYYYMMDD` revisions. `--acquire`
pins the latest revision present in the listing for each year, so a re-acquire
can legitimately change the lock and the output; `--check` is what detects it.

## Registration

This domain is **not** wired into `src/source/domains/`, so `npm run
source:validate` does not compile or replay it; `--check` is its equivalent
gate. Its `corpus.json` is a single object rather than the array that the
registered-domain contract expects, and `corpus-manifest.json` mirrors that
contract's field names for readability without claiming to satisfy it.
