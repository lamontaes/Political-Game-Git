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

**What.** Sourced fiscal terms for property and income taxes (#2200). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in code and data: data/research/laws/starting-law-2026/fiscal.json, data/research/laws/starting-law-2026/expected-digests/fiscal.sha256, docs/archive/codex/assignments/POOL.md and src/simulation/state-income-tax-law.test.ts. Resolve them (regenerate the digest from the merged fiscal.json) and push. Finish it on the existing branch codex/session19-fiscal-law-terms, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/laws-session19-fiscal-terms.md and the files that pull request #2200 changes on codex/session19-fiscal-law-terms

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2200 (branch codex/session19-fiscal-law-terms): merging main conflicts in code and data: data/research/laws/starting-law-2026/fiscal.json, data/research/laws/starting-law-2026/expected-digests/fiscal.sha256, docs/archive/codex/assignments/POOL.md and src/simulation/state-income-tax-law.test.ts. Resolve them (regenerate the digest from the merged fiscal.json) and push; finish on that branch, merge main into it first.

Checked 2026-10-16: merging main into PR #2200's branch with main winning conflicts leaves a real difference, so it is not superseded: `src/simulation/state-income-tax-law.ts` (21 lines changed), a new 789-line `src/simulation/state-income-tax-law.test.ts` and a release declaration. The conflicts were in `fiscal.json` and its digest (data), `POOL.md` (docs) and that test file. To finish: start from main, re-apply the PR's `state-income-tax-law.ts` change and its test, and re-add its sourced fiscal terms to the current `fiscal.json`; regenerate the digest with the build script.
