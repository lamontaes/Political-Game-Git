---
id: words-race-story-loser-beat-winner
title: "A lost race's story says the loser beat the winner"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: lane3/own-loss-story
pr: #7223
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T09:26:04.823Z
---

**What.** Confirmer replay of Lane 3 path 6 on main 2e321723d8: New Game in Storrs, Connecticut (replay storrs-1), Emily Carter (person_b83e0bf262b37c19) filed for Selectman on June 10, 2025 and lost on November 4, 552 to 223, to Avery Cooper (person_683a7051218ca664). The race's news record election-result:contest:seat:gus2025:161511:board:0:2025-11-04 (served by /api/news) has lede 'Emily Carter lost the election.' and paragraphs 'Emily Carter lost the election.' and 'Emily Carter beat Avery Cooper.' The second paragraph reverses the result in the same story. It also names no concession (no concession call was staged; that half is words-venue-speeches-delivered).

**Rules.** No hand-written player text in code: the story's lines come from the English engine's banks, filled from the race record (winnerId, totals). One engine per mechanic: the press desk and the paper read the one election result. A view never computes its own version of a fact.

**Done when.** A fresh session replays New Game in Storrs, Connecticut at replay storrs-1 on main, files for the first race and loses, and the race's story names the winner as the winner and the loser as the loser in every paragraph; the same holds for a won race and in two places drawn from all 56 (place and seed named); a test fails when a paragraph names the loser as the one who beat the other.

**Files.** src/core2/modules/press.ts, src/bench/printed-words.ts, data/english/

**Notes.** TODO
