---
id: director-narrator-situation-leads
title: "Scene paragraphs say what is happening by situation type, and the office scene opens with one"
area: director
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: director-narrator-sets-scene
source: found while building director-narrator-sets-scene: another session's #4468 landed the same item first
---

**What.** Add to the narrator paragraph a line for what is happening, chosen by the staged situation's type (a funeral, a layoff, a vote called, an eviction notice, a verdict, and about twenty more), and give the floor-vote office scene the same opening (setting, day, who is there, who must be reached). Never name the person a funeral is for as one of those who came.

**Rules.** No hand-written player text: the lines are authored parts in `data/english/parts/scene-words.json` (author and date), filled from records. Replace, never layer. A scene staged for a person the type marks `present: false` names nobody absent.

**Done when.** A generated place shows a funeral scene whose paragraph says people gathered and names no one who died, and the office scene's paragraph names the member to reach; `src/director/scene-paragraph.test.ts` proves both. The owner plays it: a death in the circle opens with a few sentences, then the talk.

**Files.** src/director/scene.ts, office-scene.ts, mined/scene-bank.ts, data/english/parts/scene-words.json, src/bench/story.ts.

**Notes.** Built in parallel with #4468 (same item, same prompt) and kept on branch `claude/director-narrator-situation-leads` (merged with main, not with #4468's branch). Take it after #4468 merges: re-apply on top of #4468's `composeScene` (it already joins cause lines into one paragraph), keeping this branch's `dayFacts`, `leads` rows, the absent-role guard in `who` for `other`, and the office scene change.
