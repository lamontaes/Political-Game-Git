# A generated file that is also committed: one cause, three symptoms, hours each

Written 2026-09-22 ~11:35Z from three separate failures measured in one night,
two of them by other lanes and one on this branch. Filed together because they
were diagnosed separately, cost hours separately, and have a single cause.

## The cause

Several files in this repository are **produced by a script and also committed
to git**: `docs/prose-inventory/README.md` and `coverage-report.md`,
`docs/dehardwire/census.json`, `src/simulation/municipal-rule-registry.generated.ts`
and its neighbours. Git treats them as ordinary source. They are not: their
content is a function of other files, so any change to those inputs makes the
committed copy wrong without touching it.

That produces two opposite failure modes, and a third effect on top.

## Symptom 1 — branches silently stop being tested

Every merge to `main` rewrites the prose inventory. Within a minute or two,
every open branch conflicts with `main` on those same two files.

**A conflicted pull request gets no CI run at all.** GitHub never builds the
merge ref, so it creates no `pull_request` run — not a queued one, not a
cancelled one. Nothing to read and nothing to cancel. The branch looks like it
is waiting in a queue.

Measured on this lane's two branches: `#283` and `#292` both showed zero check
runs for roughly three hours. `git merge-tree` against `main` showed both
conflicting on `docs/prose-inventory/README.md` and `coverage-report.md`.
Resolving the conflict and pushing produced runs within seconds — which is the
inverse test, not just the explanation. `#283` had taken `main` three times
already and needed a fourth.

Filed independently by another lane as D-089, with its own measurement across
twenty successive mains.

**The behavioural rule:** CI silence is a reason to check mergeability first,
not to wait longer.

## Symptom 2 — a committed artifact quietly stops describing its sources

The mirror image, and the one with no conflict to warn you.

`src/simulation/municipal-rule-registry.generated.ts` is exported from locked
municipal source data. A base merge moved those sources. The generated file did
not conflict, because nothing on either side edited it — it simply stopped
matching what it claims to describe. Nothing in the merge, the diff or the
local gates said so. `check:municipal-generated` on CI caught it:

> Municipal runtime registry differs from its locked sources. Run
> export:municipal-governments.

Fixed by regenerating with the repository's own script. The same shape hit
`docs/dehardwire/census.json` twice on this branch and the prose inventory
once, in the stale direction rather than the conflicting one.

**Where a conflict is loud, staleness is silent** — and it is only caught where
somebody wrote a checker for that specific artifact. Files with no such checker
are stale now and nobody knows.

## Symptom 3 — a gate that passes for the wrong reason

`scripts/release/transition.ts` counts every changed path outside
`docs/release/changes/`, with no code-versus-documentation distinction. Merges
claiming "documents only, so no declaration needed" passed anyway, because
another lane's declaration happened to be inside the range being read. The
check reported agreement it had not established.

This one is a different mechanism from the first two, but it belongs in the
same file: it is another case of a committed artifact's relationship to its
inputs being assumed rather than checked.

## Why these three belong together

Each was diagnosed on its own and each looked like a separate problem — a merge
problem, a CI problem, a release problem. They are one design choice seen from
three sides. The fix for any one of them fixes the others.

Cost, so the fix can be weighed against something real: roughly three hours of
absent CI on two branches in this lane alone, four base merges that existed
only to re-resolve the same two generated files, one real defect that reached
CI because no local gate could see it, and at least two merges to `main` that
passed a check by accident.

## The three options, none picked here

This is a repository-wide choice and it is lamontae's:

1. **Stop committing them.** Generate at build and test time. Loses the ability
   to read them in a diff or on GitHub.
2. **Regenerate and compare in the gate.** Keeps the files readable and makes
   staleness loud everywhere rather than only where someone wrote a checker.
   Costs gate time.
3. **Give them a merge driver** (`.gitattributes`) that regenerates on conflict.
   Fixes symptom 1 cleanly and does nothing for symptom 2.

Option 2 addresses the most symptoms. Option 3 is the cheapest and addresses
the one that cost the most hours tonight. They are not exclusive.

## Named heads, so this is checkable

`#283` `65908739` (the CI failure) and `e0d5b10d` (the fix); `#292`
`c265262d`. `main` at `234ea7d4` and `9d72c0e6`. The failing check is
`check:municipal-generated` inside the `repository` job of `validate.yml`.
