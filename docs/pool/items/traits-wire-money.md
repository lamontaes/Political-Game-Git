---
id: traits-wire-money
title: "Borrowing, quitting, accepting, founding, moving, applying and buying a home weigh personality at researched sizes in play"
area: people
kind: wiring
priority: 1
size: M
status: claimed
claimed-by: claude/traits-money
pr: #5587
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 2026-10-24T16:31:51.741Z
---

**What.** This is one bounded family of the trait wiring audit (`traits-wiring-audit`, reopened Oct 24). Every decision in the jobs, money and housing family: borrowing, quitting, accepting a job, founding a business, moving, applying for a job, buying a home and an owner's draw must run in a played year and weigh the person's traits at a size taken from research. A decision with no study keeps the owner's general weight of 1 only with a gap row that says why. Twins with traits flat or mirrored must show the decisions turning, at the rate the research gives, never at overwhelming odds.

**Rules.** No dice: a trait weighs one reason among the person's recorded reasons and never rolls an outcome; real rates check totals only. One model, two tiers: counted people decide through the same shared formula times their count. Wire to the world: each decision is shown running in a played year, by record id.

**Done when.** `scripts/traits/trait-wiring-audit.ts` (played, flat and mirror twins) and `scripts/traits/trait-wiring-matrix.ts` on one year of `buildBenchWorld` in two places drawn from all 56, seeds named in the PR body show every decision in this family with calls above zero in the played year, its `traitWeight` row cited to its study in `data/research/trait-effect-sizes.json` or a gap row in `data/content/trait-decision-gaps.json`, and its turned share and top-third against bottom-third pick rates beside the research target. The family test names the decision record ids of two people who chose differently for their traits.

**Files.** src/core2/trait-decisions.ts, src/core2/choice.ts, src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/data/parameters.json

**Notes.** Split Oct 24 by the CTO from `traits-wiring-audit` (order `docs/work-orders/lead-traits-2026-10-24.md`). PR #5587 (branch claude/traits-money) holds most of it and has conflicted with main since Oct 21. Applying, buying a home and the owner's draw were saturated by circumstances on Oct 20 (founding's market-room reason weighs 6 against a lean held within -1 to 1, so personality turned 0 of 36,326 weighings); fix their reasons so circumstances vary, then calibrate. A PR for this family names this item on line 1 (`Pool item: traits-wire-money`) and `Lead: traits` in its body; a bare `traits-wiring-audit` on line 1 marked the audit done on merge, which is the auto-done bug.

Sent back 2026-10-24 from PR #5587 (branch claude/traits-money): Family completion still defers saturated applying/buying/owner-draw/founding choices explicitly required by item Notes, with 0 percent turned and zero housing arrears calls despite the positive-call Done-when row; finish on that branch, merge main into it first.
