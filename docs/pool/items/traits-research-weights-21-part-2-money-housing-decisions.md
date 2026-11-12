---
id: traits-research-weights-21-part-2-money-housing-decisions
title: "Research rows and weights for the money and housing decisions"
area: people
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: split from traits-research-weights-21 in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Part of traits-research-weights-21. The money and housing decisions (borrowing, quitting, accepting and applying for a job, founding, moving, buying a home, hiring staff and raising pay) weigh temperament at the general weight of 1 with no study behind the size. Add each decision's research row and fit its weight so the weight carries its study.

**Cause.** Found in code: src/core2/data/parameters.json carries (rows such as `traitWeightCreditBorrow`) traitWeightCreditBorrow, traitWeightJobsAcceptOffer, traitWeightJobsApply, traitWeightBusinessFound, traitWeightBusinessOwnerDraw, traitWeightMovesMoveAway, traitWeightHousingBuyHome, traitWeightStaffHire and traitWeightJobsRaiseForOpening at the general weight 1 (recount first), and data/research/trait-effect-sizes.json has no row for them. Merged in from traits-wire-money: borrowing, quitting, accepting, founding, moving, applying, buying a home and the owner draw.

**Fix.** Fix the saturated reasons first (founding, applying, buying, owner draw; traits-money-saturated-reasons is done, so confirm they are still not saturated), then recount which weights sit at 1, add the research rows with quotes, and fit each weight with scripts/traits/trait-calibrate.ts on a played year; a decision that cannot be fitted keeps its gap row with numbers.

**Time box.** 4 hours for one Sonnet session.

**Rules.** Research before building: every row quotes the fetched page and each weight cites its row. No dice: the weight sizes a weighed reason, never a roll. Never loosen a check: a decision the played year cannot fit keeps its gap row with the numbers.

**Done when.** A second session sees that borrowing, quitting, accepting and applying for a job, founding, moving, buying a home, hiring staff and raising pay each carry a cited research row with a fitted ESTIMATED weight in src/core2/data/parameters.json, or a gap row with numbers, as measured by scripts/traits/trait-calibrate.ts on one played year in two drawn places (seeds named), one played year of buildBenchWorld each.

**Waits on.** Nothing.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, scripts/traits/trait-calibrate.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have fitted temperament weights to fetched studies; precision no player sees.
