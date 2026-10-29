---
id: words-household-filing-scene-has-a-purpose
title: "A relative's talk after you file opens with what she wants or fears from her own record, and ends with something recorded"
area: words
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/scene-family-filing-stake
pr: #6237
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at: 2026-10-27T05:09:04.257Z
---

**What.** After the player filed, Wednesday's scene had Kendall Roberts waiting in the bedroom: "Are you sure about running for Council member?", then "Who told you?" and "Word gets around. People talk.", four replies, "I'll do the yard signs. Not the phone calls." and "Okay. Next time, tell me first." The setup (reacting to the filing) is the right shape, but the owner: "there was no reason to have that dialogue. ... that's not like Wildermyth, because there was no reason to have that conversation. It was unnatural. Like, that scene was useless." A family reaction to a filing is on the ruled scene list; this one has no purpose of her own and nothing in it was recorded. This item makes the scene fire only when a record gives the relative a stake, open with that purpose in her own words, and end with something a later engine reads.

**Rules.** Serves LAW.md §4, Scenes and conversations ("A scene has an endpoint. It exists for something: money, a bill, or the player's political life," OD:306; a setup, a person with a purpose and stakes, OD:327; four replies that each move the talk, OD:308 and OD:209). Wire to the world: the purpose comes from the relative's record. An effect is a read, not a record: the outcome is written where the campaign reads it. No dice: the scene fires from the record, never a chance.

**Done when.** In a drawn place after the player files, the household scene fires only when a record gives the relative a stake (for example a position she holds that differs from the player's filed positions, an office or employer the race touches, money she would put up, or a relative on the same ballot), the opener cites that record and says it in her own words, and each of the four replies changes a record that another engine reads (for example a helper the campaign counts as a volunteer); when no relative has a stake, no scene fires; a director test names the place, the seed and the record ids, shown by a screenshot of the opener and one outcome.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Your relative has something to say about your run that comes from her own life, and what you answer changes your campaign.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/purpose-scene.ts, src/director/scene-talk.ts, src/director/scene.ts, data/english/parts/scene-talk.json, src/director/conversation.ts

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "there was no reason to have that dialogue ... that scene was useless." The CTO first graded the scene "best so far" and the owner corrected the grade. Whether Kendall's "I'll do the yard signs" was recorded as a campaign helper is unknown; the builder checks. The four-replies fix for family talk is words/play-stop-01-talk-a (PR open). The narration's own defects are words-scene-narration-does-not-restate-where-you-are and words-day-end-scene-opens-next-midnight. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
