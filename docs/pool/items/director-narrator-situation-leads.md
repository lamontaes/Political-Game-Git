---
id: director-narrator-situation-leads
title: "Scene paragraphs say what is happening by situation type, and the office scene opens with one"
area: director
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr: #4590
blocked-on:
after: director-narrator-sets-scene
source: found while building director-narrator-sets-scene: another session's #4468 landed the same item first
claimed-at:
---

**What.** Each scene paragraph the narrator writes opens with a lead sentence chosen by the situation type, such as a council meeting, a filing visit or a polling place. The office scene in `office-scene.ts` opens with one of these leads before any character speaks. The lead comes from the English engine's parts for that situation type and reads facts from the scene record, so no sentence is hand-written in code.

**Rules.** No hand-written player text: the lead is rendered by the English engine from record data. An effect is a read: the lead states only facts the scene packet carries, such as place, office and who is present. One rule, all 56 places: no place is named in logic or data keyed to one place.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (seed named in the PR), the office scene and one other situation type each open with a narrator lead naming the situation, shown by `src/director/office-scene.test.ts` and a screenshot of the scene in the drawn place. The owner plays it: open the office scene and read the first line.

**Files.** src/director/office-scene.ts, src/director/scene.ts, src/director/render.ts, data/english/parts/.

**Notes.** Follows director-narrator-sets-scene (PR #4468 landed the same idea first).
