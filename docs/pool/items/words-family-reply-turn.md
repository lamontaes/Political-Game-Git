---
id: words-family-reply-turn
title: "A reply about a relative asks about theirs"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/words-family-reply-turn
pr: #4566
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T11:00:22.523Z
---

**What.** A reply about a relative asks about theirs. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: npm run release:check -- --mode pr fails: docs/release/changes/words-family-reply-turn.md has impact 'player', which must be one of none, patch, minor. The release gate refuses to build on it. Change the impact to patch (or minor) in that declaration, rerun release:check, and push. Finish it on the existing branch claude/words-family-reply-turn, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/words-family-reply-turn.md and the files that pull request #4566 changes on claude/words-family-reply-turn

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).

Sent back 2026-10-16 from PR #4566 (branch claude/words-family-reply-turn): npm run release:check -- --mode pr fails: docs/release/changes/words-family-reply-turn.md has impact 'player', which must be one of none, patch, minor. The release gate refuses to build on it. Change the impact to patch (or minor) in that declaration, rerun release:check, and push; finish on that branch, merge main into it first.
