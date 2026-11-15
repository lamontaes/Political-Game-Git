---
id: words-player-news-replies-ignore-the-race-result
title: "After the player's race is decided, the replies still talk as if it were being run"
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
source: Second reader, #9421 played talks (Nov 15), Kingston, Nevada
---

**What.** When someone tells the player they lost ("I'm sorry about County Commissioner. I worry about you, Quinn."), the replies offered still include "Somebody has to run for County Commissioner." and "You think it's a mistake?". Both belong to a race the player is still running. "I'll be careful. I promise." is offered after the loss too. Seen: at home after the count, the player's reply choices to a relative's line about the race.

**Cause.** Measured: at Kingston, Nevada (place key 3238100, world seed c1), 760 days from the start, played at #9421 head 193c056c584106e3ab416d759540c06fcfbc2708 on Train b22cd350. The player Quinn filed for County Commissioner through `fileForOffice` on 2026-01-12. Note that run wrote cash onto the player by hand for the filing fee, so it is not a clean played case. Karen says the lines on 2026-06-09 and 2026-11-03, and the same three replies are offered both times. Found in code: the player-news say lines carry `stages` (filed, won, lost, in-paper, job stages), read from the race's record. The ten `player-news` answers in data/english/parts/conversation.json (moves `player-news-answer-take`, `-tell` and `-ask`) carry no `stages`, only `requiresFacts` (`office`, a stance), so every stage offers them.

**Fix.** The answers read the same stage as the line they answer: each answer piece names the stages it fits (a race still ahead for "Somebody has to run for {office}" and "You think it's a mistake?"; the decided stages for answers to a loss or a win). Lines missing for the decided stages go to Story to write, and the Words lead rules on the stage lists. No new record: the stage is the race's record (filed, running, decided) that the say line already reads.

**Time box.** 2 hours for one Sonnet session at medium effort, plus Story's lines.

**Rules.** One rule, all 56 places. No dice: the replies are filtered by the race's record, never drawn.

**Done when.** A second session, on main, plays a world where the player files and loses, seen in a played world at a drawn place and seed (a test through the game's own filing and count, no cash written by hand). After the count, no reply offered to a line about the race speaks of a race still ahead, and each reply's stage matches the line's.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json; src/director/conversation.ts

**Notes.** Nov 15: filed by the "Let people bring up election results" thread on the Account lead's direction. The office named as the race ("I saw how County Commissioner came out.") is the open item words-home-talk-names-a-race-by-its-office-alone; the Kingston lines are added there as evidence.
