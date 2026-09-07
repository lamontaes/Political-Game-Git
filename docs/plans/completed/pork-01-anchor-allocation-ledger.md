# PORK-01 — Retired anchor-id safety, preflight disk visibility, dev heading

Executes the Drive packet `PORK-01 — RETIRED PROSE ANCHOR SAFETY + AGENT PREFLIGHT
HYGIENE` (2026-09-07). One bounded cargo change; no runtime, prose, UI, art, or
source-domain semantics were touched.

## Cargo A — retired computed-anchor ids are burned permanently

**Defect.** `nextAnchorId` reserved only the ids present in the current sidecar.
Retirement removes an anchor from that list, so the number returned to the pool
and a later, unrelated site in the same symbol could be handed it. During the P1
prose migration this actually happened — `threadMovementSentence-0002`/`-0003`
were caught by hand, and one further reuse was caught later. The consequence is
not cosmetic: an owner's recorded judgement on retired prose silently becomes
judgement on prose nobody reviewed.

**Contract now enforced.** An anchor id is issued at most once in the sidecar's
whole lineage. Retirement removes a binding from the live set and never returns
the number.

**Mechanism.** A separate append-only allocation ledger,
`scripts/prose-corpus/computed-anchor-ledger.json` — a sorted, de-duplicated list
of every id ever issued. Kept beside the sidecar rather than inside it, so the
accepted `computed-anchors.json` schema is unchanged and PR #126's accepted head
is untouched.

- `mintAnchors(literals, existing, everIssued)` reserves the union of the live
  sidecar and the ledger. The third argument defaults to empty, which is exactly
  the old behaviour; the CLI always passes the persisted ledger.
- The ledger is seeded from the live sidecar on every run, so an empty or lagging
  ledger is safe and a branch's newly minted ids are absorbed the moment its
  sidecar arrives. Reconstruction never depends on git history, branch order, or
  the order sites are encountered.
- A mint writes the ledger monotonically. No operation removes an issued id.
- `npm run corpus:prose -- ledger` absorbs live anchor ids into the ledger
  without minting and without writing the sidecar — the post-merge sync path,
  safe to run while another writer owns `computed-anchors.json`.

**Diagnostics.** `-- anchors` still reports minted/reworded/retired counts, and
now also the ledger size, how many ids this run newly reserved, how many are
retired-and-burned, and a line per minted id (stated as not previously in the
ledger) and per retired id (stated as burned). The exhaustion error names the
symbol and the id range.

**Regressions** (`scripts/prose-corpus/anchor-ledger.test.ts`, 11 cases): the
retire-then-add sequence receives a fresh id; the same sequence with no ledger
carried still reproduces the reuse, which is what pins the fix; an id issued but
absent from the live sidecar stays blocked; the ledger never shrinks across a
mint/retire cycle; unambiguous rewording keeps its id and issues nothing;
simultaneous ambiguous edits are still refused and write nothing; repeated exact
text and occurrence handling are unchanged; the ledger file round-trips sorted
and stable, treats a missing file as empty, and rejects an unknown schema.

## Cargo B — non-gating disk visibility in agent preflight

`scripts/agent-preflight.mjs` reports free and total space on the filesystem
holding the workspace, from `fs.statfsSync`. Informational only: no threshold,
no failure, no cleanup, no GUI or home-directory inspection. An unavailable
measurement prints `unavailable` and preflight continues.

## Cargo C — dev-only heading

The preflight heading reads `OUR CIVIC DUTY AGENT PREFLIGHT`. No broader
branding search-and-replace was performed.

## Ownership

No path owned by PR #126 was edited: `computed-anchors.json` (rewritten
byte-identically by the no-op mint, zero diff), `corpus.test.ts`,
`sources/computed.ts`, `docs/prose-inventory/**`, `src/presentation/life-narration*`,
and `tests/e2e/narrative-life.spec.ts` are all unchanged. No `src/`, art, or
source-domain file was touched, and no dependency was added.
