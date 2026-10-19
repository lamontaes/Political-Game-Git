---
id: play-politics-hub
title: "Politics opens as a compact hub (#4296)"
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-politics-hub
pr: #4577
blocked-on:
milestone:
source: "astra order 1; PR #4296 branch play/politics-hub"
claimed-at: 2026-10-16T11:33:15.889Z
---

**What.** Politics opens as a compact hub (#4296). This work was sent back by the merger on 2026-10-15 and is open for any builder to finish. The reason it came back: code conflict with main in src/bench/play.mjs, src/bench/data/controls.json. Finish it on the existing branch play/politics-hub, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/play-politics-hub.md and the files that pull request #4296 changes on play/politics-hub

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4296 (branch play/politics-hub): code conflict with main in src/bench/play.mjs, src/bench/data/controls.json; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4577 (branch claude/play-politics-hub): merging main conflicts in src/bench/play.mjs (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
