---
id: world-money-calibration-sources
title: "Money calibration sources without restricted originals (#713)"
area: world
kind: research
priority: 2
status: open
claimed-by:
pr: #713
blocked-on:
milestone:
source: "open PR #713"
claimed-at: 
---

**What.** Government and Freddie Mac inputs and seven calibration corpora. Merge main, gate line, confirm no restricted originals ship.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #713 (branch codex/assignments-5-money-sources-safe): scripts/source/regional-money/missing-money-sources.test.ts fails: missing-money-sources.ts imports ../../../src/source/core/archive/zip, which main deleted in 'Delete unused files from the old game and tooling' (595b46a9d3). Replace the zip reader with one that exists on main (or write it fresh) and rerun the test; the PR body also lacks a gate line at the top; finish on that branch, merge main into it first.
