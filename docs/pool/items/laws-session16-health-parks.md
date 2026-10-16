---
id: laws-session16-health-parks
title: "Sourced health and parks law amounts (#2221)"
area: laws
kind: research
priority: 2
status: dropped
claimed-by:
pr: #2221
blocked-on:
milestone:
source: "open PR #2221"
claimed-at:
---

**What.** Sourced health and parks law amounts (#2221). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in data/research/laws/starting-law-2026/civil-family-community.json, its expected-digests sha256 and docs/archive/codex/assignments/POOL.md (data/code, left for the author); resolve (regenerate the digest from the merged json) and push. Finish it on the existing branch codex/session16-starting-law-partial, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/laws-session16-health-parks.md and the files that pull request #2221 changes on codex/session16-starting-law-partial

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #2221 (branch codex/session16-starting-law-partial): merging main conflicts in data/research/laws/starting-law-2026/civil-family-community.json, its expected-digests sha256 and docs/archive/codex/assignments/POOL.md (data/code, left for the author); resolve (regenerate the digest from the merged json) and push; finish on that branch, merge main into it first.

Checked 2026-10-16: merging current main into PR #2221's branch with main's side winning every conflict leaves the PR differing from main only by its release declaration (`docs/release/changes/sourced-health-and-parks-law-amounts.md`). The ten parks rows it conflicts on (Alabama through Texas) are already on main with fuller notes, so its data has landed by other means. Dropped; the PR is superseded and can be closed.
