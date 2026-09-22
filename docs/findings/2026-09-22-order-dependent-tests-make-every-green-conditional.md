# At least two tests depend on what runs alongside them, which makes every green in this repository conditional

Measured 2026-09-22 between roughly 05:00Z and 08:00Z, across `main` and two
feature branches. This is a finding about the test suite as an instrument, not
about any one branch, and it was found by accident while trying to attribute
failures on two pull requests.

## The claim

Two tests in `src/simulation` return different verdicts depending on what else
is running in the same invocation. That is enough to make the following two
sentences simultaneously true of one tree:

- "4,156 tests, 0 failures."
- "`childhood.test.ts :: agency arrives with age` fails."

Neither sentence is a lie, and neither is evidence against the other. A suite
that can produce both is not reporting on the tree; it is reporting on the tree
plus a scheduling accident.

## How it was found

Not deliberately. Two branches were being held for having unattributed test
failures, and the question was whether the failures were theirs or inherited.
The evidence went like this:

- **PR #283**, head `eb80bbc1`: 4,102 tests, 8 failed.
- **`main`**, head `7f2717a2`: 4,108 tests, 0 failed.
- **PR #292**, head `fdc59f60`: 3,966 tests, 1 failed —
  `childhood.test.ts :: agency arrives with age, on the record's own
boundaries`, which is also one of #283's eight.
- **PR #292**, head `6ae33191` (the same branch with `main` merged in): 4,156
  tests, **0 failed**. `childhood` passes.

From the first three rows an inference was drawn and written into #283's
description: two independent branches failing one test points at their shared
base rather than at either branch. The fourth row withdrew it. That inference
has been struck from the PR.

The sharper instance is `civil-personnel-import-graph.test.ts`, which gave
**three different verdicts in three runs**: passing inside one full-suite
invocation, failing inside another, and failing when run alone. Unlike the
`childhood` sequence above, those three runs were not confounded by a changing
head.

## One reproduction on clean `main`, and the limit of it

Run on `main` `7f2717a2` with an untouched worktree, so no branch is involved:

- `src/simulation/civil-personnel-import-graph.test.ts` **alone**: 1 file, 3
  tests, all passing.
- The whole of `src/simulation` in one invocation: 123 files, 1,525 tests, **1
  failed**.

Stated with its limit, because this is a document about overclaiming from thin
measurements: **the name of the failing test in the second run was not
captured** — the run was reduced to its summary lines and the re-run to recover
the name was cancelled when the machine ran out of capacity. So this pair shows
that a clean `main` does not return the same verdict for every scheduling, and
it does not by itself prove the failure was `civil-personnel-import-graph`.
Naming it is a five-minute run for whoever picks this up, and it should be the
first thing done.

## Why this is larger than two tests

**A one-run failure list is a weaker instrument than its precision suggests.**
"8 failed" reads like a measurement. It is a measurement of one scheduling of
one tree. Run it again and the list can differ without a byte changing.

**It breaks attribution in both directions.** All night, the question asked of
every red was "is this mine or inherited?", and the method was to run the same
command on a baseline. That method silently assumes the suite is a function of
the tree. Where it is not, a green baseline does not exculpate and a red one
does not convict. Every attribution resting on such a comparison — including
several made tonight, in both directions — is weaker than it was stated to be.

**A shard boundary can invent or erase a failure.** CI runs this suite in
shards. Which tests share a worker is decided by the shard split, so a change
to the number of shards, to the file list, or to the order the runner walks it
can flip an order-dependent test without anyone touching its code. A branch
that adds one test file can turn another branch's test red.

**It is the same failure shape as the rest of tonight.** A check whose failure
mode is silence: the suite reports success having not actually established it.
A green run here does not mean the assertions held; it means the assertions
held _in that order_.

## What it is not

It is not a claim that the eight failures on #283 are therefore excusable. One
of them, `nationwide-local-governments`, is squarely in that branch's own
subject matter. Order dependence widens the uncertainty; it does not resolve it
in anyone's favour. That is precisely the point — an instrument that cannot
convict also cannot acquit.

## What would fix it

Stated as options rather than a decision, because this is a suite-wide change
and not tonight's work:

1. **Find the shared state.** Both suspect tests read world or registry state
   that a sibling test mutates. A module-level cache, a singleton registry or a
   frozen-then-modified fixture are the usual causes. This is the real fix.
2. **Make the dependence loud.** Vitest can randomise file order with a
   recorded seed. A randomised order turns a silent conditional green into a
   reproducible red, which is the whole difference between a check that fails
   and a check that goes quiet.
3. **Isolate per file.** Running each test file in its own environment removes
   the dependence without finding it. It costs wall-clock and it hides the
   defect rather than fixing it, so it is a mitigation, not an answer.

Option 2 is cheap and is the one worth doing first, because until the
dependence is loud, every measurement taken off this suite carries an asterisk
nobody can see.

## Named heads, so this is checkable

`main` `7f2717a2` and `7fc33c85`; #283 `eb80bbc1`; #292 `fdc59f60` and
`6ae33191`. The suspect tests are
`src/simulation/civil-personnel-import-graph.test.ts` and
`src/simulation/childhood.test.ts :: agency arrives with age, on the record's
own boundaries`.
