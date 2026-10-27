---
id: words-filing-clerk-line-after-filing
title: "The clerk says nothing once the player files"
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

**What.** After the player files at the counter, the clerk has no line: the filing-visit bank's closing group (clerk, close, next) mixes lines said before filing ('Sign here.') with lines said after it ('You're all set.', 'Good luck.'), and the director never uses it. The play screen shows the filing's status as a record label under the talk instead (PR #6058). Found in Topsfield, Massachusetts (seed 6a7f8264-ee6f-4845-854e-60ff289f587a) and Perry, Georgia.

**Rules.** No hand-written player text: the clerk's answer comes from the bank. Words lead grades the split.

**Done when.** In a drawn place, after a filing is accepted the clerk says one line from a bank group meant for after filing, sourced by the filing record id, shown by a director test and a bench screenshot with place and seed.

**Files.** data/english/parts/filing-visit.json, src/director/mined/filing-bank.ts, src/director/filing-visit.ts, src/bench/filing.ts

**Notes.** TODO Playtest Oct 26 sitting 1 (installed v0.34.0): After "Okay, thank you." the clerk said "on-ballot".
