---
id: tests-home-talk-quiet-answer-fine-seed
title: "The home-talk test fails where no quiet-answer-fine line plays in a drawn town"
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
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** src/director/conversation-home-lines.test.ts fails on clean main at 6ee49da069 in Lorimor, Iowa (GOLDEN_PATH_SEED=16c9191e6631ee29a608b10ea4aa53b1093ec803): over 400 pairs' talks, no quiet-answer-fine line ever plays, so the check reports 'quiet-answer-fine ... expected 0 to be greater than 0'. The quiet-answer-tired line does play there ('I'm beat. Just glad to be home.'), so the quiet subject opens, but the fine answer is never offered or never picked. The test picks each turn's reply by position, so a change in the number of replies anywhere in a talk changes which answers it reaches. Guards: the fine answer a player can pick in a quiet evening talk at home, which the test keeps playing in every drawn town.

**Cause.** Measured: GOLDEN_PATH_SEED=16c9191e6631ee29a608b10ea4aa53b1093ec803 npx vitest run src/director/conversation-home-lines.test.ts -t 'rewritten goodbyes' fails on clean main and fails the same way with #8166's 24 rebuilt lines; which step leaves quiet-answer-fine out is not yet known.

**Fix.** Find whether the fine answer is never offered in that town (the composer ranks it out) or only never picked by the test's by-position walk; if the second, make the walk reach every offered answer once without lowering what it checks; if the first, fix the ranking at its cause.

**Time box.** 2 hours

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw, or say by record why a place has nothing to show.

**Done when.** In Lorimor, Iowa with that seed and in two more drawn places, the test passes without lowering what it checks, and a second session opening a quiet evening talk at home in a drawn place sees a fine answer among the replies.

**Waits on.** Nothing.

**Files.** src/director/conversation-home-lines.test.ts,src/director/conversation.ts

**Notes.** Found Nov 11 by the words writer while rebuilding #8166 (the run is red on clean main too).
