---
id: core-opening-key-people
title: "The opening's key people list per the ruling"
area: core
kind: wiring
priority: 2
status: done
claimed-by:
pr: #4501
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at:
---

**What.** The opening's key people list per the ruling. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: morning check: (1) it deletes the stopgap row SG-PEOPLE-opening-key-people from src/director/data/stopgaps.json instead of marking it resolved with what replaced it; (2) it edits the director (src/director/opening-sequence.ts, opening-story.ts, opening-story.test.ts and data/opening-story.json) from a core-area item, and only the Words/director session edits src/director. Mark the row resolved (keep it), and move the director changes to the Words session's PR (or get its sign-off on this PR), then merge main and push. Finish it on the existing branch claude/core-opening-key-people, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/core-opening-key-people.md and the files that pull request #4501 changes on claude/core-opening-key-people

**Notes.** Ruling: OWNER-DECISIONS.md, Oct 15 afternoon.

Sent back 2026-10-16 from PR #4501 (branch claude/core-opening-key-people): morning check: (1) it deletes the stopgap row SG-PEOPLE-opening-key-people from src/director/data/stopgaps.json instead of marking it resolved with what replaced it; (2) it edits the director (src/director/opening-sequence.ts, opening-story.ts, opening-story.test.ts and data/opening-story.json) from a core-area item, and only the Words/director session edits src/director. Mark the row resolved (keep it), and move the director changes to the Words session's PR (or get its sign-off on this PR), then merge main and push; finish on that branch, merge main into it first.
