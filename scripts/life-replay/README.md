# P9 life replay harness

Developer diagnostics only. Real names, biographies, citations, and expected outcomes
stay under `data/life-replay` and `scripts/life-replay`. Production code must never
import them. The harness does not generate player prose.

## Core interface

The versioned boundary is `ReplayCore` in `contract.ts`, currently `life-replay/v1`.
P8 supplies a module exporting `createReplayCore(): ReplayCore`. The runner owns the
life file and evaluator targets. The adapter receives identity, dated external inputs,
documented past facts before a checkpoint, and actual commands. It never receives
future checks, expected election results, range targets, or a biography ID.

`initialize` builds the subject and world. `input` applies dated era and place
conditions. `advance` runs normal decisions in free mode. In god mode, it exposes
actual pending decisions through `decisions`; `resolve` selects an enabled choice
and runs its ordinary consequences. Every person may appear as the decision maker.
The runner matches structured intents and refuses an ambiguous match.

`event` takes external factual events. Documented outcomes are never passed to that
method. `observe` returns dated metrics with canonical record IDs and origins:
`initialized`, `forced`, or `engine`. A forced selection is not an engine outcome.
Only engine observations with records can establish reproduction.

`capability` distinguishes full behavior, records without behavior, and missing
representation. Adapters return gaps with evidence rather than placeholder values.
API changes require a version bump and an explicit migration adapter.

## Stopgap rules

`data/life-replay/stopgaps.json` is the P9 registry. Every active entry is marked at
its code location and carries its kind, reason, author, date, and replacement.
The guard checks markers, exact locations, numeric literals, authored options,
player rendering, parameter provenance, and imports into the player application.
`npm run life:replay:check -- --release` refuses every open entry in plain words.
`build:steps` invokes this gate before the build. Executed stopgaps call `stopgap`
with the core's developer sink, which receives a red banner naming the ID.

Missing mechanics and unavailable public facts are gaps, not filled assumptions.
The initial registry has no open entries. This gate covers new P9 code; it does not
claim the old core has no legacy stopgaps.

## Measurement budget

The default hard subprocess timeout is 300,000 milliseconds. This is a documented
engineering budget, not an empirical simulation value or a CTO ceiling. The
parameter table records it with this policy as its source. The default simulated
horizon is calculated from the life dates. A shorter explicit day budget produces
an incomplete receipt and unreached-step gaps. P8 and P9 measurement runs are
exempt from the old seven-day cap and run only in the worker's cloud environment.

The adapter, command-line entry, and measured old-core reports are in progress in
the first draft. This file will include the verified commands at handoff.
