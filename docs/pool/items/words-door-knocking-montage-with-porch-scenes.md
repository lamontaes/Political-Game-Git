---
id: words-door-knocking-montage-with-porch-scenes
title: "Knocking on doors plays as a short montage of real households with an occasional porch scene, and says in words what it came to"
area: words
kind: bug
priority: 1
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at:
---

**What.** Knock on doors in v0.34.0 drops the player on a street of about nine identical bald gray figures facing the viewer, one huge man in a t-shirt and shorts in the foreground, in full daylight while the clock reads 12:00 AM, under a card line "KNOCK ON DOORS · 45 DOORS · 22 REACHED". Nobody speaks and nothing is narrated. The owner: "this campaign screens again. It's just jumbled mess ... Who the hell are all these people ... It just throws you into a location. This is where a scene would help. How do you know you knocked on 45 doors, 32 [22] reached? What the hell does that mean?" (the log's correction of his number is in brackets). The owner's Oct 8 ruling is that door-knocking is a montage with occasional porch scenes. This item plays it that way: a short montage of several households drawn from the district's records, each a different person, a closing sentence from the English engine saying what the afternoon came to in plain words, and a porch scene when a reached household has a stake in the race.

**Rules.** Serves LAW.md §4, Scenes and conversations (campaign acts are scenes you go to, OD:77; the narrator sets the scene, OD:307; "door knocking", never "the doors", OD:347; a scene has a purpose and stakes, OD:306) and LAW.md §2 (every figure drawn from the person's own record). Wire to the world: households and their stances are the district's own records. No hand-written player text: the tally sentence and any porch lines come from the English engine. This is a game, not a spreadsheet. The montage ruling is the owner's Oct 8 word and is not yet in OWNER-DECISIONS.md.

**Done when.** In a drawn place after the player files, Knock on doors plays as a montage whose stages each name a household record id and show different people (a test over the stage list: no two stages share a person, none is a fallback look); the closing line is one sentence in plain words giving how many homes answered of those visited, with no all-caps card line or "DOORS · REACHED"; a porch scene fires for a reached household whose record holds a stance on a position the player filed with, shown by a director test naming the household record ids and the stance, and on a day none fires the closing line says why in words; shown by screenshots of three montage frames and a porch scene with the place and seed named.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Knocking on doors shows you a few different homes in turn and ends with a sentence about how it went, and sometimes someone on a porch stops to talk.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/scene.ts, src/director/scene-talk.ts, src/director/purpose-scene.ts, src/bench/campaign.ts, src/bench/staging.ts, src/bench/play.mjs, data/english/parts/scene-words.json

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "How do you know you knocked on 45 doors, 32 [22] reached? What the hell does that mean?" The Oct 8 6:30 p.m. montage ruling is in the CTO's memory notes only; the CTO records it in OWNER-DECISIONS.md. The identical figures are play-stop-35; the clock not moving for three hours and the daylight at midnight are play-stop-07-every-day-starts-at-midnight-a and -b; moving the act off the Campaigns tab is play-first-13-campaign-screen-to-mock-b; play-campaign-day-acts-as-scenes (done) built the street this replaces. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `director-producer-canvass-visit`; close into it and carry any line it lacks there. (keep only the 'says in words what it came to' line)
