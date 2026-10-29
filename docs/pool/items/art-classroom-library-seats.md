---
id: art-classroom-library-seats
title: "ART-5 classroom and library chair seat positions (#3492)"
area: art
kind: feature
priority: 2
status: dropped
claimed-by:
pr: #5339
blocked-on:
milestone:
source: "open PR #3492"
claimed-at:
---

**What.** ART-5 classroom and library chair seat positions (#3492). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in art/backdrops/staging.json, docs/art/seating-audit.md (code or data, left for the author); resolve and push. Finish it on the existing branch session-56-art5-education, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** docs/pool/items/art-classroom-library-seats.md and the files that pull request #3492 changes on session-56-art5-education

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #3492 (branch session-56-art5-education): merging main conflicts in art/backdrops/staging.json, docs/art/seating-audit.md (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Looked at 2026-10-16 (claude session), not merged: session-56-art5-education (Oct 7) and main both added chair anchors to the public library and the classroom (main: 12 library anchors and a moved classroom point; the branch: eight reading-table chairs, a reference chair and six cushion positions), and the two sets of measured positions overlap in `art/backdrops/staging.json`. Merging them is a measurement call against the pictures: keep each chair once, from the better measurement.
PR #3492 closed unmerged (2026-10-16); reopened by the pool reconcile Oct 19.

Sent back 2026-10-23 from PR #5339 (branch session-56-art5-education): The shipped measuredFrom values still include October 7 ART-5; remove the date/session notes, supply the Done-when table and visual seating evidence; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): close (superseded by people-plates, OD:49; the chair anchors it measures are replaced).
