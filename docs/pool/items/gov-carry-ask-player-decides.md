---
id: gov-carry-ask-player-decides
title: "A request to carry a bill that reaches the player waits on the player's answer"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6198
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** askToCarry in src/core2/modules/legislature.ts decides for whichever member is asked, by that member's own position and the asker's standing, and drafts the bill when the sum is for it. When the member asked is the player (an executive's proposeAsExecutive picks the most inclined member, and that can be the player), the engine makes the player's choice for them: the bill is filed or not before the player sees the ask. The carry-bill scene (words-carry-bill-scene, PR 6007) plays the ask to the member, and the player's reply is kept as a record (PR 5914), but the reply does not decide. An ask to the player should wait as a request the player answers, as a donation ask does (PR 5407).

**Rules.** The engine offers, the player decides: the controlled person's choice is never made by the engine. Wire to the world: the player's answer is what files or drops the bill, by record id. No dice.

**Done when.** In a played world (buildBenchWorld) on a place drawn from all 56 with a seed the builder did not choose, an executive's ask to carry a bill that reaches the player files nothing until the player answers; agreeing files the bill with the player as sponsor and requestedBy the asker, declining files nothing, each named by record id in the PR body. **On screen.** Nothing yet: it would show on Politics → Issues and Government, and nothing there reads it.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/world-legislating.ts

**Notes.** TODO
