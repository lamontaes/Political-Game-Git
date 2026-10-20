---
id: release-spelling-sweep-red-oct20
title: "American English tests fail on main again: three research-data false positives and git ls-files overflowing its buffer"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/spelling-green-oct20
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:05:22.749Z
---

**What.** On main after #5459 (112 stopgap research values), tests/american-english.test.ts fails on three hits in data/research/stopgaps-oct19 (on holiday timing, a Nebraska precinct or ward, and Ward County, Texas), and tests/american-english-sweep.test.ts and npm run spelling crash with spawnSync git ENOBUFS because the tracked file list is larger than execFileSync's default 1 MiB buffer. Reword the prose hit, exempt the recorded ward wording and the county name the way the other research files are exempt, and give both git ls-files calls a large maxBuffer.

**Rules.** Replace, never layer; the allowance names the file and the words it covers; American English everywhere (tests/american-english-sweep.test.ts).

**Done when.** tests/american-english.test.ts and tests/american-english-sweep.test.ts pass on a branch from current main and npm run spelling lists nothing; the PR body names the changed files and the three hits by file and line.

**Files.** tests/american-english.test.ts, tests/american-english-sweep.test.ts, scripts/prose-eval/spelling.ts, data/research/stopgaps-oct19/C-government-law.json

**Notes.** TODO
