---
id: director-narrator-situation-leads
title: "Scene paragraphs say what is happening by situation type, and the office scene opens with one"
area: director
kind: feature
priority: 2
size: S
status: done
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

Looked at 2026-10-16 (claude session), not built: the narrator paragraph already composes the day, the setting, who is present and what led here (`scene.ts`, 47 mined parts in `data/english/parts/scene-words.json`). A lead per situation type (a council meeting, a filing visit, a polling place) is new sentence text. That comes from the Words line's mining or the civic-prose authoring process with origin, author and date, graded by the owner, not from a builder writing lines in code.

Sent back 2026-10-16 from PR #4590 (branch claude/director-narrator-situation-leads-2): Sent back by the merger: eslint fails on this branch merged with current main: src/director/office-scene.ts 47:10 error 'questionName' is defined but never used (@typescript-eslint/no-unused-vars). Remove the unused import or use it, rerun eslint on the changed files, and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.
