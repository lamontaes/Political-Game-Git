---
id: release-guards-families
title: "One engine per mechanic: engine families, entry files and CODEOWNERS, held by a guard"
area: release
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/guards-families
pr: #6512
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:31:36.550Z
---

**What.** The owner ruled one engine per mechanic: one election engine, one body engine, one budget engine and so on, with levels and places as rows. The core is a flat folder, so nothing says which engine owns a file, and any file can reach inside any other. The second-writer guard refuses a second writer of an event kind file by file, but there is no map of engine families and no boundary between them.

**Rules.** One engine per mechanic: every source file belongs to one family in one map, and a file reaches another family only through its entry files, so a second engine shows up as a boundary crossing. Replace, never layer: CODEOWNERS is written from the same map, never kept by hand, and the deep imports already there only shrink.

**Done when.** tests/guards/families.test.ts with tests/guards/families.json passes on main: every source file in src/core2, src/director, src/english and src/bench is in one of thirteen families or the shared kernel; the 936 deep imports in families-baseline.json only shrink; the test fails when a director file imports src/core2/housing-sale.ts; .github/CODEOWNERS matches the map; docs/design/guards.md cites the research.

**Files.** tests/guards/families.test.ts, tests/guards/families.json, .github/CODEOWNERS, docs/design/guards.md

**Notes.** TODO

Oct 29 (CTO): set done; PR #6512 merged (the done flip failed while branch protection refused the flip job's push).
