---
id: laws-amendment-drops-program-terms
title: "A bill that changes a law's amount drops the law's terms, so a SNAP raise stops every benefit"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-8fxsy5
pr: #9578
after:
blocked-on:
lead: laws-effects
source: Laws thread, Nov 15, 2026, tracing laws that pass and reach no one (the stores, health and services tracer found SNAP stop after a raise)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When Congress or a state passes a bill that changes a law's amount, the new law row keeps none of the old row's terms. A House bill raising the SNAP maximum stops every household's benefit; a Social Security or unemployment tax raise taxes every dollar of pay because the wage base is gone; Medicare's extra rate, SSI's couple rate, the unemployment benefit's range, contribution limits' basis and the child care and energy aid income limits are lost the same way. Seen: a SNAP household's benefit on its household page and dev mode's bill card show nothing paid after the raise; the paycheck's Social Security line is taken past the wage base.

**Cause.** Found in code: `enact` in src/core2/modules/legislature.ts (the law-amount section) kept the amended row's terms only when `seriesPowers[series].retainTerms` was set (unemployment-insurance alone), and looked for the amended row only in the bill's own jurisdiction, so a Congress bill on SNAP (filed per state) found none. `allotments` (src/core2/law-reach/group-b-food-aid.ts) then looked for a table in the governing row's jurisdiction and found none. Measured: West Union, Ohio (3984294), world seed ilt-west-union: H.R. 3 raising SNAP 30% wrote law:US:federal:snap-maximum:general:2025-01-20:H.R. 3 with no table, and no benefit was set in 70 days; 19 of 23 federal and state series lost every term (/mnt/project-files/laws/probes/amend-walk-west-union.md).

**Fix.** An amendment starts from the row in force at the bill's level on the place's chain, keeps every term but the old bill's own record (who enacted it, the margin, the decision), and applies the bill's shape and terms on top; `retainTerms` and the fallback in `allotments` are deleted. The player sees SNAP benefits paid at the raised amount on the household page and dev mode's bill card, the law page's terms unchanged, and the paycheck's Social Security line stopping at the wage base.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One engine per mechanic: one amendment rule for every series, no per-series flag. Replace, never layer: the per-series flag and the fallback are deleted.

**Done when.** A second session passes a SNAP raise through Congress in dev mode at a drawn place and sees benefits paid at the raised amount on the bill card, and src/core2/law-amendment-terms.test.ts passes on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/law-reach/group-b-food-aid.ts, src/core2/data/legislature/series-powers.json, src/core2/law-amendment-terms.test.ts (new)
