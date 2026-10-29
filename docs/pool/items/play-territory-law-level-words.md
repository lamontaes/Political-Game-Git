---
id: play-territory-law-level-words
title: "A territory's laws say territory or commonwealth law, never State law"
area: play
lead: play-first
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone: play-first
source: CTO, Oct 29 Issues sweep (Puerto Real, Puerto Rico)
---

**What.** On Politics → Issues in Puerto Real, Puerto Rico, every law set by the island's government reads "State law since 2024", because the level words in `src/bench/data/controls.json` (`politics.issueSetBy`) name the state level the same everywhere. Puerto Rico and the Northern Marianas call themselves commonwealths and Guam, the Virgin Islands and American Samoa territories, and D.C. has its own council. The level's words should come from the place's data, so each of the 56 places names its own government's law the way its people would.

**Rules.** One rule, all 56 places: the level's word comes from the place's data row, never a named place in logic. No hand-written player text: the words live in the controls file or the place's data, worded by the screen.

**Done when.** A browser check on Issues in a drawn territory (Puerto Rico, Guam, the Virgin Islands, American Samoa or the Northern Marianas, named with its seed) shows its own level words on every card and law page and no "State law"; and a drawn state still shows "State law"; screenshots in `docs/play-first/shots/play-territory-law-level-words/`.

**Time box.** 1 hour, Sonnet.

**You will see.** In Puerto Rico, a law card reads "Commonwealth law since 2024".

**Screenshot.** Issues in a territory, before and after.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, the place data row that names the level

**Notes.** Filed by the CTO, Oct 29 23:58, from the Issues sweep for #6846. Searched the pool: territory law, commonwealth (no twin).
