---
id: release-spelling-sweep-red-oct20
title: "American English tests fail on main again: three research-data false positives and git ls-files overflowing its buffer"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-ay
pr: #5678
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T12:33:40.847Z
---

**What.** On main after #5459 (112 stopgap research values), tests/american-english.test.ts fails on three hits in data/research/stopgaps-oct19 (on holiday timing, a Nebraska precinct or ward, and Ward County, Texas), and tests/american-english-sweep.test.ts and npm run spelling crash with spawnSync git ENOBUFS because the tracked file list is larger than execFileSync's default 1 MiB buffer. Reword the prose hit, exempt the recorded ward wording and the county name the way the other research files are exempt, and give both git ls-files calls a large maxBuffer.

**Rules.** Replace, never layer; the allowance names the file and the words it covers; American English everywhere (tests/american-english-sweep.test.ts).

**Done when.** tests/american-english.test.ts and tests/american-english-sweep.test.ts pass on a branch from current main and npm run spelling lists nothing; the PR body names the changed files and the three hits by file and line.

**Files.** tests/american-english.test.ts, tests/american-english-sweep.test.ts, scripts/prose-eval/spelling.ts, data/research/stopgaps-oct19/C-government-law.json

**Notes.** TODO

Merged #5490 on 2026-10-20 (git ls-files buffer, research "ward" rule, notes respelled), but both spelling tests are still red on main from newer files: census place names under data/research/stopgaps-oct19/census/ (Center, Ward, Gray) that the new rule does not cover, and British forms in pool items, INDEX.md, docs/release/changes/port-trait-effects.md, docs/reports/merge-audit-2026-10-20.md and docs/reports/trait-wiring-2026-10-20.json (canceled, catalog, Harbor, Labor). Open for the rest.
