---
id: metrics-output-numbers-registry
title: "One registry of output numbers, and the Metrics screen reads it instead of counting its own rows"
area: core
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-63jrjr
pr:
after:
blocked-on:
lead: money
model: opus
effort: high
root: design-one-model-two-tiers
checked: fable 2026-11-12
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
claimed-at: 2026-11-12T22:51:03.732Z
---

**What.** Of the 106 measures the Metrics tab can show, 43 have one writer that every view reads; the rest are kept in two or more places that can disagree, never kept, or worked out by the screen itself. Build the one table of output numbers the design asks for: the list of figures moves out of the outcome web's `engineMeasures` into its own data file, the `world-metrics` module gains a `years` table with one row per place, county, state and the nation per year, and the owning engine writes its figure through one function. The Metrics screen then becomes a lookup of registry rows by section, with no counting and no scans. Seen: the Metrics screen's rows, each from one kept row with last year beside it.

**Cause.** Found in code: src/bench/metrics.ts computes its own rows in `helpRows`, `housingRows`, `budgetRows` and `stateRows`, and the outcome web stores copies of the town's figures (src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts).

**Fix.** Move the engine-measures list into src/core2/data/output-numbers.json (new), each row holding its id, owner module, unit, level, cadence (on change, monthly or yearly, never daily), source (SOURCED, ESTIMATED or TUNABLE), fold and named trace inputs. Add the `years` table and `putOutputNumber(api, id, placeId, value, inputs)` in src/core2/output-numbers.ts (new), a thin writer into the `world-metrics` tables with an index by place and a December step on the module's existing 2nd-of-the-month calendar work that closes each year row. Make src/bench/metrics.ts read the registry and delete its four row builders (`helpRows`, `housingRows`, `budgetRows`, `stateRows`) and the bench's second pick of the town's books in src/bench/play.mjs. The first year row is the opening's figure, tagged ESTIMATED (Nov 5: Metrics is never blank). Rent and home value read the town's monthly row, not the housing stock's opening figures (src/bench/metrics.ts:114 and 118).

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. Estimate, never UNKNOWN: a year row with no figure yet opens from the real average, marked ESTIMATED with its source. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed. Speed (owner, Oct 29): every series is written by the engine that already holds the number, at month's end or on the day it changes, and nothing new reads the whole world or history; `npm run speed:year` before and after on one machine shows no year more than 20% slower.

**Done when.** A second session plays a new life in a drawn place for 14 months on main, naming the place and seed. It sees each Metrics row with last year's figure, and rent and home value match the town's December row in dev mode.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts, src/bench/metrics.ts, src/bench/play.mjs, src/core2/data/output-numbers.json (new), src/core2/output-numbers.ts (new)

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12. Owner, Nov 12, 3:43 p.m. (CTO line on issue 8928): the plan is approved as written, and a small town shows its own count with the people behind it ("13 of 86 looking for work"), never a blend and never the county's figure.
