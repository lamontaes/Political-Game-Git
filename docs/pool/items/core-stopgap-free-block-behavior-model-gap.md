---
id: core-stopgap-free-block-behavior-model-gap
title: "Stopgaps in free-block (behavior-model-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-core-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/free-block.ts, kind behavior-model-gap"
claimed-at:
---

**What.** Replace or clear the 1 open behavior-model-gap stopgap row(s) in src/core2/free-block.ts: SG-P15-free-block-plan. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/free-block.ts

**Notes.** First row: A person's free hours are filled from one scoring pass per activation: at most one act per need each day, and every act after the activation's own pick must score above zero. Between planned days, needs other than compan

Folded into research-core-sourced-parameters (CTO, Oct 19, 2026).
