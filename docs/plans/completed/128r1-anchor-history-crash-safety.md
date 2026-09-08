# 128R1 — fail-closed anchor history and crash-safe reservations

Executes the Drive packet `128R1 — FAIL-CLOSED ANCHOR HISTORY + CRASH-SAFE
RESERVATIONS`, on the same branch and the same pull request as PORK-01
(`#128`). Repairs the reliability of the development-time prose anchor
allocator. No new identity semantics, no new service, no runtime or save
dependency, no player-facing change.

Companion to [`pork-01-anchor-allocation-ledger.md`](pork-01-anchor-allocation-ledger.md),
which introduced the ledger this repair hardens.

## What was wrong

PORK-01 added an ever-issued ledger so a retired anchor id is never handed to
new prose. The mechanism was right; the guarantees around it were not. Every
failure below was reproduced against the **production CLI** on disposable
copies before any code changed — not inferred from reading it.

The reproducer, throughout: mint a synthetic `RETURN_SUMMARY-0023`, retire it,
then add an unrelated new sentence to the same symbol.

| #   | Attack                                                                  | Before                                                                                                                                                       | After                                                |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| A   | Intact history (control)                                                | exit 0, new text gets `-0024`                                                                                                                                | unchanged — exit 0, `-0024`                          |
| B   | Ledger file deleted                                                     | **exit 0, new text gets `-0023`**                                                                                                                            | exit 1 `lost-ledger`, sidecar untouched              |
| C   | Exactly one retired entry removed                                       | **exit 0, reuses `-0023`**                                                                                                                                   | exit 1 `history-mismatch`, sidecar untouched         |
| D   | `issued` key absent                                                     | **exit 0, reuses `-0023`**                                                                                                                                   | exit 1, "no \`issued\` array"                        |
| E   | `issued: null`                                                          | **exit 0, reuses `-0023`**                                                                                                                                   | exit 1, "no \`issued\` array"                        |
| F   | `issued` a bare string                                                  | **exit 0, reuses `-0023`**                                                                                                                                   | exit 1, "no \`issued\` array"                        |
| G   | Empty file                                                              | exit 1                                                                                                                                                       | unchanged — exit 1, clearer message                  |
| H   | Truncated JSON                                                          | exit 1                                                                                                                                                       | unchanged — exit 1, clearer message                  |
| I   | Unknown schema                                                          | exit 1                                                                                                                                                       | unchanged — exit 1                                   |
| J   | Emptied ledger vs `corpus:prose check`                                  | **exit 0, "OK"**                                                                                                                                             | exit 1, ledger not mutated                           |
| K   | One id bound to two live sites                                          | **exit 0, one binding silently destroyed (394 → 393 anchors, reported as neither retired nor changed); the next run re-minted that site a brand-new number** | exit 1, both bindings named, nothing written         |
| L   | Ledger write fails while retiring a live id the ledger had not absorbed | **the id's last reservation is lost; retry reuses it**                                                                                                       | refused before any mutation; see _Persistence_ below |
| M   | Checkpoint missing                                                      | n/a (did not exist)                                                                                                                                          | exit 1 `lost-baseline`                               |

B–F share one root cause: the loader's `parsed.issued ?? []` read destroyed
history as a fresh install. J is separate: nothing on the validation path
looked at permanence at all. K is a `Map` keyed by anchor id silently
collapsing two bindings into one. L is write ordering.

## What changed

### Established history is required, and its loss is detectable

History now lives in **two independent files**, and neither alone authorises an
allocation:

1. `computed-anchor-ledger.json` — every id ever issued, in full. Append-only.
2. `computed-anchor-baseline.json` — **new**. An independent checkpoint: how
   many ids the ledger held, a digest of that exact list, and the highest index
   ever issued per symbol.

The checkpoint is written beside the ledger and read back as prior evidence. It
is not recomputed from the ledger at read time — a checksum recomputed from the
same truncated input proves nothing, which is exactly why it is a separate
retained file. Deleting one retired id leaves a ledger that still parses and
still validates, but whose count and digest no longer match what was recorded
before the deletion.

**Trust anchor.** Both files are committed and reviewed together. Nothing reads
git history, branch order, the network, or anything outside these two files.

**Threat boundary, stated honestly.** This detects the loss, truncation,
corruption or lagging of _either_ file. It does **not** defend against the
simultaneous replacement of _both_ with a mutually consistent forgery. Anyone
who can rewrite the ledger and its checkpoint together can declare any history.
What is guaranteed is that doing so is a visible, reviewable edit to two
committed files, never a silent consequence of a routine mint.

### A second, independent guard: the allocator's floor

`highWater` is a per-symbol mark the allocator never goes below, whatever the
ledger says. Detection and the floor are deliberately separate: even a ledger
that lost entries cannot hand a number back, because the mark survives in the
other file. **A gap left by a lost reservation is burned, not backfilled.**

### Loader validation

Full schema and field-shape validation at the boundary, before any caller can
mutate a sidecar on the strength of it: `issued` must be an array (never
coerced from missing, `null`, or a string), every entry must match the anchor-id
grammar, and duplicates are rejected. The **declared duplicate policy** is that
the ledger is always written sorted and de-duplicated, so a repeat means the
file was hand-edited or hand-merged — a corrupt authoritative file, not a
convenience to absorb. Absence returns `null`, which is _not_ an empty history.

### Bootstrap is explicit and bounded

`npm run corpus:prose -- bootstrap` is the only operation permitted to create
history from the live sidecar, and it refuses the moment either file exists. It
prints what it cannot know: a seed records only ids that are _alive_, so any id
retired before that point is invisible to it. Normal mint, absorb and check
paths never bootstrap.

### Reserve before rebind or retire

The old order wrote the sidecar first and history second. It is now reversed:
the union of prior issued ids, existing live ids and newly reserved ids is
persisted **before** any binding is removed or rebound. Every file is replaced
atomically (validated temp write, `fsync`, rename), so an interruption leaves
the old bytes rather than half a file.

Measured at each persistence boundary, with an injected failure at the commit
step:

| Interrupted at    | Result                     | Retry                                                                                                                                          |
| ----------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger commit     | nothing changed at all     | clean, mints `-0023`                                                                                                                           |
| Checkpoint commit | ledger ahead of checkpoint | next run refuses `history-mismatch`; `-- recover` re-derives the checkpoint (history only grew, no symbol went backwards); retry then succeeds |
| Sidecar commit    | history durable and ahead  | retry mints `-0024`; `-0023` is burned **unused**, never recycled                                                                              |

A failed operation may safely burn an unused id. It never recycles one, never
reports success on partial authoritative state, and never continues from lost
history.

### Recovery rule, and its limit

`npm run corpus:prose -- recover` repairs only in the direction history
actually moves:

- checkpoint missing, ledger intact → re-derive the checkpoint;
- ledger missing, checkpoint intact → rebuild conservatively by reserving every
  index up to each recorded mark. That is a _superset_ of what was issued: some
  numbers are burned unused, which is the safe direction;
- both present, ledger **grew** with no symbol going backwards → a mint
  interrupted between its two writes; re-derive the checkpoint;
- both present and history **shrank** or regressed → **refuse**. Re-deriving a
  checkpoint from a shortened ledger would launder a truncation into a new
  baseline. Ids at or below the recorded marks stay closed regardless — the
  floor does not depend on this command succeeding.

### Validation actually runs

`corpus:prose -- check` now verifies allocation history, and is strictly
read-only: it reports and never repairs, because a validator that rewrites what
it validates cannot be trusted to have found anything.

But **CI does not run that command**. `npm run validate` runs format, lint,
typecheck, `npm run test`, the source and build steps, and `validate:art`. So
the gate is also a case in `corpus.test.ts`, which runs under `npm run test`
and therefore under `npm run validate` in CI. Verified by sabotage: emptying
the ledger fails that test with the `history-mismatch` detail.

### Duplicate live identities

`mintAnchors` refuses duplicate anchor ids across distinct live bindings before
computing anything, naming every binding involved. A collision produces a
precise reconciliation error — never last-writer-wins, nearest-text matching,
or silent renumbering — and states that the owner review recorded against an id
stays with whichever binding keeps it and does not transfer to the replacement.
Ordinary two-branch sidecar merges still conflict in git, which is useful
refusal; this closes the hand-unioned case that git cannot catch.

### No caller can bypass history

`mintAnchors`' third argument had a compatibility default of "reserve the live
sidecar alone" — the original defect written as a parameter, reachable by any
caller that forgot the argument. It is now **required and has no default**.
Every caller was audited: the CLI builds it from verified files;
`identity.test.ts` and `anchor-ledger.test.ts` now state it explicitly. The
synthetic reproducer that passes deliberately-empty history is retained as a
pin, and can no longer masquerade as the protected path.

## Unchanged identity semantics

Everything the previous round accepted still holds, and is still covered:
unambiguous rewording keeps its anchor and changes only `textRevision`;
unchanged text with a changed `contextRevision` is unaffected; simultaneous
ambiguous edits are refused and write nothing; repeated exact literals and
occurrence handling are untouched; eight retire/add cycles reuse nothing; a
no-op run mints, rewords and retires nothing. The accepted
`computed-anchors.json` schema and the owner-review identity contract are
unchanged. The passing non-gating preflight disk/heading cargo is untouched.

## Introduced operational prerequisite

**A lagging ledger is no longer silently absorbed.** PORK-01 seeded the ledger
from the live sidecar on every run and called an empty or lagging ledger safe.
That is exactly the behaviour that made a destroyed ledger survivable, because
the retired ids are precisely the ones the sidecar does not contain.

So after a merge that brings in another branch's minted anchors, a mint now
**refuses** with `unreserved-live-id` and names the remedy. Absorbing is a
deliberate, auditable step:

```
npm run corpus:prose -- ledger    # absorb live ids, then mint as usual
```

This is one extra command after such a merge, and it is the cost of the ledger
no longer being able to re-seed itself out of thin air.

## Path override

The three anchor paths honour `PROSE_ANCHOR_FILE`,
`PROSE_ANCHOR_LEDGER_FILE` and `PROSE_ANCHOR_BASELINE_FILE`. This exists so the
regressions can drive the **real command** against disposable copies rather
than the sidecar an owner's review is pinned to. It relocates the files and
relaxes nothing: every load runs the full validation, and the CLI prints the
paths whenever they are not the defaults, so a scratch run cannot be mistaken
for a real one.

## Ledger synchronisation at integration

This repair does **not** rewrite the live computed-anchor sidecar or ledger;
both are byte-identical to `b13ba7c8`. The new checkpoint was derived from the
committed ledger as it stands (419 ids, digest `c7fae48ba90814f0`, 41 symbols).

One deliberate non-change carried over from PORK-01: the committed sidecar is
not in canonical sort order, because a hand-renumbering upstream left one
anchor out of position. A mint therefore rewrites the file's **order** while
binding every id to exactly the text it was already bound to. That reordering
belongs to that file's owner, not to this cargo, so it is left alone; the CLI
regression asserts identity as a set rather than as bytes, and distinguishes
ordering from identity change. **At integration into `main`, if any branch
merges that mints new anchors, run `-- ledger` before the next mint.**

## Files

- `scripts/prose-corpus/anchor-history.ts` — **new**. Ledger, checkpoint,
  strict loading, atomic writes, integrity verification, allocator floor.
- `scripts/prose-corpus/computed-anchor-baseline.json` — **new**. The checkpoint.
- `scripts/prose-corpus/anchor-history.test.ts` — **new**. 21 on-disk
  corruption, detection, floor and persistence cases.
- `scripts/prose-corpus/anchor-cli.test.ts` — **new**. 16 probes that spawn the
  production CLI against disposable copies.
- `scripts/prose-corpus/anchors.ts` — required history, allocator floor,
  duplicate-binding refusal, atomic sidecar write.
- `scripts/prose-corpus/cli.ts` — verified load, reserve-before-mutate ordering,
  `bootstrap` and `recover` modes, integrity on the check path.
- `scripts/prose-corpus/anchor-ledger.test.ts` — updated to the required-history
  signature; the reuse reproducer retained as a pin.
- `scripts/prose-corpus/identity.test.ts` — call sites state history explicitly.
- `scripts/prose-corpus/corpus.test.ts` — **one** added integration test. No
  count pin altered; the only other change is its import line.

Not touched: `computed-anchors.json`, `computed-anchor-ledger.json`,
`agent-preflight.mjs`, `sources/computed.ts`, `docs/prose-inventory/**`, any
`src/` file, player prose, art, source-domain data, or any dependency.
