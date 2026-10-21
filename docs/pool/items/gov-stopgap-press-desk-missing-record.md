---
id: gov-stopgap-press-desk-missing-record
title: "Stopgaps in press-desk (missing-record): 1 open"
area: gov
kind: stopgap
priority: 2
status: done
claimed-by:
pr: #4536
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/press-desk.ts, kind missing-record"
claimed-at:
---

**What.** Stopgaps in press-desk (missing-record): 1 open. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: morning check: the diff deletes the stopgap row SG-PEOPLE-press-bring-it-up-row from src/core2/data/stopgaps.json (25 lines added, 37 removed). A built stopgap stays in the file with status resolved and a note on what replaced it; a deleted row is refused. Restore the row as resolved, merge main, push. Finish it on the existing branch claude/gov-stopgap-press-desk-missing-record, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-stopgap-press-desk-missing-record.md and the files that pull request #4536 changes on claude/gov-stopgap-press-desk-missing-record

**Notes.** First row: Readers of a printed story learn which outlet printed what (the perceived fact printed:<outlet>:story), which bring-it-up's matcher reads, but bring-it-up's data has no change row for a printed story yet, so no one says

Sent back 2026-10-16 from PR #4536 (branch claude/gov-stopgap-press-desk-missing-record): morning check: the diff deletes the stopgap row SG-PEOPLE-press-bring-it-up-row from src/core2/data/stopgaps.json (25 lines added, 37 removed). A built stopgap stays in the file with status resolved and a note on what replaced it; a deleted row is refused. Restore the row as resolved, merge main, push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4536 (branch claude/gov-stopgap-press-desk-missing-record): Merger: not merged. Checks pass, but this PR changes files under src/director/ (bring-it-up.ts, bring-it-up-press.test.ts, data/bring-it-up-rows.json) and data/english/parts/bring-it-up.json, scripts/english-corpus/moves.json, which only the Words session may edit (AGENTS.md, The team), and the branch is a gov branch. If the Words session wrote or approved this, say so and the CTO can merge it; otherwise the Words session should take the director and corpus parts; finish on that branch, merge main into it first.
