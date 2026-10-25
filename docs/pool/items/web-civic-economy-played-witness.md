---
id: web-civic-economy-played-witness
title: "The economy term in a played race reaches the ballots that chose from it"
area: core
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Split from web-reach-civic (PR #6020). In an ordinary played bench world, the first partisan race whose standing carries the national-economy term must keep that term in each moved candidate's result row and in the kept ballots' appeal, so that removing the term would change what the ballots weighed.

**Rules.** Generated-world proof through existing producers only; places drawn from all 56 with bounded redraws that fail when exhausted; bookkeeping on only for election days; the scandal witness stays with web-civic-scandal-played-witness and the family stays with web-reach-civic.

**Done when.** src/core2/outcome-web-civic-played.test.ts, in a drawn place and seed named in the PR body, asserts that each moved candidate's ballot standing equals the result's standing (with local standing for town voters) and differs from it with the economy term removed, and that every kept ballot's scandal term is negative exactly where its voter had heard a story by the race's day and zero elsewhere.

**Files.** src/core2/outcome-web-civic-played.test.ts

**Notes.** Oct 25, fixer: carved out of web-reach-civic on the merger's send-back of #6020, which keeps the family open.
