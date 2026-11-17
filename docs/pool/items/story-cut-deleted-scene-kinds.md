---
id: story-cut-deleted-scene-kinds
title: "The director stages only the scene kinds on the written list; the 60 unwritten kinds are deleted"
area: director
kind: cleanup
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: claude/story-cut-director
pr: 10011
after:
blocked-on:
lead: story
model: opus
effort: high
root: none
source: owner, Nov 17, after playing v0.113.0; CTO's order on #9750; the Story lead's lists on #9750
---

**What.** The director stages 89 situation types, and 60 of them play lines the English engine never composed from the world's records. The owner hit one in his sitting: a partner's eviction news answered "okay. how much. we'll manage."
Seen: in the owner's sitting on v0.113.0, Nov 17, 2026.

**Cause.** Design: the owner's ruling of Nov 17, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 17): "STOP TRYING TO MAKE SHIT SHINE JUST DELETE EVERYTHING THAT IT HASNT WRITTEN EBCAUSE THIS ISNT HELPING.", confirmed "Yes, that's it. Go."; the CTO's order and the Story lead's KEPT and DELETED lists on issue #9750.

**Fix.** Add src/director/data/kept-scene-kinds.json with the 29 KEPT kinds; delete the 60 DELETED types from situation-types.json with their arcs, variants, circumstances, promise endings, force rows, picture rows, narration leads, scene-list lines, stopgap rows, the reads only they used and their tests; `scheduleMoment` in src/director/scheduling.ts holds back any type not on the list as `not-kept`, which dev mode's director day and scene trace show. The bank lines are the second pull request's.

**Time box.** 6 hours, one Opus session at high.

**Rules.** Replace, never layer: the deleted kinds' data, reads, tests and pointers go in the same change, nothing kept aside. Ask why: the trace says not-kept for any type the list refuses.

**Done when.** A second session plays a new life in a drawn place on main through filing, the campaign and election night and sees no scene of a deleted kind; dev mode's scene view lists only the kept kinds, and tests/guards/director/kept-scene-kinds.test.ts fails when a type not on the list is added to situation-types.json.

**Waits on.** Nothing.

**Files.** src/director/data/kept-scene-kinds.json, src/director/data/situation-types.json, src/director/scheduling.ts, src/director/purpose-scene.ts, tests/guards/director/kept-scene-kinds.test.ts

**Notes.**
