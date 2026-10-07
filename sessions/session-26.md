# Session 26 — English engine and phrase mining

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
The engine writes every kind of text the owner named (conversation, law wording, winning, losing, judges, notices, news, journal) and grading batches cover all of them.

## Milestones
1. #3008 EP-1e: merge main in, regenerate test-results/dialogue-batch/eng-20261007-ep1e.json, READY (ENGLISH).
2. Notices composer + bank (hearings, ordinances, elections) from record fields; added to the batch generator.
3. Local ordinance moves in the legislation bank so local measures get bill text.
4. Mined banks (data, mergeable): victory/concession, meeting procedure, stump remarks, sentencing, newspaper ledes — one bank per PR.

## Endpoint
A batch with every text kind present (no 'no output' rows) READY for the owner's grading, and ≥4 new mined banks merged-ready.

## CTO instructions and findings (do these)
- Batch rule: no two items share situation+relationship; every kind appears; 'no output, because…' rows for anything still missing.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
