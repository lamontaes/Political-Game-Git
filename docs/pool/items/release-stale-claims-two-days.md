---
id: release-stale-claims-two-days
title: "Claims from Oct 18 have a branch with commits and no PR for two days: nobody else can take them"
area: release
kind: bug
priority: 3
size: S
status: blocked
claimed-by: claude/political-game-pool-yucp92-hh
pr:
blocked-on: obsolete: the four claims it names are all in PR (pool feeder Oct 20); CTO to drop
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:51:23.947Z
---

**What.** world-corporate-office-staff-never-paid, world-home-turnover, core-old-imports-opening-work and world-worker-unpaid-four-months were claimed on Oct 18 and their branches (claude/corporate-office-staff-paid, claude/home-turnover-split, claude/old-imports-opening-work, claude/worker-unpaid-four-months) hold 2 to 4 commits each, but no PR was opened and the claims block other builders while the pool is nearly empty. The CTO decides whether each is released for a fresh session to finish on its branch (as was done for PR #5302) or left to its builder.

**Rules.** Never push to another session's branch without the CTO releasing the claim; the claim command refuses an item that is not open.

**Done when.** For each of the four items the CTO either sets it open with the branch named in Notes or records that its builder is still working; shown by the four item files and docs/pool/INDEX.md, no test needed.

**Files.** docs/pool/items/world-corporate-office-staff-never-paid.md, docs/pool/items/world-home-turnover.md, docs/pool/items/core-old-imports-opening-work.md, docs/pool/items/world-worker-unpaid-four-months.md

**Notes.** TODO

Corrected Oct 20 (claude/stale-claims-evidence): the premise was wrong. I read an older listing. On current main the four items are in-pr with open PRs (three are pool-notes-only branches, the fourth, #5011, was updated Oct 20 03:33 UTC), so no claim is stale and nothing is blocked. The CTO can drop this item.

**Checked Oct 20 (claude, branch claude/stale-claims-facts).** Commits on each branch beyond main, and whether a PR exists:

- claude/corporate-office-staff-paid (world-corporate-office-staff-never-paid): 2 commits, both pool bookkeeping (the item body and its open status); no game code; no PR.
- claude/home-turnover-split (world-home-turnover): 3 commits, all pool bookkeeping (claim, blocked, the split into six items); no game code; no PR. The six split items are the live work.
- claude/old-imports-opening-work (core-old-imports-opening-work): 2 commits, both pool bookkeeping; no game code; no PR.
- claude/worker-unpaid-four-months (world-worker-unpaid-four-months): 4 commits, two of them real (the wages-unpaid check script); **PR #5011 is open** (draft). The pool entry on main still said claimed with no PR because its in-pr status commit sits on that branch; I set it in-pr with #5011 on main. Not stale, and not mine to release.

So nothing is lost if the first three are released: they carry no code. Whether to release them is still the CTO's call.

**Correction, Oct 20 (claude).** Looking up each branch's pull requests (the first check looked only at commits): all four have an open draft PR: #5035 (core-old-imports-opening-work), #5041 (world-corporate-office-staff-never-paid), #5034 (world-home-turnover) and #5011 (world-worker-unpaid-four-months). The pool entries on main showed "claimed" with no PR because each branch's in-pr status commit sat on the branch, not on main; I set all four in-pr with those numbers. So none of the four claims is stale and nothing needs a CTO release. This item can be dropped.
