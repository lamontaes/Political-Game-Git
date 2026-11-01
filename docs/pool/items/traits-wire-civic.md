---
id: traits-wire-civic
title: "Turnout, news telling, meetings, parties, interest groups, press and claims weigh personality at researched sizes in play"
area: people
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
---

**What.** This is one bounded family of the trait wiring audit (`traits-wiring-audit`, reopened Oct 24). Every decision in the civic life and news family: voting turnout, telling news, meetings, parties, interest groups, press contact, believing a claim, persuasion and trust must run in a played year and weigh the person's traits at a size taken from research. A decision with no study keeps the owner's general weight of 1 only with a gap row that says why. Twins with traits flat or mirrored must show the decisions turning, at the rate the research gives, never at overwhelming odds.

**Rules.** No dice: a trait weighs one reason among the person's recorded reasons and never rolls an outcome; real rates check totals only. One model, two tiers: counted people decide through the same shared formula times their count. Wire to the world: each decision is shown running in a played year, by record id.

**Done when.** `scripts/traits/trait-wiring-audit.ts` (played, flat and mirror twins) and `scripts/traits/trait-wiring-matrix.ts` on one year of `buildBenchWorld` in two places drawn from all 56, seeds named in the PR body show every decision in this family with calls above zero in the played year, its `traitWeight` row cited to its study in `data/research/trait-effect-sizes.json` or a gap row in `data/content/trait-decision-gaps.json`, and its turned share and top-third against bottom-third pick rates beside the research target. The family test names the decision record ids of two people who chose differently for their traits. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/trait-decisions.ts, src/core2/modules/voting.ts, src/core2/modules/news.ts, src/core2/modules/parties.ts, src/core2/data/parameters.json

**Notes.** Split Oct 24 by the CTO from `traits-wiring-audit` (order `docs/work-orders/lead-traits-2026-10-24.md`). PR #5657 (branch claude/traits-civic) holds it and has conflicted with main since Oct 21. After #5745 merged, the Mondak-calibrated weights must be rescaled by each trait's own standard deviation (openness and emotional stability 1.1, extraversion 1.3) or recalibrated with `scripts/traits/trait-calibrate.ts`. A PR for this family names this item on line 1 (`Pool item: traits-wire-civic`) and `Lead: traits` in its body; a bare `traits-wiring-audit` on line 1 marked the audit done on merge, which is the auto-done bug.

Sent back 2026-10-24 from PR #5657 (branch claude/traits-civic): family acceptance requires positive calls and rate evidence for every decision, but ballot-measures.vote and employer-join have zero calls in both years and seven decisions lack pick rates; complete that evidence or bound the delivered subset while retaining the family open; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #5657 (branch claude/traits-civic): corrected employer/ballot proof still leaves zero ballot calls in one audit year and overwhelming reported odds versus research targets; non-Words branch also edits director conversation reader; repair or bound acceptance and route director seam through Words; finish on that branch, merge main into it first.

Oct 25 (traits lead): PR #5657's completed slice (believing a story, party meetings, joining a group and passing on news at their study sizes, with a gap row for every other civic decision) moved to `traits-civic-shared-rule`, and the PR's director change moved to the Words line as `words-director-claims-shared-rule`. This item stays open for the rest: the ballot-measure vote in both audit years, and backing the incumbent, telling an exit pollster, holding a town hall, joining a party, a lobbyist speaking up, accepting an interview and taking part at a meeting at their research rates. Each one's gap row names its cause and numbers.
Claim released Oct 25: branch never pushed (`claude/traits-wire-civic-rest`).

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/traits-wire-civic` is kept; claiming this item takes it over.
