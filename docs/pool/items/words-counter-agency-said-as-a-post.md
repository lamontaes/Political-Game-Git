---
id: words-counter-agency-said-as-a-post
title: "At a state filing counter the narration calls the agency the clerk's post"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** At a state counter the counter narration names the filing office's title as the person's post: "Michael Medina, the Pennsylvania Department of State, sets down a stack of mail." (Meadowood, Pennsylvania, seed 16db857d2df58192fb23:0). The clerk row's title for a state counter is the agency, not a person's job. Found while building words-clerk-visit-narration-real; on main before it too.

**Rules.** Scene standard: narration says only what the records support. No hand-written player text: the post comes from the record of the person's own job (their appointment or term), never from the counter's agency name.

**Done when.** In two drawn places with a state counter (named with seeds), the narration names the person by their own post from their job or term record ("a clerk at the Pennsylvania Department of State" or their title), or leaves the post out; a test fails when the {post} slot is filled with an agency name that is not the person's job.

**Files.** src/director/filing-visit.ts, src/core2/modules/filing-clerk.ts, data/english/parts/scene-talk.json

**Notes.** TODO
