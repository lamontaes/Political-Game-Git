# Session 26

Read RULES.md (same branch) first. Items in order; the CTO marks DONE here and may add items — re-read after every PR.

ENGLISH ENGINE (O1's lane): 1. #3008 EP-1e (minutes and results lines from the recorded roll call) — merge main in, regenerate batch test-results/dialogue-batch/eng-20261007-ep1e.json, READY (ENGLISH).
2. Notices: there is no bank or composer for public notices (hearings, ordinances, elections). Build the composer from the record fields, using mined notice phrasing (bank from public notices), and add notices to the batch generator. READY (ENGLISH).
3. Legislation wording: add local ordinance moves to the legislation bank so local measures produce bill text. READY (ENGLISH).
Batch rule: no two items share situation+relationship; every text kind appears; a "no output, because…" row for any kind the engine can't make yet.

4. Mining (data, mergeable):  mine new phrase banks from public records (counts and real phrasing, sourced, no invented lines):
victory and concession remarks, council and commission meeting procedure, campaign stump remarks, judges' sentencing and rulings, public notices, newspaper ledes. One bank per PR, with tests/english-parts-banks style tests. Banks are data: gate and merge.

When everything here is DONE: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
