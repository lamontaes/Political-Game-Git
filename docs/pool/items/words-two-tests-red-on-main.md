---
id: words-two-tests-red-on-main
title: "Two Words tests fail on main: a narrate tag on a cause part, and a numeric literal in words.ts"
area: words
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/words-two-tests-red-on-main
pr: #4617
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:54:14.726Z
---

**What.** Two tests fail on a clean main. `scripts/dialogue-batch/coverage-table.test.ts` "tags every part with the move its bank's rules give it" fails on `scene-words.cause-job-started-self.you-start-a-new-job-at-employer`: the part is tagged `narrate` but the bank's rules give `deliver-news`. `src/director/director.test.ts` "registers every stopgap it marks and keeps numbers in data" fails with a numeric literal reported at `words.ts:1`. Fix each at the root: retag the part (or the rule) so the tag and the rules agree, and move or register the literal.

**Rules.** No hand-written player text: change only tags and data, never a sentence; the numeric-literal tripwire stays on; American English.

**Done when.** Both tests pass on a branch from main, shown in the PR body with the command for each, and a clean `npm run spelling` for the changed files. The two failures were seen on 2026-10-16 while finishing director-narrator-situation-leads and words-scene-endpoints.

**Files.** data/english/parts/scene-words.json, scripts/english-corpus/tag-moves.ts, src/director/words.ts, src/director/director.test.ts

**Notes.** The two world-moments failures are director-world-moments-red-on-main (PR #4589).
