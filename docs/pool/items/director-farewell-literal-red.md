---
id: director-farewell-literal-red
title: "director.test.ts numbers-in-data scan fails on main: a literal 4 in conversation.ts"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/farewell-wordings-literal
pr: #4813
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T20:18:38.279Z
---

**What.** `src/director/director.test.ts` "registers every stopgap it marks and keeps numbers in data" failed on main with `conversation.ts:4`: the parting-word loop capped its tries at a bare number in code (`FAREWELL_WORDINGS = 4`), which the numbers-in-data scan refuses. Commit 285647016e moved the count into the director's parameters while this item was being filed, so nothing is left to build. The item is kept only so the failure and its fix are on the record.

**Rules.** No dice and no hand-written player text: the wording still comes from the English engine's bank. Replace, never layer: the constant is deleted, not duplicated. The numeric-literal scan stays on and the count lives in the parameter table with its tag.

**Done when.** `npx vitest run src/director/director.test.ts` passes on a branch from main in a test run showing the scan lists no literal in `conversation.ts`; the CTO sets this item to dropped as a duplicate of the fix in 285647016e.

**Files.** src/director/conversation.ts, src/director/data/director.json

**Notes.** Found Oct 16 running the director tests for director-layoff-boss-producer; recommend the CTO drops it (the failure no longer reproduces on current main).
