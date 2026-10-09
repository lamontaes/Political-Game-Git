# P9 life replay harness

Developer diagnostics only. Three public, cited life datasets cover Alexandria
Ocasio-Cortez, Wes Moore, and Lyndon B. Johnson. Facts, real names, citations, and
evaluation targets stay outside player assets and application code. This harness
does not generate player prose.

## Run and evaluate

Run heavy work in the worker's cloud environment, never on the owner's Mac.
Install the repository dependencies first. Invoke through the repository storage
guard in a managed cloud workspace:

```bash
OCD_STORAGE_STATE_DIR=/workspace/scratch/storage OCD_WORKSPACE_OWNER=SOL-HARNESS \
node scripts/storage/cli.mjs run test -- npm run life:replay -- batch \
  --out-dir /workspace/scratch/life-replay
```

`batch` defaults to all three lives in both modes. Each run is a separate Node
subprocess with a hard timeout. Each writes a receipt, evaluation, and manifest.
The manifest records the code revision, file hashes, Node version, and source
cleanliness. Add `--core PATH` to select a P8 module exporting `createReplayCore`.

```bash
npm run life:replay -- run --life data/life-replay/lives/wes-moore.json \
  --mode god --checkpoint modern-start --out /tmp/moore.json
npm run life:replay -- evaluate --life data/life-replay/lives/wes-moore.json \
  --receipt /tmp/moore.json --out /tmp/moore.evaluation.json
npm run life:replay -- report --life data/life-replay/lives/wes-moore.json \
  --receipt /tmp/moore.json --out /tmp/moore.md
```

Repeat `--receipt FILE` to compare modes and checkpoints in one report. Both
modern lives provide `modern-start`, a January 1, 2021 checkpoint. Birth is the
default start. `--seed` controls deterministic generation; `--max-days` sets an
explicit shorter horizon. Incomplete runs retain unreached-step gaps. A report is
an audit of receipts, not a player playtest. Check owner-facing Markdown through
the civic-reports workflow before publishing it.

## Core interface

`ReplayCore` in `contract.ts` is the versioned `life-replay/v1` boundary. P8 may
import its pure API types; it must not import `LifeFile` or evaluator targets at
runtime. The adapter receives identity, birth sources, initial household data,
dated external inputs, and past facts before a checkpoint. It never receives
future checks, range targets, dependency chains, or a biography ID.

`initialize` builds the subject and world. `input` applies dated era and local
conditions. `event` applies an external factual event, such as a family loss;
documented outcomes never enter through that method. Numeric facts in life data
reference the single parameter table. API observations may contain actual numbers.

In free mode, `advance` runs the ordinary core scorer. It must resolve decisions
itself and must not return pending choices. In god mode, it can pause before a
decision inside a source date window and return `pending`. The runner matches
structured intents against actual enabled choices for any actor. One unique match
is forced through `resolve`; an undocumented pending choice is delegated with
`resolve(id, null)` to the ordinary scorer. Ambiguous matches are not forced.
`decisions` also exposes available choices at a documented boundary. `resolve`
controls a selection only and must run ordinary consequences.

`observe` returns dated metrics with canonical record IDs and an origin:
`initialized`, `forced`, or `engine`. Only engine observations can establish
reproduction. A forced choice is not a consequence. A checkpoint's supplied past
is not counted as established state without initialized observations. `requires`
checks continuity between verified steps; it is neither an engine rule nor an
assertion of historical causation.

`capability` distinguishes full behavior, record storage without behavior, and
missing representation. Probe IDs remain separate from live consequence IDs.
Every unsupported binding returns a gap rather than a successful placeholder.
Clock completion is separate from reproduction. Semantic checks and numeric bounds
must both pass to count a reproduced step. Historical dollar or vote-share points
are exact targets, not population calibration ranges. Legal age bounds test
eligibility only. Missing measurements are unmeasured, never passed.

The draft API is not merged or used by saves. Later incompatible releases require
a version bump and an explicit migration adapter. Content keys remain open data:
the contract test adds an event and need through data plus one module, without
editing the runner. The old-core integration test uses one shared adapter path
for all 56 jurisdictions.

## Source and date boundaries

Every fact group and date window cites public sources with publisher, URL, and
location. Unknown dates, pay, wealth, private traits, or relationships stay explicit
in `unknowns`. Parent occupation descriptions are public background; they do not
establish a dated active job or private financial state.

Imprecise events use their latest source-window boundary for scheduling. That
boundary is not asserted to be the exact historical day. A god-mode core can pause
earlier inside that window. Life steps remain in documented order; dependencies
are evaluator data only.

Reference rows are excluded from initialization or world input. Examples include
an unborn sibling, later adult faith, retrospective annual unemployment figures,
and later laws whose passage is itself an evaluated outcome. This prevents future
facts from silently becoming initial state. External conditions remain available
for both modes; endogenous decisions and outcomes stay evaluator-side in free mode.

## Old-core baseline limits

`old-core.ts` calls unchanged canonical world, clock, event, and life-situation
functions. It creates one sourced subject and birthplace. Public data in these
files do not fully specify families, employers, political offices, or an electorate;
the adapter reports those missing bindings rather than inventing private state.

Its capability probe proves only that the existing event writer accepts a generic
mechanism label, date, and actor on a discarded fork. The label does not store the
full factual payload or establish its consequences. Era and external-event inputs
likewise record labels without applying economic or legal effects. Checkpoint
labels do not establish active jobs, education, residence, or officeholding.

God mode can select actual enabled native life-situation options. The unchanged old
clock does not expose pauses for internal scheduled decisions. Career and civic
actions lacking a native intent binding stay gaps. The adapter observes canonical
age and decision traces, without counting forced choices as consequences.

These runs diagnose source-to-core bindings. They do not establish that the full
old game lacks elections or law systems. A one-subject world with little scheduled
activity cannot establish normal-year throughput or full political behavior.

## Stopgap rules

`data/life-replay/stopgaps.json` is the P9 registry. Each active entry names an ID,
kind, exact location, reason, author, date, and replacement. The guard checks
markers, stale entries, numeric literals, authored options, player rendering,
parameter provenance, and application imports. `npm run life:replay:check --
--release` refuses open entries in plain words. `build:steps` invokes it first.
Executed stopgaps use the developer sink, which receives a red banner with the ID.

The current registry contains no open P9 entries. Missing public facts and
unsupported mechanics are recorded gaps, without fallback assumptions. This gate
covers P9; it makes no claim about unregistered legacy assumptions elsewhere.

## Diagnostic format

JSON artifacts use two-space indentation as this documented formatting policy.
The parameter table records that engineering constant separately from world facts.
It also records arithmetic identities and time/unit conversion definitions with
their actual standards sources.

## Measurement budget

The default hard subprocess timeout is 300,000 milliseconds. This is a documented
engineering budget, not an empirical simulation value or a CTO ceiling. The
default simulated horizon is calculated from the life dates. P8 and P9 cloud
measurements are exempt from the old seven-day cap.

Direct `run` checks its elapsed budget between calls; it cannot interrupt a single
synchronous blocking core call. Use `batch` for the hard process limit. Runner time
excludes module import and process startup. Peak memory uses the process-lifetime
kernel RSS high-water mark, including imports. Reports state these limits next to
the receipts rather than claiming a normal-year benchmark.
