---
id: people-minor-left-alone
title: "A 17-year-old is left alone when their guardians move away (Richland, Georgia)"
area: people
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/people-minor-left-alone
pr: #4698
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T17:23:00.952Z
---

**What.** In Richland, Georgia (`scene-year.ts --seed w15-h`, place 1365016) the mother and brother moved away on November 7, 2026 (`person.moved-away:person_3a757177f2398cbe:2026-11-07`) and left Alexander, 17, alone in household `household_a3ed9de88e5107c7`, which was evicted on January 23, 2027. A minor moves with their guardian, so the moves engine must not leave a minor behind with no adult at home. The family scene can then tell the minor.

**Rules.** No dice: who moves is decided by the moves engine's reasons, and a minor follows the guardian they live with. One model, two tiers: the same rule for a counted minor. Ask why: the move record names the guardian the minor went with.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) leaves no minor alone in a household, shown by household record ids after each move, and the moves test covers a guardian leaving with a minor. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts

**Notes.** From the Words session's notes (Oct 15). The family scene could not tell Alexander because nobody was home.

Sent back 2026-10-16 from PR #4698 (branch claude/people-minor-left-alone): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
