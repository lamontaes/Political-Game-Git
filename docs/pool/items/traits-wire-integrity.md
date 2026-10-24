---
id: traits-wire-integrity
title: "Justice, tips, recalls, constituent cases, staff and bribes weigh an official's own integrity in play"
area: people
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #5715
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** This is one bounded family of the trait wiring audit (`traits-wiring-audit`, reopened Oct 24). Every decision in the corruption, recalls, appointments and cases family: justice, reporters' tips, recalls, constituent cases, what staff are told, and whether a bribe is taken must run in a played year and weigh the person's traits at a size taken from research. A decision with no study keeps the owner's general weight of 1 only with a gap row that says why. Twins with traits flat or mirrored must show the decisions turning, at the rate the research gives, never at overwhelming odds.

**Rules.** No dice: a trait weighs one reason among the person's recorded reasons and never rolls an outcome; real rates check totals only. One model, two tiers: counted people decide through the same shared formula times their count. Wire to the world: each decision is shown running in a played year, by record id.

**Done when.** `scripts/traits/trait-wiring-audit.ts` (played, flat and mirror twins) and `scripts/traits/trait-wiring-matrix.ts` on one year of `buildBenchWorld` in two places drawn from all 56, seeds named in the PR body show every decision in this family with calls above zero in the played year, its `traitWeight` row cited to its study in `data/research/trait-effect-sizes.json` or a gap row in `data/content/trait-decision-gaps.json`, and its turned share and top-third against bottom-third pick rates beside the research target. The family test names the decision record ids of two people who chose differently for their traits.

**Files.** src/core2/trait-decisions.ts, src/core2/modules/corruption.ts, src/core2/modules/recalls.ts, src/core2/modules/constituent-cases.ts

**Notes.** Split Oct 24 by the CTO from `traits-wiring-audit` (order `docs/work-orders/lead-traits-2026-10-24.md`). PR #5715 (branch claude/traits-integrity) holds the reads and has conflicted with main since Oct 21. Bribes: every offer was declined on Oct 20 because the honest pull of 3 never loses (`src/core2/modules/corruption.ts`); `people-corruption-honest-pull-calibrated` (in review) calibrates it. Land it with this family. A PR for this family names this item on line 1 (`Pool item: traits-wire-integrity`) and `Lead: traits` in its body; a bare `traits-wiring-audit` on line 1 marked the audit done on merge, which is the auto-done bug.
