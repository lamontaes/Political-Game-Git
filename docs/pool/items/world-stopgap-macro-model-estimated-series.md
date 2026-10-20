---
id: world-stopgap-macro-model-estimated-series
title: "Stopgaps in macro-model (estimated-series): 1 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-macro-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/macro-model.ts, kind estimated-series"
---

**What.** Replace or clear the 1 open estimated-series stopgap row(s) in src/core2/macro-model.ts: SG-WORLD-macro-mortgage-spread. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/macro-model.ts

**Notes.** First row: Opening 30-year mortgage rates after April 2019 are the 10-year Treasury plus the 1990-2019 mean FHFA spread, not a published monthly rate.

Folded into research-macro-sourced-parameters (CTO, Oct 19, 2026).

Looked at Oct 20 (claude, claude/political-game-pool-76ksvw), not built. SG-WORLD-macro-mortgage-spread: the easy fix would be the published weekly 30-year rate (Freddie Mac's survey, which FRED serves as MORTGAGE30US and which is reachable from the cloud), but the row's own reason records a CTO ruling on #3959 that Freddie Mac's survey is excluded. So the replacement has to be a government series (the row names monthly HMDA origination dates if CFPB publishes them) or the ruling has to be revisited by the owner; a builder should not swap the source on their own. Open question for the owner: is Freddie Mac's survey still excluded?
