---
id: release-main-red-no-steering-mortgage-role
title: "The no-steering guard is red on main: housingMortgageCountyMinOwners (from #8546) has no role"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-no-steering-mortgage-role
pr: 8916
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (CTO's 19:31Z line on #7365; codex-4629 and sonnet-2015 found it)
---

**What.** tests/guards/no-steering.test.ts line 71 fails on clean main 7684a629: "src/core2/data/housing/parameters.json: 44 rows without a role, 43 known". Every merge desk running the guard suite sees it on every pull request, beside the two reds #8906 fixes. Guards: every pull request's guard suite runs green again, so the merge desks stop carrying a main red.

**Cause.** Found in code: #8546 added the `housingMortgageCountyMinOwners` row to src/core2/data/housing/parameters.json with no role. It is read only by `mortgageShares` in src/core2/housing-mortgages.ts at the opening, to choose whether a place's county ACS row or its state's seeds who owes on a mortgage and when owners moved in.

**Fix.** Give the row `"role": "opening"`, the role for a figure that seeds the opening world. The known count stays at 43.

**Time box.** 0.5 hours

**Rules.** Research before building: the row is not re-sourced here; it keeps its TUNABLE tag and citation and gains only its true role. Never raise the known count in the guard's baseline.

**Done when.** A second session runs `npx vitest run --dir . tests/guards/no-steering.test.ts` on main and all 7 pass; the guard suite in the drawn place it names shows no no-steering failure.

**Waits on.** Nothing.

**Files.** src/core2/data/housing/parameters.json
