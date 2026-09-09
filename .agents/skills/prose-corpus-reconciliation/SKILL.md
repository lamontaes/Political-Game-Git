---
name: prose-corpus-reconciliation
description: >
  Reconcile the Political Game prose corpus, computed anchors, allocation ledger,
  and checkpoint at an exact Git head. Use after computed-prose edits, branch
  integration, anchor drift, or interrupted ledger writes; do not use to author
  prose, review prose style, or repair history by hand.
---

# Prose corpus and anchor-ledger reconciliation

Read `docs/systems/prose-corpus.md`. For history repair or allocation changes,
also inspect `scripts/prose-corpus/cli.ts`, `anchor-history.ts`, and the focused
anchor tests. These implementations are authoritative; do not create another
allocator or validator.

## Bounded workflow

1. Run `$project-operations` preflight and pin the exact base/head. Hash or diff
   the coupled authoritative set before any mutation:
   `computed-anchors.json`, `computed-anchor-ledger.json`, and
   `computed-anchor-baseline.json`.
2. Run `npm run corpus:prose -- check` first. It is the read-only drift/history
   gate. Do not pass `--help`: this CLI treats an unknown/default mode as a full
   corpus build.
3. Choose only the implemented operation that matches the evidence:
   - `diff`: compare the inventory with its committed baseline.
   - `anchors`: mint or rebind computed sites after their source text changed.
   - `ledger`: absorb genuinely new live IDs after a branch integration, only
     when the existing ledger/checkpoint pair is already sound.
   - `recover`: repair only a state the CLI proves monotonic and safe. Never use
     it as a general reset or trust bootstrap.
4. Use all three `PROSE_ANCHOR_*` overrides together for disposable attack tests.
   Never mix scratch and repository paths. Never hand-union, renumber, lower a
   high-water mark, delete a retired ID, or bless a disagreeing pair by timestamp.
5. Re-run `check` and the affected anchor/CLI tests. Confirm unrelated generated
   artifacts and the coupled set changed only as the selected operation specifies.

## Output

Report the exact Git head, command and exit status, trio before/after identity,
minted/rebound/retired/absorbed IDs, hard errors versus review warnings, focused
tests, and whether independent exact-head review remains pending.

## Stop condition

Stop with zero history writes on a mismatched pair, duplicate binding, invalid ID,
partial path override, missing attestation, ambiguous same-number branch collision,
or any case the production CLI refuses. Restore evidence from version control or
request owner direction; do not invent a recovery direction.
