---
id: elections-polls-core2
title: Polls on core2
area: elections
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/polls-core2
pr:
after:
blocked-on:
milestone:
source: acting CTO ruling, Oct 19; replaces the old-core poll work in PRs #5091 and #5081
claimed-at: 2026-10-19T22:27:16.960Z
---

**What.** Polls on core2, replacing the old-core poll work in #5091 and #5081, which were closed because nothing new is added to `src/simulation`. Lift whatever is useful from those PRs into a core2 module.

**Rules.** No dice; a poll samples the views people actually hold, read from their records. One rule, all 56 places.

**Done when.** A drawn place in the played world runs a poll before an election whose result is read from the sampled residents' records, with a test naming the place and seed.

**Files.** `src/core2/modules/`.

**Notes.** Closed PRs #5091 and #5081 hold the old-core attempt.
