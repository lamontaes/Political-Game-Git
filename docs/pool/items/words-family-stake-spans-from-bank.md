---
id: words-family-stake-spans-from-bank
title: "The family-stake talk says how long a race runs from the English engine's words, not from a list typed into the director"
area: words
kind: cleanup
priority: 2
size: S
status: done
claimed-by: words/family-stake-spans
pr: #6355
blocked-on: "#6273 (director numbers in family-stake.ts) merges first; it edits the same file"
source: "director engineer, Oct 27 message: src/director/family-stake.ts words spans in code (MONTH_WORDS)"
lead: words
milestone: play-first
claimed-at: 2026-10-27T16:48:25.276Z
---

**What.** `src/director/family-stake.ts` says a span of days as words from a list typed into the code ("less than a month", "one month" through "twelve months", "more than a year"). Those words reach the player in the family-stake talk after a filing. Player text belongs in the English engine's banks, so a span said here and a span said anywhere else can drift apart, and the words are never graded.

**Rules.** No hand-written player text in code: the span's words come from a bank under `data/english`, read by the English engine, and the director passes only the number of days. One rule, all 56 places: nothing about the wording depends on the place.

**Done when.** `monthsSaid` and `MONTH_WORDS` are gone from `src/director`. The family-stake facts carry the span in days, and the English engine words it from a bank. In a drawn place (buildBenchWorld, seed printed), `family-stake-scene.test.ts` still shows the talk saying the race's length in months, with the same words the test saw before. `english-parts-banks` passes.

**Time box.** 1 hour.

**You will see.** The same talk after a filing, saying the race's length in months, with its words from the bank.

**Screenshot.** None needed: the words a player sees do not change.

**Files.** src/director/family-stake.ts, src/english, data/english

**Notes.** Filed by the words lead on Oct 27. Wait for #6273, which changes the numbers in the same file.
