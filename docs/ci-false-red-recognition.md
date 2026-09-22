# Telling a cancelled run from a real failure

Four times on the night of 2026-09-22, across at least three lanes, a green
branch was reported red and a lane spent a round on it. Every one was the same
thing, and it is recognisable in about ten seconds.

## What happens

`validate` is only an aggregate job. It reads the other jobs' results and exits
1 unless every one of them says `success`. When a push supersedes an in-flight
run, the required jobs come back **cancelled**, so the gate fails with nothing
having been tested.

The webhook delivers a conclusion, not a cause, so a cancelled supersede and a
real failure look identical until the log is open.

## The two tells

**Open the job log.** If it reads:

```
repository=cancelled
unit=cancelled
browser=cancelled
Aggregate validate succeeds only when every mandatory job succeeded.
```

that is this. Nothing ran. It needs no fix, no comment and no re-run.

**Faster: check the head.** Compare the event's `head_sha` against the commits
actually on the branch. The three that woke the nationwide lane that night were
`07f32d72`, `bf42c450` and `125753c3`, and none of them was a commit on the
branch at all. A sha that is not yours, plus `cancelled` upstream, is a
supersede every time.

Confirmed against jobs `106604479045` and `106588134175`.

## Why it cannot block a merge

It only ever appears on a commit that is no longer a branch's head. But a lane
reading an old commit will misread it, which is exactly what happened.

## The separate thing it gets confused with

`main` itself had failing browser shards that night, so a red browser shard on
a PR was probably inherited rather than the PR's. Compare against main's own
baseline by the **union of normalized spec file plus test title**, never shard N
to shard N: Playwright shards by file, so a branch that adds spec files shifts
every boundary.

## The rule

Read the log before acting on any red. Always. And when handing someone a
number they are likely to repeat, say up front what it would look like if it
were wrong — stating the falsifier is cheaper than retracting.
