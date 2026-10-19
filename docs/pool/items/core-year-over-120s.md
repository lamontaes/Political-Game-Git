---
id: core-year-over-120s
title: "A town year runs over 120 seconds in some places (Garden City ID 131 s, Exeter NH 146 s)"
area: core
kind: bug
priority: 1
status: done
claimed-by: claude/core-year-over-120s
pr: #4425
blocked-on:
milestone:
source: "known bugs"
---

**What.** Speed guard: a town's game year must run under two minutes. Profile and fix the hot scan (index, or act on the day something changed).

**Rules.** Speed; never scan the whole world daily.

**Done when.** Both places under 120 s, one process at a time on the same machine.

**Files.** src/core2/ (profile)

**Notes.** None.
