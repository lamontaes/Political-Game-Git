---
id: world-stopgap-macro-missing-record
title: "Stopgaps in macro (missing-record): 1 open"
area: world
kind: stopgap
priority: 2
status: done
claimed-by: claude/macro-income-history-s5
pr: #4840
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/macro.ts, kind missing-record"
claimed-at: 2026-10-16T23:25:19.964Z
---

**What.** The stopgap row(s) SG-WORLD-macro-income-history in src/core2/modules/macro.ts mark a shortcut that is still live in play. Today no town income-growth observation or local feedback is available before enough comparable paid-income months exist, so the national economy continues from national records alone. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Estimate, never UNKNOWN: the town's growth starts from the real regional average with a spread until local months exist. Sliding scales and causes: the local feedback weight rises gradually with months observed. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a town's income feedback begins from the estimate and moves to its own paid-income history, with the observation record ids, named by record id. The test in src/core2/macro.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see the town's pay track the national economy then its own.

**Files.** src/core2/modules/macro.ts, src/core2/data/stopgaps.json, src/core2/macro.test.ts

**Notes.** First row: No town income-growth observation or local feedback is available before enough comparable paid-income months exist; the national economy continues from its national records.
