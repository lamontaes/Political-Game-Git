# 128R3 — binding-provenance anchor history, fail-closed bootstrap and recovery

Against **128A3**, which independently rejected 128R2 despite PASS CI and a
clean landing. Its reproduced failures are treated as controlling.

- Repair baseline (PR #128 head at packet creation): `71f3807bada5b4eed1cbb37d4ba18ca218cfb287`
- `origin/main` at packet creation: `89b2f7649f4db6225f8b16fdc1d2e762013ad62f`
- Branch: `claude/pork-01-cargo-pr-aqmikj` — same PR, no rebase, no force-push, no merge to main.

Every failure below was reproduced through the **production CLI against
disposable authority bundles at the exact repair baseline** before any code
changed. Nothing was repaired on the strength of a report.

---

## The non-negotiable contract this round adds

An issued prose anchor is not merely a number. Its historical identity is the
issued id **and** enough immutable binding provenance to distinguish the site it
was first issued for. **Retirement removes a live binding; it never erases the
issuance provenance.**

---

## Reproduced blockers, before and after

| #   | Blocker                                                                                                                                                                                          | Before (`71f3807`)                                                                                                                                                                                                                                                                                        | After                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **Established-lineage bootstrap bypass.** Mint `RETURN_SUMMARY-0023`, retire it, delete both history files, run `-- bootstrap`                                                                   | **exit 0.** Seeded a new lineage from live bindings: count **420 → 394**, `RETURN_SUMMARY` high-water **23 → 22**, `-0023` gone from history. An unrelated later mint was then **handed `RETURN_SUMMARY-0023`**                                                                                           | exit 1, names the established lineage and the restoration remedy; neither history file created, sidecar untouched, mint still refuses                                                                                                       |
| B   | **Recovery membership loss disguised as growth.** From attested history containing retired `-0023`, remove that issued member and add `-0031/-0032/-0033`, run `-- recover`                      | **exit 0.** Count 420 → 422 and every per-symbol maximum rose, so the loss read as growth. Blessed a set that is **not an issuance superset**, printing _"Every id the old checkpoint attested is still issued"_ while `-0023` was gone. A later `check` passed                                           | exit 1 `membership loss wearing growth as a disguise`, names `-0023`, **zero authority writes**; `-- ledger`, `-- anchors` and `-- check` refuse in the same state                                                                          |
| C   | **Cross-branch same-id / different-site loss.** Same trusted base; branch A issues `-0023` to site A and retires it; branch B independently issues `-0023` to site B; real three-way composition | **Merged with NO conflict.** Ledger additions were byte-identical and the checkpoints were identical, so only the sidecar merged — automatically. On the composed tree `-0023` was live at **site B**, `-- anchors` was a clean **0 minted, 0 reworded, 0 retired** no-op, and site A's issuance was gone | `git merge` **conflicts in both the ledger and the checkpoint**; the tree cannot become valid automatically. A hand resolution keeping both claims is refused naming both sites; one keeping mismatched files is refused `history-mismatch` |
| D   | **Symlink / canonical-path override isolation.** All three overrides as symlinks to the canonical trio, and a scratch path whose parent is a link to `scripts/prose-corpus`                      | **exit 0 for both.** The run **read canonical authority** through lexical aliases while printing _"this run does not read the repository's own files"_                                                                                                                                                    | exit 1 before any read or write, naming the alias and its target; canonical trio byte-identical                                                                                                                                             |

C's `check` exit 1 at the baseline was the unrelated "regenerate committed
artifacts" gate, not an anchor finding — the anchor-history gate passed. That is
why the mint no-op is the evidence quoted.

---

## Schema / representation change

`128A3` demonstrated that ID-only membership is insufficient, so the unmerged
PR128 history schema is evolved. **Ledger schema 1 → 2, checkpoint schema 1 → 2.**
No network service, database, distributed allocator, random-UUID scheme, or new
runtime dependency. Nothing outside the two history files is read.

**Ledger** — one record per issued id, and one record per line:

```json
{ "id": "RETURN_SUMMARY-0023", "site": "9e1c04b7ad3f", "text": "7f3cce3f0afa" }
{ "id": "steadyState-0001", "unknown": ["site", "text"] }
```

- `site` — digest of the site **coordinate** (source path, symbol, occurrence).
  Invariant for the life of a binding: rewording keeps the coordinate, and a site
  that moves file or symbol is retired and re-minted. This is what a **live**
  binding is checked against, which is why it deliberately excludes the text.
- `text` — digest of the literal as first recorded. Two branches adding
  _different_ prose at the same coordinate share a `site` and differ here, so
  this is the half that separates them.
- `unknown` — parts no retained evidence covers, **named rather than defaulted**.
  A record must account for both parts or be rejected; "the field was missing so
  treat it as empty" is the exact shape of the defect this lineage began with.

**One record per line is load-bearing, not cosmetic.** Under the id-only schema
two branches issuing one id wrote byte-identical additions and Git composed them
silently. A record on its own line means they write differing text at the same
position, which Git reports as a conflict. `.prettierignore` carries the file
with that reason recorded, so a reflow cannot quietly restore the old behaviour.

**Checkpoint** gains `issuedIndexes` — the exact indexes issued per symbol, as
compact ascending ranges (`"1-22,25"`), and its `digest` now covers the recorded
bindings as well as the ids. A count and a per-symbol maximum both _rose_ in
blocker B while an issued id in the middle was dropped; only per-id membership
can see that.

### Migration

`npm run corpus:prose -- migrate` — explicit, deterministic, one-way, and
validated. It refuses any inherited pair that does not already agree with itself,
so migration can never be the step that launders a truncation into a lineage.
Normal commands refuse a schema-1 file and name the migration rather than
silently upgrading it underneath a mint.

Run on this branch: **419 ids ever issued, unchanged.** 394 live ids carry a
recovered site binding — genuine, not inferred, because a live coordinate is
invariant. The 25 ids this lineage **retired before provenance was kept** are
recorded `unknown`; their numbers stay burned forever and what is gone is
recorded as gone rather than guessed. `computed-anchors.json` is **byte-identical**.

---

## The rules, exactly

**Bootstrap.** Fresh-lineage bootstrap now requires _positive_ evidence of
freshness: no ledger, no checkpoint, **and no live binding**. Two independent
changes, either of which closes A:

1. the live sidecar is positive evidence of a lineage, and any live binding
   refuses — absence of the two history files is never proof of freshness,
   because the retired ids are exactly the ones the sidecar does not contain;
2. bootstrap no longer seeds **anything** from live ids. It establishes an
   _empty_ lineage, so even reached in error it cannot free a number or lower a
   mark.

An established project with missing history **fails closed** with the
restoration remedy named. A warning is no longer any part of the guard.

**Recovery.** A state is repaired only where its historical issuance set is
provably monotonic from retained evidence. Count growth and nondecreasing
high-water marks are necessary and **never sufficient**: the superset is proved
against the checkpoint's exact membership, id by id, and the success message only
claims what was actually checked. A set that drops a prior issued binding and
adds later ids **refuses with zero authority writes**.

**Structural last line.** `assertMonotonicAdvance`, which every mutating command
routes through, additionally refuses any write that drops an id the checkpoint
attests, **rewrites an already-recorded binding**, or offers one id for two sites
at once. A recorded issuance is immutable.

**Path overrides.** Every coupled path is canonicalised (`realpath`, and for a
target that does not exist yet, its directory plus the file name) before any
decision is made about it. Aliases of canonical files are refused naming the
alias and its target; two overrides that canonicalise to one file are refused.
The all-or-none rule and default-file immutability are unchanged, and a scratch
bundle that merely _lives_ under a symlinked directory still works.

---

## Preserved 128R2 behaviour

Re-run, not assumed: N1/N1b shortened-ledger refusal; duplicate and invalid
live-ID rejection; missing-checkpoint refusal; conservative missing-ledger
recovery from checkpoint evidence; the genuine forward absorption workflow;
128R1's reservation-before-sidecar ordering; no-op, reword, context-revision and
repeated-literal identity behaviour; the `corpus.test.ts` CI-visible integrity
gate. `scripts/agent-preflight.mjs` is byte-identical to `b13ba7c8`.

`requireSidecar` now refuses a missing sidecar only when history has issued
something. An **empty** lineage with no sidecar is coherent rather than lost —
that is precisely what the repaired bootstrap leaves behind, and the first mint
writes the sidecar.

No `src/`, player prose, World, save, runtime, UI, art or source-domain change.
No civic-prose contract change. No dependency change. `computed-anchors.json` was
never hand-edited and nothing was minted around a failure.

---

## Files

- `scripts/prose-corpus/anchor-history.ts` — schema 2, `AnchorIssuance`,
  `siteDigest`, `issuedIndexes` codec, `attestedIds`, canonicalised path
  resolution, v1 loaders for migration, membership and binding rules
- `scripts/prose-corpus/anchors.ts` — `siteOf`, `liveBindingsOf`, mint carries
  issuance provenance forward untouched
- `scripts/prose-corpus/cli.ts` — fail-closed `bootstrap`, superset-proving
  `recover`, provenance-recording `ledger`, new `migrate`, empty-lineage sidecar gate
- `scripts/prose-corpus/anchor-crossbranch.test.ts` — **new.** Real Git clone,
  real production CLI on canonical default paths, actual three-way composition
- `scripts/prose-corpus/anchor-cli.test.ts` — +15 production-CLI regressions (50 in file)
- `scripts/prose-corpus/anchor-history.test.ts` — +unit regressions (36 in file)
- `scripts/prose-corpus/{anchor-ledger,identity,corpus}.test.ts` — call sites moved
  to explicit provenance
- `.prettierignore` — the ledger's line layout, with the reason recorded
- `computed-anchor-ledger.json`, `computed-anchor-baseline.json` — migrated

---

## Stated boundary

Unchanged and still stated: a simultaneous, mutually consistent rewrite of
**both** history files can declare any history. What is offered is that such a
change is a visible, reviewable edit to two committed files.

Narrowed within that boundary, and stated because it is real rather than because
it was reproduced: a **hand** resolution of a conflicted merge that keeps one
branch's history _pair_ and the other branch's sidecar, where both sites share a
`(path, symbol, occurrence)` coordinate and differ only in their prose, is not
distinguishable from an accepted rewording. The coordinate excludes the text so
that rewording keeps its identity, and separating those two cases needs a
rewording record in the accepted sidecar schema — which this repair does not
open. **Automatic** composition of that state still conflicts and still cannot
become a valid tree. This is strictly narrower than 128R2's stated limitation,
which was that ordinary composition lost bindings _silently_.

---

## Verification personally executed

- Full A3 blocker reproducer matrix, **before and after**, at the production CLI
  on disposable bundles
- `npm run validate` — **green, exit 0**
- `npm run test` — **158/158 files, 2842/2842 tests** (baseline `71f3807`: 157/2813)
- `npm run corpus:prose -- check` — OK, 1,869 templates
- `npm run corpus:prose -- migrate` on the repository's own history
- typecheck, lint, `prettier --check`, `git diff --check` — clean
- Disposable merge against freshly fetched `origin/main`
- No test, assertion, timeout or skip was weakened

**Acceptance state:** not merged, left draft. **READY FOR NARROW 128R3
INDEPENDENT RECHECK.** The repair writer may not approve itself.
