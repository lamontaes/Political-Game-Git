---
id: play-stop-news-follow-control-and-household-papers
title: "News has a Follow control, and a household knows its paper and station from day one"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: playtest Nov 23 sitting 1, row P46 (docs/coordination/playtest/2026-11-23-1.md)
lead: play-first
milestone: play-first
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** Owner, Nov 23: "you don't follow a paper or a station. Well, you don't give me one to follow." The News page said the player follows none, and had no way to follow one. Seen: in News, the masthead of any paper or station.

**Cause.** Found in code: `followersOf` (src/core2/modules/press.ts) derived who follows what only from age-band shares ranked by habit, so a player's household could be left out of every audience, and `news.followsNone` (controls.json) printed with no control to answer it; /api/news/follows existed and nothing in `newsBoard` (src/bench/ui/news-board.mjs) drew a Follow button.

**Fix.** The press engine keeps a person's own follow row (`follows` table, `setFollow`), read over the week's audiences by `followersOf`. The opening gives each adult in the player's household, per kind of local outlet, the one nearest their own lean (`openHouseholdOutlets`, the engine's selective-exposure rule), called after `openStartingCircle`. News draws Follow or Unfollow on each outlet's masthead from /api/news/follows and POST /api/news/follow.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Day one is in motion: the opening stock comes from the engine's own rule, never a hand list. An effect is a read: every engine that reads `followersOf` (press desk reach, meetings, office-day acts) now reads a chosen follow. No dice: the choice is the nearest lean, never a roll. Control names are typed by the fixer for Story to confirm: `news.follow` and `news.unfollow` in src/bench/data/controls.json.

**Done when.** A second session, in a drawn place on day one in the running game, opens News on a paper the household follows with Unfollow on its masthead; pressing it drops the follow and the control reads Follow; pressing again follows it, and the follow is what `followersOf` reports.

**You will see.** Opening News on day one, the household's paper is already followed and its masthead says Unfollow; pressing it flips the word to Follow.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/bench/archive-words.ts, src/bench/handler.ts, src/bench/world.ts, src/bench/play.mjs, src/bench/ui/news-board.mjs, src/bench/data/controls.json, src/bench/news-follow.test.ts (new)
