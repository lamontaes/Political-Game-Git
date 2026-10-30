---
id: campaign-incumbent-comes-home
title: "The incumbent comes home: a candidate who learns a rival is gaining puts in more hours and doors, and one living away comes home to campaign"
area: elections
kind: feature
priority: 1
size: M
status: claimed
claimed-by: governing/incumbent-response
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T02:35:29.221Z
---

**What.** A world candidate's campaign day never reacted to the race: an incumbent whose challenger was gaining kept the same hours and doors, and one who lived outside the town never came home to campaign, so a player gaining on a sitting official saw nothing change on the other side. The owner said on Oct 29 to look at real races, where an underdog's "campaign gained steam, and then it caused [the incumbent] to try to go back to New York to campaign". This is phase A of campaign-like-real-races: a world candidate reads where the race stands from what they actually know (their own latest poll, weighed by its sample, or word of the rival from someone who knows both, including word of the rival's evenings of doors), and the further behind they believe they are, the more hours and doors they put in. One who lives away comes home to walk the town's doors on a share of the day that slides with the threat. The step-up is kept as a record naming the poll or the word that told them, so a scene can tell it.

**Rules.** No dice: the threat is the rival's share minus the candidate's own in what the candidate knows (their poll's answers or their circle's warmth), and the extra hours, doors and the share of a day spent back home all slide from zero with it, never a roll or a cutoff. Ask why: every step-up row and event names the poll or rivalWord record that told the candidate, and word reaches them only through a person who knows both. Wire to the world: the extra doors are walked through the campaigns engine's own day and reach real voters.

**Done when.** src/core2/campaign-incumbent-response.test.ts passes in places drawn from all 56 and prints the place, run seed and place seed. With the incumbent's own poll showing the challenger ahead, the reading names the polls row id, the pressed day has more hours and doors than the same day without the poll, a candidate living elsewhere walks more of the town's doors (cameHome when the calm day had none), and campaignTurn keeps one steppedUp row naming the poll and a campaign-stepped-up event, not again on the next turn. With no poll, the challenger's evenings of doors write campaign-canvass messages, word reaches the incumbent as a rivalWord row naming the challenger and a teller who knows both, the incumbent walks more doors, and the turn keeps a steppedUp row and event naming the rivalWord id.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-incumbent-response.test.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps.json

**Notes.** TODO
