---
id: words-journal-volunteer-named
title: "The Journal names the relative who walked doors, not 'someone from my campaign'"
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

**What.** Confirmer replay of path 6 in Storrs, Connecticut (storrs-1): Emily Carter's father Raymond Jimenez walked doors for her campaign, and her Journal said 'Someone from my campaign walked 33 doors for me.' The volunteer-shift row's own lines named no one.

**Rules.** No hand-written player text: the named lines are bank pieces. One engine: the Journal names a person it knows the way its other lines do ({other}: a relative by relation, anyone else by name).

**Done when.** In a played world (family-loss-stake-scene.test.ts, drawn places, place and seed named), the Journal lines about a relative's door-knocking name the relative, never 'Someone' or 'A volunteer'.

**Files.** src/english/journal-words.ts, src/director/journal.ts, data/english/parts/journal.json, src/director/family-loss-stake-scene.test.ts

**Notes.** Lane 3, Nov 4: built on lane3/journal-names-helper.
