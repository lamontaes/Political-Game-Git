---
id: play-first-filing-campaign-tutorial
title: "The first time the player files, someone asks if they know how to run a campaign, and a yes walks them through it from the place's own rules"
area: play
kind: feature
priority: 1
size: M
status: claimed
claimed-by: words/campaign-walkthrough
pr:
blocked-on:
source: owner, Nov 1 23:30 UTC (playtest of v0.73.0, Northampton, Massachusetts)
lead: words
milestone: play-first
claimed-at: 2026-11-01T23:58:52.279Z
---

**What.** Owner, Nov 1: "it should be the first time in a game that the player files for an office. It should start this quote unquote tutorial... do you know how to run a campaign? So that's essentially saying, do you want the tutorial, yes or no? And then it could be like, your goal is to get X amount of signatures to get on the ballot. You do that by doing this. Now, you'll need money... this is what you can spend money [on]. You can get TV ads. Etc. You may want to do media... That's how the tutorials should work in the game." Today the clerk's visit ends with "Your petition is out for signatures" and Continue sends the player home with nothing explained. On the first filing of a life, the clerk (or the scene's other person) asks whether the player knows how to run a campaign. A yes-to-help walks through the goal (the signatures the place's filing rules require, by the deadline), how to get them (doors, events, volunteers), money (raising it and what it buys: ads, mail, staff) and media, each figure read from the place's records, and ends where the player can start.

**Rules.** This is a game, not a spreadsheet: the owner named the tutorial by hand, asked by a person in a scene, never a pop-up. No hand-written player text: every line comes from the bank and the figures from the filing engine's and campaigns' records. One rule, all 56 places: the required signatures, deadline and spending kinds read the place's own rules, estimated with their source where the data is missing.

**Done when.** In three drawn places (named with seeds), the first filing of a life plays the question; a no skips it; a yes plays the walk-through naming that place's signature count and deadline from the filing record id and the campaign acts the player can take; a second filing in the same life does not ask again; the PR quotes one walk-through.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The first time you file, the clerk asks if you know how to run a campaign, and if you say no, they walk you through signatures, money, ads and the press for your town.

**Screenshot.** The question and two steps of the walk-through, from a drawn place.

**Files.** src/director/filing-visit.ts, data/english/parts/scene-talk.json, src/bench/play.mjs

**Notes.** Filed by the CTO from the owner's Nov 1 23:30 message. Read: OWNER-DECISIONS (no tutorial ruling before this one), the pool for tutorial, teach and learn: no twin. Words writes the scene and its lines; the lane shows it in the talk box (Review: words); the governing lead's filing records give the figures.
