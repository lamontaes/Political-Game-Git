---
id: release-agents-align-declaration
title: "release:check fails on main: docs/release/changes/agents-align.md carries a section and title with impact none"
area: release
kind: bug
priority: 1
status: done
claimed-by: claude/release-agents-align-declaration
pr: #4409
blocked-on:
milestone:
source: "found while running release:check --mode pr on claude/laws-reach-group-b-failures"
---

**What.** `npm run release:check -- --mode pr` fails on main: `agents-align.md` has `impact: none` but also `section: Changed` and a `title`, which the release machinery refuses. A second message, `Could not run 'git rev-parse --verify <sha>^{commit}'`, appears when the checked base commit is not fetched; confirm it is only a shallow-clone effect.

**Rules.** Declarations follow `docs/release/README.md`.

**Done when.** `npm run release:check -- --mode pr` passes on clean main.

**Files.** docs/release/changes/agents-align.md

**Notes.** One-line fix: drop `section` and `title` from the file.
