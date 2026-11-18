---
id: story-lines-press-interview-and-constituent-stop
title: "A reporter's questions and a resident's stop are written again from pattern B6-08, naming the bill, the story or the law"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-after-office
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z and 13:54Z on the Story thread (issue 9750), the order for after office; pattern B6-08 "stopped in the aisle, asked at the door" (docs/story/scene-patterns.json, bank 6)
checked:
---

**What.** In office, a reporter stops the player about a vote or an act, and a resident stops the player about a law or a story that reached them. The cut of Nov 17 deleted every line of both scenes, so they do not play. Seen: the press interview after a vote and the stop on the street after a law takes effect.

**Cause.** Design: the lines were written before Nov 15 and deleted whole by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skips both situation keys by name in `CUT_PURPOSES` until their lines return.

**Fix.** Write both scenes again from pattern B6-08 as rows in `data/english/parts/scene-talk.json`, every line naming what the scene's record holds: for `press-interview`, the bill or the subject (`story`), the outlet and how the player voted; for `constituent-stop`, the story the resident read and its paper, or the law and whether it is in force yet. Narration says only what can be seen. Both keys leave `CUT_PURPOSES`.

**Time box.** 4 hours.

**Rules.** No hand-written player text in code; words come from the banks (`scene-standard`). Talk says how it feels, never the figure (owner, Nov 11). Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, in a drawn place with the player seated on a body, plays a press interview after a vote and a resident's stop after a law takes effect, and each line names the bill, the story or the law from the scene's record; the English guards hold no new red; every new reply pair and narration line has a fresh reader's verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper, read and reworded by the Story lead (37 lines whose slot read wrong once filled, 8 narrations that gave people a reason), 803 pairs and 8 narrations judged by fresh readers with every planted row caught. `family-absence` (B6-07) has no packet block for its cause and is not written.
