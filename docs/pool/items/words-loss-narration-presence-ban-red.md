---
id: words-loss-narration-presence-ban-red
title: "Main red: a family-loss narration piece says only who is waiting"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** tests/guards/english/place-and-presence.test.ts fails on main: data/english/parts/scene-talk.json holds 'The count is in: {office}, lost by {margin}. {name}, who worked the campaign beside you, is waiting.', lifted in #7151, which says only who is there (owner, Oct 27 ban).

**Rules.** The English ban (owner, Oct 27): narration never restates where the player is or who is there; scene-standard.

**Done when.** place-and-presence.test.ts passes on the branch; the family-loss scene still composes (family-loss-stake-scene.test.ts at GOLDEN_PATH_SEED=9edbcb3c944a4d10).

**Files.** data/english/parts/scene-talk.json

**Notes.** Filed by Lane 3 (Nov 4); fix on lane3/red-presence-line.
