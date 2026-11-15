---
id: words-home-talk-names-a-race-by-its-office-alone
title: 'Home talk says "how Council member came out" where a person would say the race'
area: words
lead: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: fable
effort: medium
root: none
source: "Second words reader, Nov 15, at Sherrodsville; filed by the Account lead builder at the coordinator's request"
checked:
---

**What.** At Sherrodsville (place key 3972242, world seed "scan-25"), after the 2025-11-04 count, a housemate of a player who ran says "I saw how Council member came out" and "I'm sorry about Council member", naming the office bare, with no article and no word for the race, where a person would say "how the council race came out". The played file `/mnt/project-files/filing-counter/played-9451.md` (second part) holds the first line. Seen: the player hears it at home in the evening after the count.

**Cause.** Found in code: the two bank lines `"I saw how {office} came out."` and `"I'm sorry about {office}."` in `data/english/parts/conversation.json` (lines 31092 and 31116) are filled from the record's `office` fact through `properName(office)` in `playerNews` (src/director/conversation.ts), which gives the office's title ("Council member"), not a name of the race.

**Fix.** The Story session writes the lines and the Words lead grades them (the lines under `data/english/parts/` are the Story session's alone). The record already holds the office and the election date; the fix words the race from them (for example "the council race"), through the English engine and not typed in code. No new record or stopgap.

**Time box.** 2 hours, Fable.

**Rules.** Skills `words-engine` and `civic-prose`; plain American English; people say how it feels and never the figure; the lines stay one rule in one PR.

**Done when.** At Sherrodsville (key 3972242, seed "scan-25"), a drawn place, the played home talk after the 2025-11-04 count of a housemate who filed says the race by its office as a person would ("the council race", "the mayor's race") in every player-news result line, shown in a played file at the final sha, and a second session plays the same place on main and sees the housemate say the race as a person would.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/conversation.ts

**Notes.** Older than the home-talk race fix (the lines were always said to the candidate); seen by the second words reader on Nov 15.

Nov 15, more evidence (second reader, #9421 played talks): Kingston, Nevada (place key 3238100, world seed c1), #9421 head 193c056c584106e3ab416d759540c06fcfbc2708 on Train b22cd350; the player Quinn filed for County Commissioner through fileForOffice on 2026-01-12, and Karen says "I saw how County Commissioner came out." on 2026-06-09 and "I'm sorry about County Commissioner." on 2026-11-03. The run wrote cash onto the player by hand for the filing fee, so it is not a clean played case. The replies offered after the loss are the separate item words-player-news-replies-ignore-the-race-result.
