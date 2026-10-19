---
id: world-money-calibration-sources
title: "Money calibration sources without restricted originals (#713)"
area: world
kind: research
priority: 2
status: in-pr
claimed-by: codex/assignments-5-money-sources-safe
pr: #713
blocked-on:
milestone:
source: "open PR #713"
claimed-at: 2026-10-19T21:55:20.016Z
---

**What.** Money calibration sources without restricted originals (#713). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: scripts/source/regional-money/missing-money-sources.test.ts fails: missing-money-sources.ts imports ../../../src/source/core/archive/zip, which main deleted in 'Delete unused files from the old game and tooling' (595b46a9d3). Replace the zip reader with one that exists on main (or write it fresh) and rerun the test; the PR body also lacks a gate line at the top. Finish it on the existing branch codex/assignments-5-money-sources-safe, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/world-money-calibration-sources.md and the files that pull request #713 changes on codex/assignments-5-money-sources-safe

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #713 (branch codex/assignments-5-money-sources-safe): scripts/source/regional-money/missing-money-sources.test.ts fails: missing-money-sources.ts imports ../../../src/source/core/archive/zip, which main deleted in 'Delete unused files from the old game and tooling' (595b46a9d3). Replace the zip reader with one that exists on main (or write it fresh) and rerun the test; the PR body also lacks a gate line at the top; finish on that branch, merge main into it first.
