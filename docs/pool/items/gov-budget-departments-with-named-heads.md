---
id: gov-budget-departments-with-named-heads
title: "Budget departments with named heads: each government's spending grouped into departments, each run by a named person"
area: gov
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The approved Budgets screen (owner, Nov 7, item 56) lists departments with their heads named in words and opens one as a typed page. The game keeps budget lines by category, not departments, and no record says who runs one, so the Fixer's Budgets screen groups lines by the game's own categories and names no head. Build departments as data rows the one budget engine reads: which lines each department spends, and the office or person who heads it (an appointed post, or the executive), so the screen, the news and the director read one record.

**Rules.** One budget engine: departments are data rows, never a per-level code path. Heads come from the offices and appointments records, never invented. One rule, all 56 places: no place named in logic. Every number sourced or marked estimated. The chain is the acceptance: a dollar is followed from the department line to the person who heads it and back.

**Done when.** In a played year (drawn place and seed) each government with a budget shows departments on the Budgets screen, each with the head's name taken from the office record by id, the lines it spends and the total equal to the budget's; a government with no named head says only the title.

**Files.** src/core2/modules/budgets.ts, src/core2/data/budgets, src/bench/budget.ts, src/bench/play.mjs

**Notes.** TODO
