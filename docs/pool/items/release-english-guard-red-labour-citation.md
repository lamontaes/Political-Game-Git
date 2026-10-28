---
id: release-english-guard-red-labour-citation
title: "The english guard is red on main: spelling-dates-units flags a quoted paper title the allowlist already covers"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/release-english-guard-labour
pr: #6550
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:57:01.541Z
---

**What.** On main since 02:06 UTC Oct 28 (8ed15c3672), npm run guards fails the english guard: tests/guards/english/spelling-dates-units.test.ts reports the British spelling of labor at docs/reports/law-wiring-matrix.json:6447. The text is the title of a real paper (Faggio and Overman 2014, The effect of public sector employment on local labour markets) inside a research citation, and tests/guards/english/allowlist.ts ALLOWED_PHRASES already has a pattern for exactly that title, so the guard should have removed it before the check. The law-wiring generator writes the citation back on every regeneration, so editing the report would not last. Found by Merger W while merging #6515; every PR's guards job carries the failure.

**Rules.** AGENTS.md Process (a failure also red on clean main does not block, but a red guard on main blocks the guard set for every PR); the guard's own rule that the one allowlist holds real names and quotations, each with a reason. Replace, never layer: fix the one engine, add no second list.

**Done when.** npm run guards passes all guards on main with docs/reports/law-wiring-matrix.json unchanged, shown by running it on a clean checkout of main; tests/guards/english/spelling-dates-units.test.ts passes and still fails when a real British spelling is added to a report file, shown by a break-it run naming the file.

**Files.** tests/guards/english/spelling-dates-units.test.ts, tests/guards/english/allowlist.ts, docs/reports/law-wiring-matrix.json

**Notes.** TODO
