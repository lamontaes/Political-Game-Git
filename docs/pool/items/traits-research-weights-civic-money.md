---
id: traits-research-weights-civic-money
title: "Six personality decisions whose studies arrive with the civic and money families get calibrated weights"
area: people
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/traits-research-weights-civic
pr: #6017
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T09:42:36.103Z
---

**What.** Following the news, retelling a story, filing an unemployment claim, being persuaded, trusting, and raising an unfilled opening's pay still weigh temperament at the general weight of 1. Their study rows came with the civic family (traits-wire-civic, #5657) and the money family (traits-wire-money, #5587), not with main, so traits-research-weights-21 could not fit them on main. Fit each against its row with scripts/traits/trait-calibrate.ts on played years of a branch carrying those rows.

**Rules.** Research before building: each weight cites its row and the played years it was fitted on. Never loosen a check: a decision a played year cannot fit keeps a gap row with its numbers. No dice.

**Done when.** In one year of buildBenchWorld in each of two places drawn from all 56, seeds named, on a head carrying the civic and money rows, press.follow-news, speech.retell, jobs-benefits.file-claim, views.persuasion, views.trust and jobs.raise-for-opening each have a fitted weight tagged ESTIMATED with its row's citation, or a gap row naming why it cannot.

**Files.** src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Split from traits-research-weights-21 by the traits lead on Oct 25; the civic five are being fitted on claude/traits-research-weights-civic (stacked on #5657).
