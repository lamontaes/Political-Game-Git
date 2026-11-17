---
id: laws-checker-raises-federal-lines-in-the-town-budget
title: "The law checker raised the 11 federal spending lines in the town's own budget and graded them as reaching people"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 16)
pr: #9773
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8a, Nov 16, 2026
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The law table grades the 11 federal spending lines as reaching people and moving money, and missing only the outcome-web link. That reach is one government and no person: the checker raised each federal line in the town's own budget, a line the town never keeps. The real grade of each federal line is unknown until the checker raises it in the federal budget. Feeds: laws-spending-lines-benefits-pay-no-recipient.

**Cause.** Found in code: `changeBudget` in scripts/law-wiring/check.ts, given no level (the matrix's default run), took the city's government, else the county's, else the state's, whatever the line. It never read the catalog's levels, so `budget-line:transportation`, whose catalog row lists only `federal`, was raised in `place:2745772` (New Munich, Minnesota, seed 7a3c19e2d4b6f805). The matrix's reach evidence for all 11 reads "full 0, counted groups 0/0 people, households 0, orgs 1" (docs/reports/law-wiring-matrix.json).

**Fix.** `changeBudget` with no level takes the lowest level `levelsFor` gives, the levels the catalog lets pass the line that keep a budget, the same rule the checker's own doc names for every other law. A federal line is then raised in the federal budget (`US`), a town line where it was before. The table and the bill card in dev mode then show who a federal line reaches.

**Time box.** 1 hour for one Opus session at medium effort.

**Rules.** Never loosen a check: the checker grades a law where it is passed, so a federal line reaching nobody now reads partly until an engine pays it.

**Done when.** A second session runs `scripts/law-wiring/budget-line-level.test.ts` on main in a drawn place, Town, State (seed printed by the test), and sees every federal-only line raised in the `US` budget; and reruns `scripts/law-wiring/check.ts --only` the 11 federal lines in a drawn place and reads each one's reach in the run file.

**Waits on.** Nothing.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/budget-line-level.test.ts (new)
