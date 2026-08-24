# Causal Mechanisms, Lightweight Economy, and Fiscal Continuity

Stage 6 Run B adds one inspectable causal/effect substrate and a deliberately small aggregate economy over the exact metric foundation. It does not add a policy engine, incident generator, automatic economy tick, government accounting system, or population-scale market simulation.

## Causal identity and ancestry

A `CausalProcessRecord` is append-oriented provenance, not a narrative occurrence. Meaningful occurrences remain ordinary `HistoricalEvent` records; a causal process cites already-available canonical sources and may cite earlier causal parents. Root processes have no causal parent, while downstream processes retain their parent IDs. Effective date plus recording date and exclusive global sequence control availability, so later-appended backfill cannot enter an earlier reconstruction.

Ancestry is acyclic and parent references must precede the child. `distinctRootCausalIds` walks one or more causal/effect records to return sorted unique root identities. Two effects from one root therefore remain correlated, while independent roots targeting the same metric remain distinct. This is the anti-double-counting seam for later decisions, forecasts, incidents, and archives; it does not create a universal utility or causal-strength score.

## Mechanism definitions and effect activation

`CausalMechanismCatalog` stores reusable definition metadata once per world. Run B supports only two closed response curves: exact linear phasing and exact bounded quadratic ease-out. This is sufficient to prove linear and nonlinear behavior without a serialized callback, formula parser, expression AST, or scripting language.

An `EffectActivationRecord` commits one cause-to-metric relationship with stable mechanism and causal IDs, target metric/scope, nonnegative exact magnitude plus increase/decrease direction, activation/onset/maturity/end timing, optional typed threshold, optional minimum/maximum target bound, open realization key, canonical sources, recording date, and global sequence. Activations may target only primitive metric definitions and must match their value kind/unit; money currency compatibility is enforced when a baseline or constraint is evaluated.

Activation alone mutates no metric. Contribution evaluation is explicit, cutoff-aware, exact, and inspectable. Before onset and at/after an exclusive end it contributes zero; ramp dates use exact `rate:share` factors; maturity contributes the full magnitude. Threshold and bound behavior compare compatible exact values. Same-date activations evaluate in append order. Money phasing must resolve to exact minor units rather than round.

`evaluateAggregateMetric` starts from an explicitly identified canonical baseline state, selects historically available matching activations, applies exact contributions deterministically, and returns the baseline/result, every contribution, and distinct root causal IDs without writing. `recordEvaluatedMetricState` is the deliberate write seam: it records the computed result through `recordWorldMetricState`, explicitly supersedes the latest same-period truth, and cites the baseline plus contributing effect IDs as simulated provenance. Re-evaluation can name the original primitive baseline so earlier effects are not accidentally added twice.

## Primitive and derived economy metrics

The world-metric catalog now marks definitions as `primitive` or `derived`. The canonical writer rejects derived definitions. Primitive Run B state includes resident population, labor force, employed population, aggregate personal and labor income, cost level, consumption demand, output activity, housing availability pressure, government revenue, government outlays, and government debt. The accepted interval employment-rate definition remains an explicit denominator-aware primitive statistic.

Unemployed population, point unemployment rate, and fiscal balance are derived only. Labor derivation requires same-scope/same-point resident, labor-force, and employed counts; rejects negative values, labor force above residents, and employment above labor force; returns unavailable when an input or nonzero denominator is absent; and derives unemployment as force minus employed plus its exact share. No dashboard filler or conflicting unemployment truth is committed.

Aggregate personal income and the point cost-level index remain distinct canonical inputs. The purchasing-power query returns exact rational purchasing-power units plus both source-state IDs. A changed cost level can therefore change the derived result without mutating nominal income. Missing input, nonpositive cost, or incompatible dimensions never fabricate a value.

Consumption, output, and housing pressure are intentionally aggregate typed proxies. They create no firms, goods, housing market, people, organizations, or continuous hidden tick. Stage 5 remains authoritative for actual person/household money, work compensation, obligations, and housing.

## Fiscal continuity

Government revenue and outlays are exact money flows over explicit intervals; debt is an exact point stock. Fiscal balance is always derived as revenue minus outlays from source records with the same jurisdiction/segment scope, interval, and currency. The result preserves both source-state IDs. No independently mutable fiscal-balance truth, government bank account, appropriation, tax law, agency budget, double-entry ledger, debt instrument, or campaign/organization accounting exists.

Stage 10 may later produce budget/tax/appropriation consequences into these shared metric/effect contracts. Stage 6 Run C may consume the same effect substrate for policy baselines and phased implementation without moving law authority out of Stage 7.

## Information, time, integrity, and persistence

Causal processes, effect activations, and resulting economic truth create no person knowledge. Public statistics remain separate observation vintages; an ordinary release event and existing `EventKnowledgeRecord` remain the explicit subjective bridge.

Run B adds no scheduler. Explicit evaluation is caller-driven. Existing due items remain the only future-transition mechanism and can later schedule a named domain evaluation without recurrence syntax.

The causal catalog plus causal/effect histories are JSON-safe. World schema 11, generator `demo-world-v11`, metric catalog `world-metric-catalog-v2`, causal catalog `causal-mechanism-catalog-v1`, and snapshot format 10 persist through deterministic JSON and the Node-only SQLite repository; person materializer remains version 4. Integrity rejects malformed catalogs/keys/curves, duplicate identity, dangling or forward sources/parents, cycles, unavailable historical references, mismatched metrics/units/currencies, invalid timing/threshold/bounds, derived-state writes, unsafe exact arithmetic, and noncontiguous global history.

## Deferred systems

Run B implements no quantitative policy operation, forecast/baseline, law identity, incident selection or crisis chain, disaster/disease/unrest generator, mortality/incapacity/evidence, media ecology, public opinion, election/campaign/party, institution/office/chamber, appropriation/tax statute, central bank, full macroeconomy, organization accounting, banking, recurrence DSL, territory data pack, foreign government, or player-facing UI. Runs C–E and later stages retain those boundaries.
