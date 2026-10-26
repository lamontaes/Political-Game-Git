---
id: world-census-weight-hiring
title: "Hiring, layoffs and openings treat a counted job record as as many jobs as its household weight"
area: world
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/world-census-weight-hiring
pr: #4784
blocked-on:
after: world-census-weight-headcount
source: added with npm run pool -- add
claimed-at: 2026-10-17T01:02:27.367Z
---

**What.** Hiring, layoffs and openings treat a counted job record as as many jobs as its household weight. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The new counted-weight-hiring.test.ts can pass without exercising its claims: the replacement-opening test asserts only inside base/scaled loops without requiring any matched openings, and the layoff test returns early when told.length is zero. The morning check refuses skipped tests. Require an applicable generated/edge fixture with actual weighted replacement openings and an employer to lay off, then retain the weight and no-over-layoff assertions rather than passing empty coverage. Finish it on the existing branch claude/world-census-weight-hiring, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/world-census-weight-hiring.md and the files that pull request #4784 changes on claude/world-census-weight-hiring

**Notes.** Split from world-census-weight-economy (claude/world-census-weight-economy) when it was claimed: the original is an L. The weight is `CountedStore.weightOf` (core-census-weight-model, merged); counted money already moves times the weight (core-census-weight-money, #4467). Test by opening a drawn town with `buildBenchWorld(..., { countScale: 3 })` against the same seed at scale one.

Sent back 2026-10-16 from PR #4784 (branch claude/world-census-weight-hiring): The new counted-weight-hiring.test.ts can pass without exercising its claims: the replacement-opening test asserts only inside base/scaled loops without requiring any matched openings, and the layoff test returns early when told.length is zero. The morning check refuses skipped tests. Require an applicable generated/edge fixture with actual weighted replacement openings and an employer to lay off, then retain the weight and no-over-layoff assertions rather than passing empty coverage; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4784 (branch claude/world-census-weight-hiring): merging main conflicts in src/core2/modules/jobs.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
