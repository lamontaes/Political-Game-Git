---
id: words-player-news-replies-offered-after-a-lost-race-answer-the-race-ahead
title: "Offer replies to a lost race that answer the loss, not the race ahead"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead thread, Nov 15, 2026: second reader and M5 read the played file for #9421 and found the same fault in five picks
checked:
---

**What.** After the player's race is over, the housemate's talk still offers replies that belong before the vote. At Kingston NV (place key 3238100, world seed c1, 760 days, player filed 2026-01-12 for County Commissioner and lost 2026-11-03), after Karen's "I saw how County Commissioner came out. I worry about you." the player is offered "Somebody has to run for County Commissioner." and "You think it's a mistake?", which read as if the race were still ahead. After "I'm sorry about County Commissioner. I worry about you." all three offered replies fail, "I'll be careful. I promise." included, because none answers sympathy for a loss. Also "I saw how County Commissioner came out." names the office as if it were the race. Seen: in the talk with a housemate after the player has lost a race, in the replies the player is offered.

**Cause.** Found in code: the worry replies in `data/english/parts/conversation.json` (`conversation.player-news-answer-tell.somebody-has-to-run-for-office-first`, `conversation.player-news-answer-ask.you-think-it-s-a-mistake-first`, `conversation.player-news-answer-take.i-ll-be-careful-first-i-promise`) are gated only on `stance-worry` and `office`, which `playerNewsFacts` in `src/director/conversation.ts` sets for a filed mark and a lost-race mark alike. No fact says the race has a result, so nothing tells the filed-and-running replies from the lost-race ones. The fix needs the stage as a fact the replies can require or exclude, and replies of their own for the lost-race stage written with the Words lead.

**Fix.** Add the race's stage (running or decided) to the player-news facts from the record the game already keeps for the race, gate "Somebody has to run for {office}." and "You think it's a mistake?" to running, and add replies for a lost race (answering sympathy, not a plan) under the line-writing process, with the second reader's stamp on lines shown said. Reword "came out" so the office is not the race.

**Time box.** 2 hours, Sonnet, with the Words lead's line review.

**Rules.** Follow the standing rule "Wire to the world" and the other standing rules in AGENTS.md; the stage is read from the race record, no new tracking system; a builder never judges its own lines.

**Done when.** At Kingston NV (3238100, seed c1, filing through the game's own route with the fee from the player's own pay) and two other named drawn places, after a lost race the talk offers only replies that answer the loss, and while the race is running it still offers the filed-and-running replies. A second session, on main, plays the same and sees it.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/conversation.ts, src/director/conversation.test.ts, tests/guards/english/line-inserts-baseline.json

**Notes.** Evidence: /mnt/project-files/words-lead/padding/five-lines-played.md (talks of 2026-06-09 and 2026-11-03) and the fit read /mnt/project-files/words-lead/padding/five-lines-m5-read.md (9 yes, 5 no, all the same fault). The Account lead is placing it with the election-results thread; if no builder has it, this item carries it.
