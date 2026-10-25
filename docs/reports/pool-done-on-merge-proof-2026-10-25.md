# Pool done-on-merge: the per-PR group holds through a day of merges

Headline: The workflow that marks a pool item done when its PR merges no longer loses runs. In the day after the fix, 102 PRs merged, none of its runs was canceled, and every merged PR's own item was marked done.

## What this means

A merger no longer has to mark items done by hand after a burst of merges. The one gap left is an item a PR names below its first line, which the workflow never reads: two such items still read in-pr after their PRs merged.

## What was checked

- **Canceled runs.** The workflow's last 100 runs, from October 24 at 12:45 UTC to October 25 at 07:00 UTC: 95 succeeded, 5 were skipped (pull requests closed without merging), and none was canceled. Before the fix, 303 of 400 runs were canceled.
- **Bursts.** That window holds bursts of well over ten merges: 102 PRs merged between October 24 at 12:00 UTC and 23:50 UTC, 19 of them between 14:00 and 15:00.
- **Every merged PR's item done.** Of the 127 pool items marked in-pr on main on October 25, two name a PR that has merged. Neither is that PR's own item (its first line):
  - `core-public-office-staff-follows-jobs`, built inside the PR whose item is `core-civic-inputs-test-city-clerk-staff-missing` (done).
  - `world-school-attendance-same-tiers`, fixed inside the PR whose item is `world-school-income-same-tiers` (done).
- No other in-pr item names a PR that has merged.

## Left for the CTO

- Mark the two items above done; the pool tool allows that only for the CTO.
- Whether the workflow should also read items a PR body names below its first line is a question for the CTO. Today a PR that finishes a second item has to say so, and the second item is flipped by hand.

## How this was run

- Run list: the GitHub Actions API, workflow `pool-done-on-merge.yml`, newest 100 runs (726 in all), counted by conclusion.
- Merged PRs: a GitHub search for pull requests merged on or after October 24 at 12:00 UTC (102 results).
- In-pr items: every file in `docs/pool/items/` on main whose status is `in-pr`, with its `pr:` number, matched against the merged list.
- The workflow's group on main is `pool-done-on-merge-${{ github.event.pull_request.number }}`, with `cancel-in-progress: false`.
