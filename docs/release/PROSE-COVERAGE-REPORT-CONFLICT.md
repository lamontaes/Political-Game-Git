# The one tracked prose artifact, and what it costs

A proposal for the morning, not a change. Nothing here was applied.

`docs/prose-inventory/coverage-report.md` conflicted on essentially every base
merge on the night of 2026-09-22 — three times on #307 alone, twelve separate
revisions of it on this lane's branch, and once on every merge this lane made.
With main taking a merge every two to four minutes and roughly three CI
verdicts left before nine, a resolution per merge is a real tax on the train.

## Why it is tracked, which is the part that matters

It is not tracked by accident, and the obvious fix — stop tracking it, the way
its three siblings already are — would quietly remove a guarantee the project
deliberately built.

`scripts/prose-corpus/cli.ts` writes eight artifacts. Four of them are
gitignored (`.gitignore` lines 37 to 40: `coverage-candidates.json`,
`prose-inventory.json`, `prose-inventory.csv`, `review-packet.html`), and the
code says why in its own words: their committed revisions "were most of the
repository's history". `coverage-report.md` is the one that stayed.

The reason it stayed is `scripts/prose-corpus/corpus.test.ts`, in the case
named **"reports counts that match a live measurement, not a stale run"**. It
reads the committed report off disk and asserts it contains the counts the
scanner measures _now_:

```ts
const coverage = buildCoverageReport(inventory);
const report = readFileSync("docs/prose-inventory/coverage-report.md", "utf8");
expect(report).toContain(
  `Scanned ${coverage.scannedFiles} files holding ${coverage.totalLiterals} string`,
);
expect(report).toContain(`| INVENTORIED | ${coverage.counts.INVENTORIED} |`);
```

Its own comment records what it is defending against: an earlier version pinned
three literal counts, and refreshing those was "exactly the 'fix the number'
move the rest of this file exists to avoid". So the committed report is a
**tripwire**: adding prose without regenerating fails the build. That is worth
keeping, and it is the constraint any fix has to satisfy.

## What it costs

The tripwire needs eight lines. The tracked file is **545**, and nearly all of
it is a per-file list of trees not scanned and why — text that changes whenever
anybody adds a file anywhere under `src/`. So every branch that adds a source
file rewrites the same region of the same document, and two such branches
merging is a conflict by construction. The conflict surface is about seventy
times the size of the assertion surface.

## Three options, with the one to prefer

**Shrink what is tracked to the assertion surface.** Emit the counts and the
scanned-files line to a small tracked file — a dozen lines, or a
`coverage-counts.json` — and gitignore the 545-line prose report alongside its
three siblings. The tripwire keeps working unchanged, because it only ever
asserted on those numbers. Conflicts become rare, and trivial when they happen,
because two branches only collide if they change the totals rather than the
file list. This is the recommendation.

**Regenerate and compare in CI rather than in the tree.** Also correct, and
strictly better as a gate, but it moves a check that currently runs in four
seconds locally into a job on a queue that is the scarcest resource in the
project. Worth doing later; not worth doing while capacity is the bottleneck.

**Stop tracking it outright.** Cheapest, and the one to avoid. It leaves the
test reading a file that may be absent or — see below — may belong to another
branch entirely, so the "a stale report still fails" guarantee becomes a
coin flip nobody would notice losing.

## The same disease, and the easier case: `docs/dehardwire/census.json`

`coverage-report.md` is not alone. `docs/dehardwire/census.json` conflicted on
three of one lane's six merges on the same night, and this lane hit it too. The
recommendation above should be read as covering the class rather than the one
file — but the two are not the same case, and the difference decides how
confidently to act.

The census has **no tripwire at all**. `src/presentation/dehardwire-census.test.ts`
touches it twice and neither case reads the committed bytes:

- the first runs `scripts/dehardwire-census.mjs --check`, which recomputes the
  census in memory and never opens the file — the only write is guarded by
  `if (!checkOnly)` and there is no corresponding read;
- the second runs the generator to write the file _first_, then reads it back
  and asserts on what it has just produced.

Both cases pass identically if the file is not tracked. So where
`coverage-report.md` genuinely reads committed bytes and earns its place at the
cost of conflicts, the census is 138 lines of conflict cost protecting nothing.
Untracking it is unconditional rather than a trade, and it does not need the
assertion-surface split that the coverage report does.

Stating the difference is the point. "Both files conflict a lot, untrack both"
would have been right by accident here and wrong on the coverage report, whose
committed copy is the whole mechanism.

## The defect underneath, which is worth fixing on its own

`check` compares each artifact against "whichever copies are actually on disk",
by its own comment, and skips the ones it cannot find. That is sound in a fresh
clone and unsound in a clone that switches branches, because `git checkout`
never touches an ignored file. Measured tonight: `corpus:prose -- check` at
`codex/client-content-delivery` head `70fa13a7` reported three artifacts
drifting, and none of them was that branch's — they were this lane's previous
branch's regeneration, still sitting on disk. Running `corpus:prose` cleared it
and `git status` then reported no change at all, which is the proof that
nothing tracked was ever wrong.

The loud direction costs a round. **The quiet direction is worse**: switch onto
a branch whose real artifacts are stale, straight after one whose were current,
and the gate passes on somebody else's files. A gate that can report green for a
reason unrelated to the code is a worse failure than tonight's false reds,
because nothing prompts anybody to look.

### What this mechanism does not explain

Stated plainly, because a mechanism stretched one case too far is the shape of
error this night has been spent removing. **This accounts for local
reproductions in a clone that switches branches. It does not account for a
hosted-runner failure.** A GitHub runner does `actions/checkout` into an empty
workspace, so there is no previous branch's `prose-inventory.json` on that disk
to compare against and this trap cannot fire there.

The hosted failure on the client line that night had a different and equally
real cause, and it is the branch rule once more. `72261fe6` reworded
`describeBriefing` without re-minting its anchor; `74970f85` is the repair.
Checked here rather than taken on report: `74970f85` is **not** an ancestor of
`6113f0ea`, the base of the head that actually failed, while `72261fe6` **is**
— so that tree genuinely carried the break and not the fix. `74970f85` became
an ancestor of `70fa13a7`, the base now, through the #276 merge. Two true
measurements of two trees twenty minutes apart, reading as a contradiction.

So the night produced **two** false-red mechanisms from different causes, and
they should be reported as two.

The fix is small and independent of the tracking question: for a tracked
artifact compare against `git show HEAD:<path>` rather than the working tree,
and for an ignored one skip it outright instead of comparing a copy whose
provenance is unknown. A comparison against a file the branch does not own is
not a weaker check, it is a different check that happens to be spelled the same.
