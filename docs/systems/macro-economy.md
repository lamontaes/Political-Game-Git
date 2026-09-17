# Macro Economy — a world that changes (CRUNCH46 08 CHANGE)

CHANGE owns canonical macro history and the public-service economic
projection. It does not write public cash: GOVERNING owns fiscal-account,
legislation and implementation writers. WORLD owns the starting draw and the
shared World-schema registration.

## What is canonical

`World.macroEconomy` (optional, additive, `change-macro/v1`) holds:

- `start` — WORLD's persisted section-13 draw (`crunch46-macro-start/v1`),
  copied once and cited (`macroStartForHistory`, called from
  `generateOpeningLife` right after `ensureWorldStartingConditions`). CHANGE
  never draws it again. Without that record
  (older saves, worlds WORLD did not seed) CHANGE writes and schedules
  nothing; saves are never retrofitted.
- `months[]` — one record per scope per closed calendar month:
  model growth (continuous annual rate), unemployment, inflation, real-output
  and price index levels, the housing supply/demand ratio and its reading,
  credit tightness, the policy-rate range, the drawn innovations, the summed
  shock impulses and the shocks that contributed.
- `shocks[]` and append-only `shockEnds[]` — each shock has a canonical origin
  event, a dedupe key (origin + `change-macro` + version), kind, geography,
  sectors, signed magnitude with units, intensity, start, persistence, public
  or non-public state and `authored-unvalidated` model uncertainty.
- `releases[]` — this world's own published statistics, each announced by a
  public `economy.release-published` event and a Civic Ledger publication.

## Cadence and exactly-once processing

The only producer is the due-item chain `economy:monthly-step`, registered in
`createCampaignElectionTransitionRegistry`. The item for month M falls due on
the first day of M+1, closes month M once, and schedules M+1. Long skips are
processed month by month by the existing resolver; reading never steps. The
innovation stream is `seed → change-macro/v1:innovations → scope → YYYY-MM`,
so results do not depend on read order, chunking or Save/Continue.

## Equations

Section 13 of CRUNCH46 (`crunch46-provisional-v1`), stored verbatim in
`src/simulation/macro-economy/policy.ts`: startup kernel, monthly transitions
(growth persistence 0.85, lagged unemployment coefficient 0.04, inflation
persistence 0.95, innovation SDs 0.15/0.04/0.04 pp), continuous-rate index
compounding (using WORLD's engine-independent `detExp`, logistic and normal
draws from `world-setup/deterministic-math.ts`), and published discrete rates computed from recorded levels:
quarterly annualized output growth from quarterly mean index ratios, and
12-month inflation only once twelve recorded months exist. Every stored
number is rounded to 1e-6.

Section 13 gives no shock magnitudes. `CHANGE_AUTHORED_IMPULSES`
(`change-authored-impulses-v1`) supplies labeled first-play placeholders for
the eleven shock kinds and awaits director confirmation.

## Shock origins delivered now

- W3 international development subject 0 (shipping delays) → national
  trade disruption, active until W3 records `development-eased`, then
  decaying geometrically. The fishing-rights subject moves nothing.
- CRISIS disaster, public-health and conflict records plug into
  `MACRO_ORIGIN_READERS` when that lane lands (agreed envelope). Until then
  no such shock exists.

A jurisdiction layer materializes only when a shock names that jurisdiction:
national movement plus local impulses, with no independent random economy.
No local sector source is compiled yet, so exposure is recorded as
`national-average-no-local-source`.

## Readers and consumers

`macroConditionsAt`, `macroMonthHistory`, `macroReleasesAt`,
`publicMacroShocksAt` and `macroHistoryStart` are pure. First consumers:

- Civic Ledger publications (News) for every release.
- `projectMacroConditions` / `MacroConditionsPanel`: real output growth,
  unemployment, 12-month inflation, housing ratio and the jurisdiction's
  modeled-account receipts, outlays and balance per month. Card, graph and
  table share one series; gaps are labeled, never zero. UI mounts it.
- `publicConcernsAt(world, jurisdictionId, asOf)`: the latest released
  figure per indicator as a citable concern (rising/falling/steady/unknown
  against the previous release, authored ±0.05 pp steady band). Released
  figures only; CAMPAIGN staff plans show up to three.
- PRESS stories cite release event ids; MAPS reads the selectors.

Not yet connected, and not claimed: household wages, jobs or housing
effects, campaign concern ranking, governing-brief budget consequences and
service backlog (the GOVERNING capacity record does not exist yet), real
income (no wage history), central-bank decisions (no actor), and housing
construction or migration (no recorded events).

## Recorded conflicts with D-043 (need director acceptance)

1. D-043 keeps economy truth as exact rational metric states. Section 13's
   logit, logistic and exponential equations cannot be represented as exact
   rationals, so macro months store 1e-6-rounded decimals in their own family.
2. Every `recordWorldMetricState` runs full-world integrity with a per-record
   linear scan. Thirty years of monthly values through that writer is
   quadratic, so macro history uses its own linear integrity pass. The
   metric-state and observation families are left unchanged.
3. D-043 deferred a macro tick; CRUNCH46 section 08 now assigns it. This is
   the deferred work arriving, not a reversal.
