---
id: words-press-study-committee-stories-unworded
title: "The press prints a study committee's forming and report, and News has no words for either (printed-words red, Tierra Amarilla, New Mexico)"
area: words
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: Words builder W3 (opus-d51c)
pr: 8982
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Red desk, Nov 12 (merger sonnet-dca4 on #8928; src/bench/printed-words.test.ts red on main by draw)
---

**What.** src/bench/printed-words.test.ts, "words every story the press prints in a year", fails on clean main 07fb90ba at GOLDEN_PATH_SEED=7873af602be48421779c5ff88b277b2eace926b8 (Tierra Amarilla, New Mexico, place 3577670): 20 printed stories are unworded, all of the kinds `study-formed` and `study-reported` (the county board's study committee on a bill it narrowly lost, formed 2025-01-21, and its reports). The test passes in draws where no body forms a study committee in the year. Seen: News lists a printed story with no headline or lede for a study committee, and nobody in the town hears what the committee found.

**Cause.** Found in code: the legislature engine records a study committee's forming and report as public events (`study-formed` and `study-reported`, src/core2/modules/legislature.ts lines 5058 and 5128, since c96372b405 on Nov 9), and the press prints them, but `BUILDERS` in src/bench/printed-words.ts (line 3345) has no reader for either kind, so `printedFacts` returns null and `wordPrintedStory` in src/bench/archive-words.ts words nothing. No bank under data/english holds lines for a study committee's story.

**Fix.** For the words lead: a builder for each kind in src/bench/printed-words.ts, read from the study's record (the body, the bill and its sponsor by name, the members, the sunset date, and for a report what it found and what the body did with it), worded through the composer and the news bank like the other legislative stories (`committee`, `rollCall`). No second writer, no stock sentence.

**Time box.** 2 hours

**Rules.** No hand-written player text: the words come from the English engine's banks and the composer, never from code. An effect is a read, not a record: the report's story names what the body read from it.

**Done when.** A second session runs printed-words.test.ts on main in the drawn place it names at GOLDEN_PATH_SEED=7873af602be48421779c5ff88b277b2eace926b8 and at a fresh seed, and it passes; in the running game, News in a town whose body forms a study committee shows its forming and its report worded.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts, data/english/parts/news.json

**Notes.**

- Nov 13: built on `claude/words-w3-news-study` by Words builder W3 (opus-d51c), Fable A's assignment of Nov 12 21:44Z. printed-words.test passes at the Red desk's seed; the stories as played are in `docs/seen/words-w3-news-study/lines.md`.
