---
id: words-printed-kinds-without-builders
title: "Twelve kinds of public record the press can print still have no words in News"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: added with npm run pool -- add
---

**What.** printedFacts in src/bench/printed-words.ts words a printed story only through a builder for its source record's kind. A scan of every record the core emits with a news flag, against the builders (Oct 29), found twelve kinds with none: scandal.reported, ballot-measure-result, bill-presented, emergency-declared, item-veto, ribbon-cut, succession, recall-answer, heard, and the President's budget-request, joint-address and official-trip. A story of any of them reaches News with no headline and no first sentence, and src/bench/printed-words.test.ts fails in any drawn place whose year prints one (as it did in Yankton, Frederiksted and Fort Johnson North for the kinds words-printed-interview-bribe-vacancy-unworded fixed).

**Rules.** No hand-written player text in code: each kind's words are news and headline bank pieces, said only from facts its record carries. One rule, all 56 places. Ask why: a kind whose record lacks what a reader needs (a name, an office) gets a line from what it has, never a guess.

**Done when.** Each of the twelve kinds has a builder and at least one headline and one first sentence; src/bench/printed-words.test.ts passes with five seeds the builder did not choose, each place and seed named in the PR body, and a probe over one played year shows zero unworded stories, by record id.

**Files.** src/bench/printed-words.ts, src/english/english-newscast.ts, data/english/parts/news.json, data/english/parts/headlines.json

**Notes.** Filed Oct 29 08:00 UTC by the Words and director session after words-printed-interview-bribe-vacancy-unworded; the scan reads each core2 emit block that sets news, so a kind whose news flag is false at run time may never print.
