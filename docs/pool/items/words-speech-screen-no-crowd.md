---
id: words-speech-screen-no-crowd
title: "The speech-screen test draws no crowd in four places, so it goes red by draw"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On PR 5914's CI (run seed cd19959c29bc9f0fb8a9b00f3f6711a3d96a515a335d78c32cdee24d4e0e2cbb), src/bench/speech-screen.test.ts gave its speech in Wolsey, South Dakota; Hanksville, Vermont; Romulus, Michigan and Londonderry, Vermont, and nobody came in any of them. In each place one candidate tried: the best-connected adult who could file, who knew only four or five people in town, and none of them leaned to come (campaigns whoComes reads the candidate's reachable people). A first speech drawing nobody is real play, so the test needs more than one candidate per place, not a looser check.

**Rules.** One rule, all 56 places: the fix holds for any drawn place and seed. No vacuous tests: the test still requires a speech that reached someone and views that cite the speech record. No dice: who comes stays the people's own leaning.

**Done when.** src/bench/speech-screen.test.ts passes on run seed cd19959c29bc9f0fb8a9b00f3f6711a3d96a515a335d78c32cdee24d4e0e2cbb and on two more seeds the builder did not choose, each place, candidate and cited speech record named in the PR body.

**Files.** src/bench/speech-screen.test.ts

**Notes.** TODO
