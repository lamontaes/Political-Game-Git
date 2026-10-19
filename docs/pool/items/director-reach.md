---
id: director-reach
title: "Order 4: every situation whose producer exists fires in play from its cause record"
area: director
kind: wiring
priority: 2
status: done
claimed-by:
pr: #4508
blocked-on:
milestone:
source: "words-and-director order 4"
claimed-at:
---

**What.** Order 4: every situation whose producer exists fires in play from its cause record. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: morning check: it deletes the stopgap row SG-WORLD... 'SG-WORDS-office-scene-town-members' from src/director/data/stopgaps.json. Keep the row and mark it status resolved with what replaced it (officialParts now reads the views engine's stance), as other PRs do; a deleted row is refused. It also edits core files (src/core2/modules/officials.ts and views.ts) from the director line, so say in the PR that the government/core owner agreed. Finish it on the existing branch claude/director-reach, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/director-reach.md and the files that pull request #4508 changes on claude/director-reach

**Notes.** words-catalog-coverage (the blocked-on item) is done as of 2026-10-15 (PR #4398), so the block can clear.

Sent back 2026-10-16 from PR #4508 (branch claude/director-reach): morning check: it deletes the stopgap row SG-WORLD... 'SG-WORDS-office-scene-town-members' from src/director/data/stopgaps.json. Keep the row and mark it status resolved with what replaced it (officialParts now reads the views engine's stance), as other PRs do; a deleted row is refused. It also edits core files (src/core2/modules/officials.ts and views.ts) from the director line, so say in the PR that the government/core owner agreed; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4508 (branch claude/director-reach): Merger: not merged. Merging current main into this branch conflicts in src/director/data/stopgaps.json (a Words-area data file, so I left it for the author). Please merge main, resolve the rows by id keeping every row from both sides, and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4508 (branch claude/director-reach): Morning check: the director branch edits src/core2/modules/officials.ts and src/core2/modules/views.ts outside its area. The PR body explicitly says neither the government nor core area has been asked for agreement. Obtain and record the relevant area agreement on this PR, or split those edits into the owning area’s PR. The old stopgap-row deletion is fixed and main now merges cleanly; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4508 (branch claude/director-reach): The director branch still changes Government-owned officials.ts and People-owned views.ts outside its area. The body explicitly says the owning areas have not been asked, and no agreement appears in the discussion. Record the relevant area agreement or split those engine edits into owning-area PRs; the existing ownership correction remains unresolved on this updated head; finish on that branch, merge main into it first.
