---
id: dev-mode-every-figure-traceable
title: "Every registered figure opens a trace in dev mode: value, source record, inputs, history"
area: laws
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr:
after:
blocked-on:
lead: laws-effects
source: CTO, crew line #9747, Nov 17, 2026 (01:04Z), the owner's rule "every figure should be traceable from dev mode"
model: opus
effort: medium
root: none
---

**What.** The owner asked that every figure the game computes can be traced from dev mode: the figure, what it was computed from and how it changed. Dev mode's Trace box follows records, but no trace takes a figure, and the state unemployment rate keeps none of what it is out of. Lanes chasing a figure read code instead of the game. Seen: Politics, Metrics, dev mode's Figures list and its Trace box.

**Cause.** Design: the CTO's line of Nov 17, 01:04Z on #9747, from the owner's words. Found in code: `traceNode` in src/bench/dev-trace.ts opens only record ids; the registry of figures (src/core2/data/output-numbers.json) has no history reader, and `stateMonthRow` in src/core2/modules/macro.ts keeps the state rate but not the workers and seekers it is out of.

**Fix.** A `figure:<figure id>@<place id>` id opens in the one Trace box through a reader in src/bench/dev-views/figure-trace.ts: the value now and last year, the owning engine and source, the record it was read from, the named inputs and the history from the rows the owner keeps (`outputNumberHistory` in src/core2/output-number-readers.ts). The state month row keeps its workers and seekers. A test fails if a registered figure has no trace.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** An effect is a read: the trace reads the rows the owners keep and computes no figure a second time. Cadence: nothing runs every day; a trace runs on a click.

**Done when.** A second session, in a drawn place, Town, State (seed printed), opens Politics, Metrics in dev mode, clicks the state unemployment rate in Figures and reads its workers, seekers and months; and `src/bench/figure-trace.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/bench/dev-views/figure-trace.ts (new), src/bench/ui/dev-figure-trace.mjs (new), src/bench/dev-trace.ts, src/core2/output-number-readers.ts, src/core2/output-numbers.ts, src/core2/modules/macro.ts, src/bench/figure-trace.test.ts (new)
