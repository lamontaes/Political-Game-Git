---
id: play-state-of-union-picture
title: "The State of the Union opens on the House floor, not the White House"
area: play
kind: feature
priority: 3
size: S
status: done
claimed-by:
pr: #4705
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at:
---

**What.** The opening's President stage shows the White House exterior even for the State of the Union, which is given in the House chamber (`src/bench/data/opening-pictures.json`, `stages.president`). Show the House floor for that kind of address, so the picture matches what the Speaker's salutation says.

**Rules.** No hand-written player text: the picture is chosen by the speech kind in data. Preserve asset originals and lineage.

**Done when.** In a drawn place and seed (named in the PR body) the opening for a State of the Union year loads the House chamber picture and an inaugural year loads the one it did, shown by the picture file in the opening record; a test in src/bench covers both kinds.

**Files.** src/bench/data/opening-pictures.json, src/bench/opening.ts

**Notes.** From the Words session's notes (Oct 14).

Sent back 2026-10-16 from PR #4705 (branch claude/state-of-union-picture): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4705 (branch claude/state-of-union-picture): Merging current main into claude/state-of-union-picture conflicts in src/bench/data/opening-pictures.json, src/bench/opening.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4705 (branch claude/state-of-union-picture): merging main conflicts in src/bench/data/opening-pictures.json, src/bench/opening.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
