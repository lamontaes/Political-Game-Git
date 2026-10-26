---
id: words-campaign-season-scenes-fill-the-months
title: "A candidate's months between filing and election day are never silent: scenes and news come from the race"
area: words
kind: bug
priority: 1
size: M
status: claimed
claimed-by: words/campaign-season-scenes
pr:
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at: 2026-10-26T22:20:03.008Z
---

**What.** After the one family scene on January 22, 2025, two days after the player filed, the game ran week by week to May 6 and nothing happened: no scene, no toast, no news item, no campaign event; the March 11 filing deadline and two family birthdays passed unmarked. The owner: "See, there's nothing happening. This is where scenes should be happening. You know, getting ready for the election, having interviews, a debate, assembling, you know, an election team, meeting people, having moments that, you know, change your life, working with other candidates, working with current elected officials, holding rallies, etc. That maybe, you know, participating in corruption if it comes up, etc. This is where the scenes need to come in." This item makes the director fire scenes and the press print stories about the player's own race through the season, drawn from the owner's list as the records support each: an outlet asking for an interview, a volunteer or relative offering to join the team, a debate invitation, a rally, a meeting with another candidate or an incumbent, and corruption where a record shows it.

**Rules.** Serves LAW.md §4, Scenes and conversations (scenes come out of what is happening in the world; a scene has an endpoint and stakes, OD:306 and OD:327; the director picks from everything the simulation supports and fires one, OD:233) and LAW.md §9, Time (a quiet day is quiet; what stops time is a scene from the records, OD:231 and OD:241). Wire to the world: every fired scene cites the contest or person record that caused it. Ask why: a quiet stretch must have a record that answers why. No dice: a scene fires from its cause, never a monthly chance.

**Done when.** In a drawn place built with buildBenchWorld, a player who files in January for a November election and is advanced week by week to election day has no 28-day stretch without a fired scene or a news line about the player's own race, the first arrives within 28 days of filing, at least three different scene kinds fire over the season, and each cites a contest or person record id; a test in src/director names the place and seed, shown by screenshots of the first two. The 28 days is the drafter's choice, not a ruling; the owner called about seven quiet weeks "nothing happening".

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** After you file, weeks do not go by empty: an outlet asks for an interview, a volunteer offers to help, a debate is set, and the news talks about your race.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/scheduling.ts, src/director/scene.ts, src/director/purpose-scene.ts, src/director/ledger.ts, data/english/parts/scene-talk.json, src/bench/story.ts

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "This is where the scenes need to come in." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. His list of scene kinds extends OD:360 (a volunteer or opponent at a rally, a donor or party chair asking for something). The scene kinds already in the pool: words-debate-opponent-scene, words-donor-ask-scene (PR open), words-scene-party-asks-you-to-run (sent back), words-scene-for-unstaged-big-moments, play-stop-11-campaign-actions-do-nothing-visible-b and the larger words-scenes-like-wildermyth; this item is the cadence and the first diagnosis (why no moment fired for a filed candidate in Albion, Pennsylvania from January 20 to May 6), and takes whichever of those kinds are merged. The Week press also slowed from 3 to 5 seconds before filing to 6 to 10 seconds after, the campaign-season cost in core-speed-campaign-season-kept-whys. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
