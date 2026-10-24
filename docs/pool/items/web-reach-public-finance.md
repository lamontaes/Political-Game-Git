---
id: web-reach-public-finance
title: "Every household money, debt and public finance link in the outcome web reaches a person's records or names why not"
area: core
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by: claude/web-reach-public-finance
pr: #5905
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 2026-10-24T15:13:59.990Z
---

**What.** The outcome web holds 221 researched links; after the merged engine families about 109 reach an engine's records and 112 do not, each listed with its reason and stopgap in `src/core2/data/outcome-web/unwired.json` (written by `scripts/outcome-web/write-unwired.ts`; on the capstone branch until it merges). This item is the household money, debt and public finance family: 20 unwired links, 13 where the owning engine does not read the factor and 7 where nothing keeps the outcome. Their outcomes: household.income, household.child-poverty, household.food-insecurity, household.vehicle-costs, finance.past-due-debt, finance.medical-debt-in-collections, finance.high-cost-loans, gov.borrowing-cost, gov.nondisaster-transfers, program.snap-receipt and the rest. Make the engine that owns each outcome multiply its own rates by the link's effect per person, so real records move, or give the link one specific reason it cannot.

**Rules.** An effect is a read, not a record: a link counts only when the owning engine reads the factor at the moment it decides or pays. One model, two tiers: full and counted people take the same factor by the same rule, with researched moderators. Research before building: size, lag and spread come from the link's citation, never a tuned guess.

**Done when.** `src/core2/outcome-web-twins.test.ts` in a drawn place (seed named) shows each link in this family moving a record kind outside the web's own tables after its lag, and `scripts/outcome-web/effect-matrix.ts` on a played year of `buildBenchWorld` grades it as reaching, with one record id per link in the PR body; any link that stays unwired keeps a specific stopgap row in the unwired list.

**Files.** src/core2/modules/credit.ts, src/core2/budgets-treasury.ts, src/core2/outcome-web-reach.ts

**Notes.** Split Oct 24 by the CTO from the effect-web audit (order `docs/work-orders/lead-effects-2026-10-24.md`). Counts from the capstone branch's unwired list on Oct 23 (effect-web-integration). Poverty is counted from paychecks (effect-web-poverty merged); never let a web link move a household's money a second time. A PR names this item on line 1 and `Lead: effects` in its body.

Sent back 2026-10-24 from PR #5905 (branch claude/web-reach-public-finance): parent-incarceration-to-household-income is counted as carried and removed from unwired, but its table supplies only static source matching instead of the required drawn-place played record chain and record ID; finish on that branch, merge main into it first.
