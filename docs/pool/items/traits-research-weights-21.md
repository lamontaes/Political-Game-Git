---
id: traits-research-weights-21
title: "Twenty-one personality decisions at the general weight get weights calibrated from fetched studies"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Of 89 personality decisions with every traits family in, 53 still weigh temperament at the general weight of 1. A research pass on Oct 24 fetched and quoted studies for 21 of them (party joining and attending, group membership, following the news, persuasion, trust, believing a claim, retelling, bringing a case, filing a claim, claiming retirement, borrowing, hiring staff, a lobbyist speaking up, endorsing, planning a child, wills and trusts, contract awards, raising pay for an opening, accepting an appointment). Add those rows to data/research/trait-effect-sizes.json and calibrate each decision's weight against them with scripts/traits/trait-calibrate.ts on a played year, so the weight carries its study instead of the general 1.

**Rules.** Research before building: every row quotes the fetched page and each weight cites its row; a proxy outcome says so. No dice: the weight sizes a weighed reason, never a roll. Never loosen a check: a decision whose calibration the played year cannot fit keeps its gap row with the numbers.

**Done when.** In one year of buildBenchWorld in each of two places drawn from all 56, seeds named, with every traits family merged, scripts/traits/trait-calibrate.ts gives each of the 21 decisions a weight from its new row or names why it cannot (too few calls, a size not a choice); src/core2/data/parameters.json carries each fitted weight tagged ESTIMATED with its row's citation, and scripts/traits/trait-wiring-matrix.ts shows the count of research-weighted decisions rising from 36.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Rows found Oct 24 by a research helper under the traits lead: 59 rows, every quote matched against the downloaded text. Not found: staff.dismiss (weak proxy only) and legislature.budget-priorities.

Sent back 2026-10-25 from PR #6009 (branch claude/traits-research-weights): main integration conflicts in production data/content/trait-decision-gaps.json; abort; reconcile bounded endorsement/estate delivery with still-unmerged all-family21-decision acceptance before completion; finish on that branch, merge main into it first.

Oct 25 (traits lead): PR #6009's delivered subset (endorsing at its study's size; study and gap rows for planning a child, wills, trusts and contract awards) moved to `traits-research-weights-endorse-estates`. This item's 21-decision acceptance stays open until every traits family (#5587, #5657, #5715) is merged; the per-decision weights in flight are on #6017, #6039 and #6001.
