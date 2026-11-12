---
id: release-main-red-families-past-work-housing-occupancy
title: "The families guard is red on main: past-work.ts (#8275) and housing-occupancy.ts (#8600) each reach one file deeper inside another family"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-families-pointers-nov12
pr: 8936
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (merger sonnet-9649 and others on #8928)
---

**What.** tests/guards/families.test.ts, "reaches no further inside another family than before", fails on clean main 07fb90ba: src/core2/past-work.ts has 3 imports inside other families against 2 known, and src/core2/housing-occupancy.ts has 2 against 1. Every merge desk running the guard suite carries it. Guards: every pull request's guard suite runs green again.

**Cause.** Found in code: #8275 (f294371dde) added `import { openingWorkStatus } from "./jobs-elsewhere"` to src/core2/past-work.ts (line 50, the function `openingWorkStatus`), and #8600 (21f889eeea) added `import { assistanceIncomeByHousehold } from "./law-reach/group-b-money"` to src/core2/housing-occupancy.ts. Each file lies inside another family (jobs-businesses, laws) that is not its entry.

**Fix.** Each family's entry re-exports the one function from the file it already imports (`openingWorkStatus` from src/core2/modules/jobs.ts, which already imports jobs-elsewhere; `assistanceIncomeByHousehold` from src/core2/modules/laws.ts, which already imports group-b-money), and the two files import through the entry. No baseline raised, no allow-list widened.

**Time box.** 0.5 hours

**Rules.** Replace, never layer: the deep import is replaced by the entry import in the same change, with no second path left beside it. No baseline is raised.

**Done when.** A second session runs `npx vitest run --dir . tests/guards/families.test.ts` on main and it passes, and the guard suite in the drawn place it names shows no families failure.

**Waits on.** Nothing.

**Files.** src/core2/past-work.ts, src/core2/housing-occupancy.ts, src/core2/modules/jobs.ts, src/core2/modules/laws.ts
