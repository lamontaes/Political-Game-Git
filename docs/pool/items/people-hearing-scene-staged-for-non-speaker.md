---
id: people-hearing-scene-staged-for-non-speaker
title: "A public hearing scene is staged around a person who did not speak, naming them as the speaker"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/hearing-speaker-g08lgv
pr: #5055
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:24:31.673Z
---

**What.** A watched person who only heard of a public comment through a friend who spoke got a hearing scene that named them as the speaker. The hearing scene binds the person the moment belongs to as its speaker, and the director gives that moment to anyone tied to a speaker, scaled by the tie. The comment record names only those who spoke, so the scene put a listener at the lectern. It showed up as the red hearing-scenes test on main in the town drawn from the pinned seed.

**Rules.** No hand-written player text; an effect is a read: the scene must cite a record that names its speaker. Ask why: the hearing scene answers why this person spoke from the comment record's own people. A listener's moment stays a journal line.

**Done when.** A person not named in a public-comment record gets no hearing scene from it, a person named in it still does, the hearing-scenes test passes in the town drawn from the seed that failed, and the director tests pass.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/cause-names.test.ts.

**Notes.** Adds a match condition `causeNames` that requires the cause record to name the moment's person; other scene types are untouched.

Sent back 2026-10-20 from PR #5055 (branch claude/hearing-speaker-named): Merge main 4424a9ec32da into claude/hearing-speaker-named conflicts in: src/director/scheduling.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.
