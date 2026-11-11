---
id: traits-research-weights-21
title: "Twenty-one personality decisions at the general weight get weights calibrated from fetched studies"
area: people
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on: traits-research-weights-21-part-1-civic-decisions,traits-research-weights-21-part-2-money-housing-decisions,traits-research-weights-21-part-3-integrity-government-decisions,traits-research-weights-21-part-4-life-stage-decisions
lead: traits
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** Of 89 personality decisions with every traits family in, 53 still weigh temperament at the general weight of 1. A research pass on Oct 24 fetched and quoted studies for 21 of them (party joining and attending, group membership, following the news, persuasion, trust, believing a claim, retelling, bringing a case, filing a claim, claiming retirement, borrowing, hiring staff, a lobbyist speaking up, endorsing, planning a child, wills and trusts, contract awards, raising pay for an opening, accepting an appointment). Add those rows to data/research/trait-effect-sizes.json and calibrate each decision's weight against them with scripts/traits/trait-calibrate.ts on a played year, so the weight carries its study instead of the general 1.

**Cause.** Found in code: src/core2/data/parameters.json carries many traitWeight* rows at the general weight 1 (for example traitWeightLifeDailyAct, line 5821); data/research/trait-effect-sizes.json has no row for the 21 decisions the Oct 24 research pass fetched (party joining and attending, group membership, news, persuasion, trust, believing a claim, retelling, bringing a case, filing a claim, claiming retirement, borrowing, hiring staff, lobbyist, endorsing, planning a child, wills and trusts, contract awards, raising pay, accepting an appointment). The Oct 24 count of 53 decisions at weight 1 is stale; recount first.

**Fix.** Work the four parts (civic, money and housing, integrity and government, life stage), one PR each; each recounts which of its decisions still sit at weight 1, adds the research rows with quotes, and fits each weight with scripts/traits/trait-calibrate.ts on a played year; a decision that cannot be fitted keeps its gap row with numbers. Planning a child and the daily act stay with their own items. This item also carries traits-wire-money and traits-wire-integrity, merged in.

**Time box.** 8 hours across the four parts; this item is done when all four are merged and seen.

**Rules.** Research before building: every row quotes the fetched page and each weight cites its row; a proxy outcome says so. No dice: the weight sizes a weighed reason, never a roll. Never loosen a check: a decision whose calibration the played year cannot fit keeps its gap row with the numbers.

**Done when.** A second session runs scripts/traits/trait-wiring-matrix.ts after the four parts are merged, in one year of buildBenchWorld in each of two places drawn from all 56 (seeds named), and sees the count of research-weighted decisions rising from 36 and each of the 21 decisions carrying a cited row or a gap row with numbers.

**Waits on.** Its parts: traits-research-weights-21-part-1-civic-decisions, traits-research-weights-21-part-2-money-housing-decisions, traits-research-weights-21-part-3-integrity-government-decisions, traits-research-weights-21-part-4-life-stage-decisions (listed in blocked-on).

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, scripts/traits/trait-calibrate.ts, scripts/traits/trait-wiring-matrix.ts

**Notes.** Rows found Oct 24 by a research helper under the traits lead: 59 rows, every quote matched against the downloaded text. Not found: staff.dismiss (weak proxy only) and legislature.budget-priorities.

Sent back 2026-10-25 from PR #6009 (branch claude/traits-research-weights): main integration conflicts in production data/content/trait-decision-gaps.json; abort; reconcile bounded endorsement/estate delivery with still-unmerged all-family21-decision acceptance before completion; finish on that branch, merge main into it first.

Oct 25 (traits lead): PR #6009's delivered subset (endorsing at its study's size; study and gap rows for planning a child, wills, trusts and contract awards) moved to `traits-research-weights-endorse-estates`. This item's 21-decision acceptance stays open until every traits family (#5587, #5657, #5715) is merged; the per-decision weights in flight are on #6017, #6039 and #6001.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have fitted temperament weights to fetched studies; precision no player sees.
