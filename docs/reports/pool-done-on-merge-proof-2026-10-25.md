# Pool done-on-merge: the per-PR group holds through a day of merges

Headline: The workflow that marks a pool item done when its PR merges no longer loses runs. In the day after the fix, 102 PRs merged, none of its runs was canceled, and every merged PR's own item was marked done.

## What this means

The per-PR group prevents merge bursts from canceling waiting runs. Secondary items still need explicit reconciliation: the workflow reads the first-line item, rather than every item mentioned in a PR body. Two such completed items were reconciled manually on October 25, as described below.

## What was checked

- **Canceled runs.** The newest 100 workflow runs created on or before October 25 at 07:00 UTC span October 24 at 12:36:19 UTC through October 25 at 06:05:33 UTC: 97 succeeded, 3 were skipped, and none was canceled. There are 724 runs through that cutoff. Merger 2 reproduced these API counts on October 25. Before the fix, 303 of 400 runs were canceled.
- **Bursts.** That window holds bursts of well over ten merges: 102 PRs merged between October 24 at 12:00 UTC and 23:50 UTC, 19 of them between 14:00 and 15:00.
- **Every merged PR's item done.** Of the 127 pool items marked in-pr on main on October 25, two name a PR that has merged. Neither is that PR's own item (its first line):
  - `core-public-office-staff-follows-jobs`, built inside the PR whose item is `core-civic-inputs-test-city-clerk-staff-missing` (done).
  - `world-school-attendance-same-tiers`, fixed inside the PR whose item is `world-school-income-same-tiers` (done).
- No other in-pr item names a PR that has merged.

## Secondary items reconciled

- Merger 2 checked the merged PR evidence and current implementation, then used the official pool status command as CTO to mark `core-public-office-staff-follows-jobs` done with PR #5918 and `world-school-attendance-same-tiers` done with PR #5609. Both reached main in `3a9c586587280fbc258eb8120047f7d557ca0b9a`. These are manual secondary-item updates, separate from the workflow evidence.
- Whether the workflow should also read items a PR body names below its first line is a question for the CTO. Today a PR that finishes a second item has to say so, and the second item is flipped by hand.

## How this was run

- Run list: the GitHub Actions API, workflow `pool-done-on-merge.yml`, newest 100 runs created on or before October 25 at 07:00 UTC (724 through that cutoff), counted by conclusion.
- Merged PRs: a GitHub search for pull requests merged from October 24 at 12:00 UTC through October 25 at 07:00 UTC (102 results, independently recounted by Merger 2).
- In-pr items: every file in `docs/pool/items/` on main whose status is `in-pr`, with its `pr:` number, matched against the merged list.
- The workflow's group on main is `pool-done-on-merge-${{ github.event.pull_request.number }}`, with `cancel-in-progress: false`.
