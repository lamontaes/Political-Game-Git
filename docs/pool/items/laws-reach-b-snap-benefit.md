---
id: laws-reach-b-snap-benefit
title: "A baseline SNAP benefit is paid by a benefits writer, and the work requirement counts each person's own months"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Looked at Oct 20 (claude, claude/political-game-pool-76ksvw), not built. A baseline SNAP benefit needs a benefits writer the core does not have (SG-GOV-REACH-B-assistance-benefits names `addBenefit`/`endBenefit`, neither exists). The closest pattern is the unemployment writer in `src/core2/jobs-benefits.ts` (`fileClaim`, `payClaims`, `endClaim`). A real build needs: eligibility (gross income against the poverty line by household size, from sourced data), the monthly amount (the maximum allotment by household size less a share of net income; those figures must be sourced from USDA FNS, not recalled), a payer (the federal treasury through the journal) and the households' accounts as payees, per-person months for the work requirement, and a counted-household path by weight. It is a new money flow, so the dollar-balance guard and the speed guard apply. Priority 3 and not on the golden path; per "this is a game, not a spreadsheet" the owner should say whether SNAP is wanted at this depth before it is built.
