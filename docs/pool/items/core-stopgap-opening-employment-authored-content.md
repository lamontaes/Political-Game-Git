---
id: core-stopgap-opening-employment-authored-content
title: "Stopgaps in opening-employment (authored content): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
after: research-opening-jobs-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-employment.json, kind authored content"
claimed-at: 2026-10-19T23:41:36.732Z
---

**What.** Replace or clear the 1 open authored content stopgap row(s) in src/core2/data/opening-employment.json: SG-P8-authored-job-mix. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-employment.json

**Notes.** First row: The existing town-employment generator uses an authored workplace and role mix; sourced employment totals do not source those content options.

Oct 20: Switched from blocked to the automatic after: gate on research-opening-jobs-sourced-parameters, so it opens by itself the moment those items are done.
