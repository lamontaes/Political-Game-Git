---
id: elections-stopgap-voting-missing-engine
title: "Stopgaps in voting (missing-engine): 1 open"
area: elections
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/voting-who-runs
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/voting.ts, kind missing-engine"
claimed-at: 2026-10-20T00:44:16.710Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/voting.ts: SG-GOV-who-runs-stand-in. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/voting.ts

**Notes.** First row: When filing closes, the incumbent stands again if alive, and each state or federal race gets a named challenger from the other major party.

Looked at Oct 20 (claude), released unbuilt. `fileStandingCandidates` (`src/core2/modules/voting.ts`) already yields to the candidacy engine: a state or federal contest returns at once when candidacy is installed, and a local incumbent who weighed running (`decisionOf`) is skipped, so the stand-in files only an incumbent who never weighed (a placeholder official, or a local seat before candidacy runs) and, without candidacy, the other party's challenger. A 700-day played run in George Mason, Virginia (seed hits-probe-1) never reached the marker `SG-GOV-who-runs-stand-in`, so the played path may no longer need it. Deleting it means installing candidacy in `record.test.ts`, `terms-and-vacancies.test.ts` and `wide-races.test.ts`, which call the function directly, and giving placeholder incumbents a decision through candidacy. That is a test-and-engine change to do together; not started.
