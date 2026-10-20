---
id: laws-session18-law-amounts
title: "Sourced Session 18 starting-law terms (#2229)"
area: laws
kind: research
priority: 2
status: in-pr
claimed-by: codex/session18-law-amounts
pr: #5092
blocked-on:
milestone:
source: "open PR #2229"
claimed-at: 2026-10-19T18:46:51.185Z
---

**What.** Sourced Session 18 starting-law terms (#2229). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in data/research/laws/starting-law-2026.json (data, left for the author); resolve and push. The body also has no gate line and calls itself a partial review draft. Finish it on the existing branch codex/session18-law-amounts, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/laws-session18-law-amounts.md and the files that pull request #2229 changes on codex/session18-law-amounts

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2229 (branch codex/session18-law-amounts): merging main conflicts in data/research/laws/starting-law-2026.json (data, left for the author); resolve and push. The body also has no gate line and calls itself a partial review draft; finish on that branch, merge main into it first.

Checked 2026-10-16: PR #2229 re-adds a single 26,000-line `data/research/laws/starting-law-2026.json`, a layout main no longer has (main splits the starting law into per-family files under `data/research/laws/starting-law-2026/`, each with a digest in `expected-digests/`). It cannot be merged as is. To finish: take the rows the PR adds for its three areas (business-commerce, technology-privacy, government-operations), put each into the matching per-family file on main, regenerate the digests with the build script, and open a new PR from main. Do not merge main into the old branch.
