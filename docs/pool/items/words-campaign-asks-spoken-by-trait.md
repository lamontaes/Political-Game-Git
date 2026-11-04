---
id: words-campaign-asks-spoken-by-trait
title: "In the campaign-ask scenes, each person answers in their own words, by trait and tie"
area: words
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: lane3/campaign-answers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T14:26:02.543Z
---

**What.** The lane's campaign acts as scenes (#7109 donor calls, #7111 volunteers, #7112 endorsements, #7132 the ad) show each person's answer under their own name as narration of themselves ('Ruth Stanton agrees to endorse you.'). Words' reviews passed the bank lines for the Campaigns summary and promised spoken versions: each person says their own yes or no ('Count me in. I can give you Saturdays.' / 'I'd like to, but I can't spare the time right now.').

**Rules.** scene-standard rule 4, their own words: every spoken line has versions by the speaker's top trait and tie to the player. No dice: the answer stays the ask's own recorded answer. American English everywhere.

**Done when.** In three drawn places (named with seeds), the volunteer and endorsement scenes show each person's spoken answer from scene-talk pieces keyed to the ask's answer, two speakers with different traits or ties say different lines, and a test fails as evidence when a talk-box line narrates its own speaker.

**Files.** data/english/parts/scene-talk.json, src/bench/campaign.ts, src/bench/play.mjs

**Notes.** Filed by Words at handoff (Nov 2, 02:55 UTC) from its reviews of #7111 and #7112; the lane agreed to the follow-up.

Lane 3 (Nov 4), the plan: the answers are worded in `src/bench/campaign.ts` (Lane 4) by `standingLine(..., "volunteer-yes" | "volunteer-no" | "endorse-yes" | "endorse-no")` from `campaign-standing.json`, which knows nothing of the speaker. Lane 3's part is a director function that words one person's spoken yes or no through the one scene word maker (`wordSceneMove` in `src/english/scene-talk-words.ts`, which already leans on the speaker's traits), with `tie-friend` or `tie-rival` from `tieSide` (`purpose-scene.ts`), plus scene-talk pieces for the volunteer and endorsement answers by tie. Lane 4's part is one call in `campaign.ts` in place of `standingLine`, written first in `agreements/3-4.md`. Not started on a branch.
