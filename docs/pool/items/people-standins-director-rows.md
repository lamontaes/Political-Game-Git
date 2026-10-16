---
id: people-standins-director-rows
title: "Director journal, conversation, scene, filing-visit and bring-it-up lines come only from the mined banks (from #4151)"
area: director
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-people-standins-oct14"
---

**What.** The #4151 audit made the director's journal, conversations, scenes, filing visit and "bring it up" lines come only from the mined English banks (through a `mined-words` module), deleting the hand-written templates, and closed the SG-P15 bank rows. Main's director and bank work has since moved on (the banks are authored pieces now). Check what main still words by hand and finish that.

**Rules.** No hand-written player text; replace, never layer (the stand-in and its registry row go in the same change); a row is closed only by the replacement, never by deleting the row without it; one rule, all 56 places; no dice.

**Done when.** `grep` for hand-written player sentences in src/director/ finds none; the director suite (journal, conversation, scene, filing-visit, bring-it-up) passes; the registry rows SG-P15-journal-banks, -conversation-banks, -scene-banks, -filing-visit-banks and -bring-it-up-banks are resolved or shown already resolved by id.

**Files.** src/director/journal.ts, src/director/conversation.ts, src/director/scene.ts, src/director/filing-visit.ts, src/director/bring-it-up.ts, src/director/data/

**Notes.** May already be mostly done on main; verify before building. Split from core-people-standins-oct14 (Oct 16): PR #4151 (branch stopgaps/people-core) now conflicts with main in about 40 files and was not merged; its table of rows is in that PR's description.
