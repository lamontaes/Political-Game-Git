---
id: gov-reach-rows-read-by-an-engine
title: "Law reach rows are read only by a screen, not by an engine"
area: gov
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4684
blocked-on:
milestone:
source: "split from gov-next-from-the-audit-this-lane (laws stress audit, defect 14)"
claimed-at:
---

**What.** Defect 14: an ordinance's duty on a county department and the law facts a person learns are written as reach rows and read by nothing that decides. On main `reachOn` is read only by the bench card (`src/bench/card.ts`). Have an engine read the rows at the moment it decides (a department's budget request reading the duty it now carries, a person's stance reading the law fact they learned), or stop writing the rows nothing reads.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a county ordinance that puts a duty on a department changes that department's next budget request or act, named by reach row id and the reading record id, and a test in src/core2/law-reach-group-a.test.ts covers it.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/host.ts, src/core2/modules/budgets.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 14. Verify against main before starting; the audit ran on the Oct 14 build.

Looked at Oct 16 (claude, released, not built): reach rows are written by the group-a records (group-a-records.ts `applyRecords`) with targets of people, organizations, counted groups and mechanics, and only `reachOn` in the bench card reads them. No engine has a "department budget request" to read a duty into (the only budget request in core2 is the president's, office-day-federal-president.ts), so reading a county duty needs that request to exist first, or a smaller reader chosen by the owner or CTO. The cheapest honest options: (1) have budgets.ts add a compliance cost to the enforcing department's line while a compliance row on that department is open, read through `reachedBy`; (2) stop writing organization rows whose `kind` is compliance and nothing reads. Decide which before building.

Sent back 2026-10-16 from PR #4684 (branch claude/reach-read): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4684 (branch claude/reach-read): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
