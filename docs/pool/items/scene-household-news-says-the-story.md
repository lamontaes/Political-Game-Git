---
id: scene-household-news-says-the-story
title: "A household talk about the news says what the news was: the printed story's headline and outlet in the talk's facts"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-household-news-headline
pr: #6307
blocked-on:
source: "words-and-scenes lead, Oct 27, probing the Oct 26 home talks (deliverable 7 of docs/work-orders/lead-words-scenes-2026-10-26.md)"
lead: director
milestone: play-first
claimed-at: 2026-10-27T11:52:39.863Z
---

**What.** In Fananganan, Northern Mariana Islands (seed `home-a:0`, `openConversation` with the player and two household members on March 21 and June 19, 2025), a talk about the news opens "What do you think?" and never says what the news was. The news subject (`src/director/conversation.ts`, near `changesKnownTo`) carries one fact, `topic`, which is an institution's proper name, so even the mined raise could only say "Did you hear about Hart County Board of Commissioners?". The talk then ends on "I see." or "Sure." Every printed story now has its own words (`wordPrintedStory` in `src/bench/archive-words.ts`, #6213), but the talk does not read them.

**Rules.** Serves LAW.md §4 (a line claims only what the record holds). Ask why: the news a relative brings up is a story they heard, named by its record id. No hand-written player text: the words come from the news composer and the conversation bank.

**Done when.** In a drawn place (buildBenchWorld, seed printed), a household member who heard a printed story raises it in a talk with facts `headline` (the composed headline), `outlet` (the organization that printed it) and `storyId`, each citing the printed story's record id. A test in src/director shows the raise line saying the headline, and fails when the facts are removed.

**Time box.** 2 hours.

**You will see.** "Did you see the Courier this morning? Ohio minimum wage falls to $7.25." instead of "What do you think?"

**Screenshot.** The talk box with a news talk, before and after, from a drawn place, in the PR body.

**Files.** src/director/conversation.ts

**Notes.** The lines are drafted and ship on the words side, each needing the facts above: "Did you see the {outlet} piece? {headline}." / "{headline}, says the {outlet}." / "I saw it in the {outlet}: {headline}." The answers go by the director's `heard` / `not-heard` stage and four stances: glad, worried, doubting, and asking for more.

The full drafted set (words lead, Oct 27) is on branch `words/home-talk-lines` at e356f24e71, in `data/english/parts/conversation.json`. The words lead ships it in the same change that passes the facts.
