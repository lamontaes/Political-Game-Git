# 128R2 — monotonic ledger absorption and override/recovery hardening

Executes the Drive packet `128R2 — MONOTONIC LEDGER ABSORPTION + OVERRIDE/RECOVERY
HARDENING` (2026-09-08), on the same branch and pull request as PORK-01 and
128R1 (`#128`). Repair baseline `7086196f`, which 128A2 independently rejected.

Bounded second repair of the development-time prose anchor allocator. No
allocator redesign, no new service, no runtime or save dependency, no
player-facing change.

Supersedes the `-- ledger`, recovery and path-override claims in
[`128r1-anchor-history-crash-safety.md`](128r1-anchor-history-crash-safety.md).
Everything else in that note still stands.

## The non-negotiable contract

An issued anchor identity is monotonic history. **No normal command — `--
ledger`, `-- recover`, `-- anchors`, `-- check`, `-- bootstrap`, or any
path-override use — may convert a history regression into a new accepted
baseline, or make a previously issued number allocatable again.**

## What 128A2 found, reproduced at the production CLI

Every failure below was reproduced through the real `npm run corpus:prose` on
disposable copies before any code changed. The auditor's own report was not
available in this environment and was not relied on.

The controlling reproducer: mint a synthetic `RETURN_SUMMARY-0023`, retire it,
surgically remove **only that retired id** from the ledger, leave the older
checkpoint intact, and run `-- ledger`.

| #   | Attack                                                              | Before (`7086196`)                                                                                                                | After                                                                       |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| N1  | **Controlling.** Shortened ledger + intact checkpoint → `-- ledger` | **exit 0.** Checkpoint rewritten _downward_: count 420→419, digest `01f2b3fa…`→`c7fae48b…`, `RETURN_SUMMARY` high-water **23→22** | exit 1 `history-mismatch`, **zero writes** to ledger, checkpoint or sidecar |
| N1b | …then an unrelated mint                                             | **exit 0, new prose received `RETURN_SUMMARY-0023`**                                                                              | exit 1; `-0023` never allocated                                             |
| N2  | Duplicate live id → `-- ledger`                                     | **exit 0**, accepted                                                                                                              | exit 1 on `ledger`, `anchors`, `recover` and `check`, both bindings named   |
| N3  | Invalid live id (`"not a valid id"`) → `-- ledger`                  | **exit 0**, absorbed verbatim into the ledger; every later command then refused to load it — workspace wedged                     | exit 1 before any write, ledger untouched                                   |
| N4  | Checkpoint deleted + ledger shortened → `-- recover`                | **exit 0**, rebuilt a checkpoint with high-water **23→22**; next mint reused `-0023`                                              | exit 1, no checkpoint invented, ledger untouched, `-0023` unallocatable     |
| N5  | Partial override: ledger + checkpoint only                          | **exit 0**, scratch history combined with the **canonical** sidecar, absorbing a canonical live id into scratch history           | exit 1 `Partial anchor path override`, defaults untouched                   |
| N6  | Partial override: sidecar only                                      | **exit 0**, a disposable probe wrote a scratch id into the **CANONICAL ledger and checkpoint**                                    | exit 1, canonical files byte-identical                                      |
| N7  | Missing override target                                             | error (already closed)                                                                                                            | folded into all-or-none                                                     |

## What changed

### 1. One guard no write path can route around

`assertMonotonicAdvance` runs inside `persistHistory`, which is the single
function every mutating command uses to replace the ledger and checkpoint. It
refuses when the write would drop an id the ledger already recorded, shrink the
attested count, or lower any per-symbol high-water mark.

This is deliberately a last-line structural guard rather than a property each
command is trusted to maintain. The controlling blocker was exactly a command
that _intended_ to synchronise and in fact re-based trust downward — so
intention is not the thing being relied on.

### 2. `-- ledger` may absorb, never re-base

`-- ledger` is a synchronisation step, not a repair or a trust bootstrap. It now:

- loads sidecar, ledger and checkpoint and validates them **as one
  authoritative state** before writing anything;
- treats `unreserved-live-id` — an id alive in the sidecar that history has not
  yet absorbed — as **the only finding it may resolve**, because resolving it
  only ever adds. Every other finding is a refusal with zero writes;
- advances the checkpoint over the union of trusted history and live ids, never
  over the input it was supposed to be checking;
- still never writes the sidecar, so it stays safe to run while another writer
  owns that file;
- writes nothing at all when there is nothing new to absorb.

**The post-merge workflow is preserved.** A branch merge that introduces genuinely
new live anchors is still absorbed deliberately: `recapSentence-0090` added to
the sidecar is absorbed, ledger 419→420, checkpoint count 419→420 and
`recapSentence` high-water advanced to 90, sidecar byte-identical, and the next
mint is unblocked.

### 3. Live identities are validated before absorption

`loadAnchorFile` now validates the sidecar with **the same canonical id grammar
the allocator mints against** — not a permissive ledger-only reader. Rejected
before any ledger or checkpoint mutation: a malformed, non-string or empty
anchor id; a symbol that disagrees with its own id; a negative or non-integer
occurrence; a missing text; a malformed `textRevision`; one id bound to two live
sites; two ids claiming one `(path, symbol, text, occurrence)` coordinate.

Diagnostics name the conflicting bindings in full. Nothing is silently
renumbered, last-write-wins, or has its review marks transferred.

**Legitimate repeated literals are untouched.** The duplicate rule is about a
repeated anchor _id_ or a repeated coordinate, never about repeated text. Sites
in one symbol that share an exact literal are distinct sites separated by
`occurrence`, and the committed corpus contains them; a clean run over it is
part of the regression set.

### 4. Recovery moves only in a provably monotonic direction

| State                                    | Behaviour                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Checkpoint missing                       | **Refuses.** A ledger with nothing attesting it is not evidence of itself                                              |
| Ledger missing, checkpoint intact        | Conservative superset rebuild — every index up to each recorded mark. Some numbers burned unused; none can be recycled |
| Both present, ledger grew, no regression | Re-derives the checkpoint. The interrupted-between-writes case                                                         |
| Both present, shrank or regressed        | Refuses                                                                                                                |
| Both missing                             | Refuses                                                                                                                |

The removed route is the one 128A2 broke. Re-deriving a checkpoint from an
unattested ledger has **no safe automatic repair**, so it fails closed with a
documented manual remedy: both files are committed to version control, and
restoring the checkpoint is a one-line change with a reviewable diff.
Availability is subordinate to identity safety.

The 128R1 reservation-before-sidecar ordering is untouched, and its interruption
probes still pass.

### 5. Path overrides are all-or-none

The three `PROSE_ANCHOR_*` variables address one coupled authoritative set.
Either none is set and every path is the repository's own, or **all three** are
set and every path is the caller's. Anything in between fails before a single
read or write, naming exactly which variable is missing. Also refused: an
override aimed back at a repository file, and two overrides naming the same
file.

A missing overridden sidecar is refused rather than read as "no live anchors",
whenever the project has any history.

Override relocates files and grants **no** validation, bootstrap or recovery
exemption. When active the CLI prints the whole coupled set — sidecar, ledger
and checkpoint — rather than whichever path happens to differ, because the
failure being guarded is a caller believing they are on scratch data for one
file and canonical data for another.

## Threat boundary, restated

Unchanged from 128R1 and still honest: loss, truncation, corruption or lagging
of _either_ history file is detected. Simultaneous replacement of _both_ with a
mutually consistent forgery is not, and cannot be — but it is a visible,
reviewable edit to two committed files, never a silent consequence of a routine
command.

**One stated limitation, not a reproduced defect.** Two branches that each mint
independently allocate above their own floor and can choose the same number for
different sites. An ordinary git merge of the sidecar conflicts there, which is
useful refusal, and a hand-union is caught by the duplicate-live-id rule. What
is not detectable is a merge that keeps exactly one of two same-numbered
bindings, because the ledger records that an id was issued and not which site
holds it. Closing that would require per-id binding provenance, which is a
schema change outside this bounded repair.

## Files

- `scripts/prose-corpus/anchor-history.ts` — coupled path resolution
  (`resolveAnchorPaths`, `ANCHOR_PATHS`, `DEFAULT_ANCHOR_PATHS`),
  `assertMonotonicAdvance`
- `scripts/prose-corpus/anchors.ts` — strict live-sidecar validation,
  `anchorFileExists`, `ANCHOR_FILE` from the coupled set
- `scripts/prose-corpus/cli.ts` — monotonic `-- ledger`, hardened `-- recover`,
  guarded `persistHistory`, coupled path reporting, sidecar presence gate
- `scripts/prose-corpus/anchor-cli.test.ts` — 19 added production-CLI
  regressions (35 total in the file)
- `scripts/prose-corpus/anchor-history.test.ts` — 11 added unit regressions
  (32 total in the file)

Byte-identical to `7086196f`: `computed-anchors.json`,
`computed-anchor-ledger.json`, `computed-anchor-baseline.json`,
`scripts/agent-preflight.mjs`. No `src/`, player prose, art, source-domain data,
`corpus.test.ts` count pin, civic-prose contract, or dependency change. The CI
integrity gate added to `corpus.test.ts` in 128R1 is retained unchanged.

## Verification (personally executed)

- `npm run validate` — green, exit 0
- `npm run test` — 157/157 files, 2813/2813 tests
- `npm run corpus:prose -- check` — OK; authoritative trio unmutated by the run
- Full before/after attack matrix re-run at the production CLI on scratch copies
- 128R1 interruption ordering re-probed with an injected commit-step failure
- `npm run agent:preflight` — heading and disk line intact
- typecheck, lint, format, `git diff --check` — clean

No test, assertion, timeout or skip was weakened.
