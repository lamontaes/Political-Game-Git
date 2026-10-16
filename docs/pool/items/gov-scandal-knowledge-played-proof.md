---
id: gov-scandal-knowledge-played-proof
title: "A played year shows a convicted candidate losing votes only among voters who heard"
area: gov
kind: research
priority: 3
size: S
status: done
claimed-by:
pr: #4764
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

Looked at Oct 16 (claude/scandal-proof), not built. The read is in place and correct: `appealFor` in voting.ts (about line 555) sets the scandal term to `-appealOfShare(scandalShare) * trustWeight` only when `heardScandal` finds a `newsKey(storyId)` fact the voter holds for one of `scandalStoriesOf(candidate)` (taken-bribe reports from `scandalsOf`, convictions from justice), else 0, per voter. What is missing is the proof world: `appealFor` is private and takes a contest and its filings, so the proof needs a charged or convicted official who files for a contest in the same generated year (the corruption test world has the crime but no election, and a played year seldom produces both). Two ways: export a `scandalTermOf(api, voterId, candidateId)` that `appealFor` itself calls (replace, never layer) and assert it per voter in `corruption.test.ts` after the report reaches some people, or drive a played world until a convicted official's seat is up and read the ballots. The first is a small refactor and a test; the second needs a long search for a seed.

Sent back 2026-10-16 from PR #4764 (branch claude/scandal-proof-term): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
