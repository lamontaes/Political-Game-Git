---
id: laws-session19-fiscal-terms
title: "Sourced fiscal terms for property and income taxes (#2200)"
area: laws
kind: research
priority: 2
status: open
claimed-by:
pr: #2200
blocked-on:
milestone:
source: "open PR #2200"
claimed-at: 
---

**What.** Assessment growth limits in 15 places; Guam and USVI income-tax schedules. New Mexico cap unknown. Merge main and gate line.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2200 (branch codex/session19-fiscal-law-terms): merging main conflicts in code and data: data/research/laws/starting-law-2026/fiscal.json, data/research/laws/starting-law-2026/expected-digests/fiscal.sha256, docs/archive/codex/assignments/POOL.md and src/simulation/state-income-tax-law.test.ts. Resolve them (regenerate the digest from the merged fiscal.json) and push; finish on that branch, merge main into it first.
