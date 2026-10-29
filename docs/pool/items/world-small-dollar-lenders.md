---
id: world-small-dollar-lenders
title: "Payday and small-dollar lenders exist in the background where state law allows them, so the consumer-loan rate cap has loans to reach"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/laws-small-dollar-lenders
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T16:32:43.821Z
---

**What.** The owner ruled on Oct 24 that payday and small-dollar lenders are simulated in the background, not asked about. They exist wherever state law allows them, with rates, fees and volumes taken from sourced data (CFPB payday and installment lending reports, state regulator filings) so a town's borrowing households have a lender whose rates sit far above the bank's. The consumer-loan rate cap and fee limits in the laws engine read these lenders, so a cap that today changes no one's rate binds on them and moves money. Households that borrow pick the lender by the same chooser as any purchase, from their own cash, credit and circumstances.

**Rules.** No dice: a household borrows from a lender for a reason on its record, never a roll. Estimate, never UNKNOWN: a state with no sourced volume carries an ESTIMATED figure with a spread. Research calibrates, never decides: CFPB and state data size rates and volumes; who borrows and what the cap does come from the engine's own records. Simulate it, don't ask (owner, Oct 24): built as a background simulation with no owner question.

**Done when.** In one year of buildBenchWorld in a drawn place whose state allows payday lending, named by place key and seed, a lender record exists with a sourced rate and volume, at least one household loan names it by record id, and a consumer-loan rate cap enacted by bill changes that loan's rate on the journal; in a drawn place whose state bans them, no lender exists and the cap moves no money. A test covers both places. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/credit.ts, src/core2/data/credit/

**Notes.** Filed Oct 24 by the acting CTO from the owner's ruling (OWNER-DECISIONS.md, Oct 24). Resolves the laws lead's stopgap SG-WORLD-credit-rate-cap-no-small-lender once built.
