---
id: words-counter-agency-said-as-a-post
title: "At a state filing counter the narration calls the agency the clerk's post"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-words-counter-agency-said-as-a-post
pr: #8520
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:12:51.390Z
---

**What.** At a state counter the counter narration names the filing office's title as the person's post: "Michael Medina, the Pennsylvania Department of State, sets down a stack of mail." (Meadowood, Pennsylvania, seed 16db857d2df58192fb23:0). The clerk row's title for a state counter is the agency, not a person's job. Found while building words-clerk-visit-narration-real; on main before it too.

**Cause.** Found in code: src/director/filing-visit.ts fills the {post} slot from clerk.title (line 368), and src/core2/modules/filing-clerk.ts stateElectionChief (line 101) returns `title: chief.title` from the agency head row, which for Meadowood, Pennsylvania (seed 16db857d2df58192fb23:0) produced 'Michael Medina, the Pennsylvania Department of State'. Not run.

**Fix.** Fill {post} from the person's own job or term record (their appointment title), or leave the slot out, never from the counter's agency name; add a test that fails when {post} is filled with an agency name.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Scene standard: narration says only what the records support. No hand-written player text: the post comes from the record of the person's own job (their appointment or term), never from the counter's agency name.

**Done when.** A second session visits a state counter in two drawn places (named with seeds, Meadowood, Pennsylvania seed 16db857d2df58192fb23:0 among them) and sees the narration name the person by their own post from their job or term record, or leave the post out; a test fails when the {post} slot holds an agency name that is not the person's job.

**Waits on.** Nothing.

**Files.** src/director/filing-visit.ts, src/core2/modules/filing-clerk.ts, data/english/parts/scene-talk.json

**Notes.** TODO
