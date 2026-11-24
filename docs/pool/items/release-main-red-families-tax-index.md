---
id: release-main-red-families-tax-index
title: "The families guard is red on main again: four engines import tax-index.ts (#8694) from inside the budgets family"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-families-tax-index
pr: 8947
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (Words builder W2 and the CTO on #8928)
---

**What.** tests/guards/families.test.ts fails on clean main ba2fbed0: src/core2/counted-money.ts, src/core2/country-law.ts, src/core2/modules/counted-moves.ts and src/core2/modules/macro.ts each reach one file further inside another family than known, all of them src/core2/tax-index.ts. It turns the guards check red on pull requests that touch no core2 file (#8931). Guards: every pull request's guard suite runs green again.

**Cause.** Found in code: #8694 (95ac0ab15c) added src/core2/tax-index.ts (`taxIndexOf` and the `TaxIndex` type: how far a bracket, deduction or wage base has risen with prices or wages by a year), which the budgets family's `tax-*.ts` glob places in that family. The four files above read it, from the people and jobs-businesses families, and it is not one of the budgets family's entry files.

**Fix.** List src/core2/tax-index.ts as an entry of the budgets family in tests/guards/families.json, as #8791 did for the people family's one reader of a person's work. It is a 44-line leaf that imports only types and is read by four engines by design, so it is a public face, and routing it through src/core2/modules/budgets.ts would tie the macro engine to the budgets module. No baseline is raised.

**Time box.** 0.5 hours

**Rules.** Replace, never layer: the file is named once as the family's face; no copy of it in another family. No baseline is raised.

**Done when.** A second session runs `npx vitest run --dir . tests/guards/families.test.ts` on main and it passes, and the guard suite in the drawn place it names shows no families failure.

**Waits on.** Nothing.

**Files.** tests/guards/families.json
