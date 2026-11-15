---
id: play-player-entered-in-races-without-filing-press
title: "Stop the house talking about races the player never entered as the player's own"
area: play
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9451
after:
blocked-on:
lead: filing-counter
model: opus
effort: medium
root: none
source: Account lead thread, Nov 14, 2026, while showing conversation replies at a named place; coordinator asked for it as a pool item
checked:
---

**What.** In a played world where the player never pressed file, housemates talked as though the player had run. At Sherrodsville, place key 3972242, world seed "scan-25" (a fixed seed; the place and seed are pinned in the test), the player played from the game start to the week after the 2025-11-04 vote: Angela said "I saw how Mayor came out" and Corey "I'm sorry about Council member", and in other seeds housemates said "I saw you filed for County assessor". The elections table holds no filing for the player in any of these worlds, so the player was never entered. The filing route showed nothing open for the right reasons: at Sherrodsville the two races open in June and July 2025 failed the player's minimum-age check and the filing-fee check, so the route offered nothing. Seen: the house at Sherrodsville says "I'm sorry about Council member" to a player who never ran.

**Cause.** Found in code: `playerNews` in `src/director/conversation.ts` treated every filing and election-result moment on the player's ledger as the player's own news. The director's ledger also holds the town's other races the player merely saw (the same rule that feeds the journal's own-race split, `selfNamed`), and `playerNews` said "won" or "lost" by whether the player was the winner, so a player who never ran "lost". The filing player-day line had the same gap for another person's filing.

**Fix.** A filing or a race is the player's news only when the ledger moment names the player (`selfNamed`), in `playerNews` and in the filing player-day loop. No new record, rule or stopgap.

**Time box.** 3 hours, Opus.

**Rules.** Follow the standing rule "Wire to the world" and the other standing rules in AGENTS.md; one engine files candidates, so the player's person goes through the same filing as any other person.

**Done when.** At Sherrodsville (key 3972242) with seed "scan-25", a player who never filed hears no race or filing as their own news through the week after the 2025-11-04 vote, and a housemate who filed through the game's own filing (`fileForOffice`) hears their own race (`src/director/home-talk-own-race-only.test.ts`, both tests pinned there). A second session on main plays the same place with the filing route and sees the house talk about the player's race only after the player presses file.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/home-talk-own-race-only.test.ts
