---
id: laws-session19-fiscal-terms
title: "Sourced fiscal terms for property and income taxes (#2200)"
area: laws
kind: research
priority: 2
status: dropped
claimed-by: claude/laws-session19-fiscal-terms
pr: #2200
blocked-on:
milestone:
source: "open PR #2200"
claimed-at: 2026-10-16T05:30:46.051Z
---

**What.** Sourced fiscal terms for property and income taxes (#2200). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in code and data: data/research/laws/starting-law-2026/fiscal.json, data/research/laws/starting-law-2026/expected-digests/fiscal.sha256, docs/archive/codex/assignments/POOL.md and src/simulation/state-income-tax-law.test.ts. Resolve them (regenerate the digest from the merged fiscal.json) and push. Finish it on the existing branch codex/session19-fiscal-law-terms, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/laws-session19-fiscal-terms.md and the files that pull request #2200 changes on codex/session19-fiscal-law-terms

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2200 (branch codex/session19-fiscal-law-terms): merging main conflicts in code and data: data/research/laws/starting-law-2026/fiscal.json, data/research/laws/starting-law-2026/expected-digests/fiscal.sha256, docs/archive/codex/assignments/POOL.md and src/simulation/state-income-tax-law.test.ts. Resolve them (regenerate the digest from the merged fiscal.json) and push; finish on that branch, merge main into it first.

Checked 2026-10-16 (second look, correcting the note above): re-applying PR #2200's own `fiscal.json` changes (its diff from its merge base) onto current main with main winning the twelve conflicting notes leaves no difference from main. Its sourced fiscal terms, including the Guam and Virgin Islands income-tax terms and the property-assessment growth limits, are already on main. What the PR still has is a change to `src/simulation/state-income-tax-law.ts` and its test, which is old-core code that only the old core reads (`statutory-tax.ts`, `policy-pack-tax-terms.ts`, `public-budgets/month.ts`); AGENTS.md says the old core gets no new features. Dropped; the PR is superseded and can be closed.
