---
id: dev-trace-every-figure
title: "Every figure on Metrics opens in dev mode's Trace with its value, formula and inputs"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry, metrics-town-jobs-one-rule
blocked-on:
lead: lane
model: sonnet
effort: medium
root: none
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** Dev mode's Trace opens a kept row by id but answers 'no cause kept' for the town's monthly rows, and the Metrics screen shows no ids, so a figure that looks wrong cannot be traced. Add a trace target for a figure and link each figure on Metrics in dev mode. It shows the value, the formula in words from the registry, the inputs kept beside it with each tier's share, and the record ids it was read from. Seen: dev mode on Metrics, where each figure is a link that opens its trace.

**Cause.** Found in code: src/bench/dev-trace.ts (`findRecord`) opens a kept row by id but answers "no cause kept" for the town's monthly rows, and the Metrics screen shows no ids.

**Fix.** Add `figure:<id>:<place>:<period>` to the trace, showing value, formula in words, the inputs by tier and the record ids, and link each figure on Metrics in dev mode.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: the figure's inputs are kept beside it, so a trace can say by record id where the number came from. No hand-written player text in code (scene-standard, player-screen-text): the formula in words comes from the registry's rows, and the trace shows no raw ids as player text outside dev mode. One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete.

**Done when.** A second session in dev mode, in a drawn place named with its seed, opens every figure on Metrics and none answers "no cause kept" or "not a record".

**Waits on.** metrics-output-numbers-registry and metrics-town-jobs-one-rule.

**Files.** src/bench/dev-trace.ts, src/bench/metrics.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
