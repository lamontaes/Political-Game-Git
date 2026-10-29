---
id: words-four-tests-red-outside-release
title: "Four words-area tests fail on main outside the release run: two batch tests do not load, one reads a trimmed bank, one fails only when its whole file runs"
area: words
kind: bug
priority: 2
size: S
lead: words
status: done
claimed-by:
pr: #6736
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at c1a95d3572: scripts/dialogue-batch/coverage-table.test.ts and scripts/dialogue-batch/stage-world.test.ts fail at load (TypeError: Cannot read properties of undefined (reading 'id')); tests/english-exchanges.test.ts reads data/english/parts/hearing.json, trimmed in 881e7c4feb; src/director/conversation.test.ts 'talks like small talk: short turns' fails (19 is not greater than 20) when the whole file runs and passes alone, so an earlier test in the file changes what it reads. The release run does not run them, so main stays green while they fail.

**Rules.** Never skip, disable or quarantine a test. Replace, never layer: a test of a deleted bank is deleted with the bank, and a batch script nothing runs goes.

**Done when.** npx vitest run scripts/dialogue-batch tests/english-exchanges.test.ts src/director/conversation.test.ts passes on main, or each failing file is deleted with the code it tested, named in the PR body with what read it.

**Files.** scripts/dialogue-batch/coverage-table.test.ts, scripts/dialogue-batch/stage-world.test.ts, tests/english-exchanges.test.ts, src/director/conversation.test.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6736 merged (the done flip failed while branch protection refused the flip job's push).
