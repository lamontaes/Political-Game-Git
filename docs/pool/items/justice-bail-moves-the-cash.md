---
id: justice-bail-moves-the-cash
title: "Pretrial bail is marked posted but no money moves to the court"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/bail-cash
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:52:41.074Z
---

**What.** Pretrial bail from PR 5200 marks a bail posted but moves no money: liquidMinor >= pretrialBailMinor decides held or posted, and nothing moves from the person's account to the court's. Posting bail should be a movement on the journal from the person's account to the court's, returned at disposition, so the other engines read a real dollar. If that cannot land now, register a stopgap row with a marker and name it in the item notes.

**Rules.** An effect is a read, not a record: a posted bail is a dollar on the journal another engine reads, so the posted bail and its journal entries must both exist, and the marker is only the stopgap while they do not.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) one played year shows one bail posted, with the journal entry ids for the move out of the person's account and into the court's, and the return at disposition; the justice tests (npm test -- src/core2/justice) pass.

**Files.** src/core2/justice-pretrial.ts, src/core2/modules/justice.ts, src/core2/justice-pretrial.test.ts, src/core2/data/justice/parameters.json, src/core2/data/stopgaps.json

**Notes.** Found from PR 5200, merged Oct 19 23:26 UTC. The files are the ones that PR touched: gh api repos/lamontaes/Political-Game-Git/pulls/5200/files. The id uses the justice prefix from the owner's ask; its area is gov.
