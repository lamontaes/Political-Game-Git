---
id: core-stopgap-deep-past-generated-history-proxy
title: "Stopgaps in deep-past (generated-history-proxy): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-deep-past-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/deep-past.json, kind generated-history-proxy"
claimed-at:
---

**What.** Replace or clear the 1 open generated-history-proxy stopgap row(s) in src/core2/data/deep-past.json: SG-P8-deep-past. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/deep-past.json

**Notes.** First row: Generated summarized school cohorts reuse common grade stages, present institution names and current-locality proxies where past places are unrecorded; this is not sourced personal attendance or historical institution ex

Folded into research-deep-past-sourced-parameters (CTO, Oct 19, 2026).

Superseded by #6640 (merged Oct 28): `src/core2/data/deep-past.json` and its generated school cohorts are deleted; schooling is the school engine's `school.started` records in the one history, and the one-history proxy list is down to one kind (the birth date). Nothing left to build here.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. Its own Notes say it was superseded by #6640 (merged Oct 28): src/core2/data/deep-past.json is deleted and schooling is the school engine's school.started records. The row SG-P8-deep-past that remains in src/core2/data/stopgaps/p8.json names src/core2/past-school.ts (the stage offsets), which is a separate matter.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
