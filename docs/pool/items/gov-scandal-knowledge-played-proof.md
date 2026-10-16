---
id: gov-scandal-knowledge-played-proof
title: "A played year shows a convicted candidate losing votes only among voters who heard"
area: gov
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found by gov-u3-conflict-to-flag"
claimed-at:
---

**What.** The scandal term in a voter's appeal reads that voter's own knowledge of the candidate's scandal stories, not a flag. Nothing yet shows it end to end in a generated world. Run a played world (buildBenchWorld) in a drawn place until a candidate who was charged or convicted is on a ballot, and show the ballots: the scandal term is negative for exactly the voters who knew the story, and zero for the rest.

**Rules.** Ask why: each voter's scandal term cites the story they received. One rule, all 56 places; no dice.

**Done when.** In a drawn place and seed (named in the PR body) with a charged candidate on a ballot in the played world, the ballots' scandal terms match who knew the story, listed by ballot record id; a test keeps it.

**Files.** src/core2/modules/voting.ts, src/core2/modules/corruption.ts

**Notes.** Needs a world where the corruption engine produces a conviction before an election; the corruption test builds one (`corruption.test.ts`).
