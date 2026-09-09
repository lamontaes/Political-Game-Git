# FISCAL-PORTABILITY8

Date: 2026-09-09
Owner: FISCAL-PORTABILITY8 / PR #151 (`codex/fiscal-activate1`)
Adopted head: `794a29d371b3113e0c8df098cf8fc94443305836`
Status: repair published; draft PR remains unmerged and requires independent
acceptance from D

## Objective

Make the fiscal evidence gates produce the same verdict on every host, without
substituting an expected hash, weakening a rights gate, or changing raw source
text. The D1-D6 work in `fiscal-evidence6.md` is adopted as published and is not
redone; the acquired session law is preserved, not reacquired.

## The failure, reproduced before it was diagnosed

Hosted run 34382678260 / job 102571137386 (Node 22.13.0) at `794a29d3`:
3,584 passed, 11 failed, 2 skipped. Ten failures were one refusal repeated —

    Artifact "ak-municipal-sales-use-tax-statutes" extracts enacted text hashing
    to 548462116eb287ad9520491be3d9ad837fa79b3983019cd68aaa0cc8e5bd53ab, but its
    rights determination pins a683b51c3f2d6bb5d2851c607d94dbadbc19a45caab23b62fce
    c3883fd9b166e. The scope of the edict determination has moved.

— raised at `src/source/core/capability.ts:110` through
`openFiscalAuthorityArtifacts`, and reaching `source:replay` through
`scripts/source/replay.ts`. The eleventh expected an em dash and received a
control character.

The shared cause was treated as a hypothesis until it was reproduced:

1. **The bytes are not the problem.** All four committed artifacts hash exactly
   to their locked digests, so `openProductionArtifacts` never raised its
   "these are not the publisher's bytes" refusal. The raw sources are untouched
   and stay untouched.
2. **The extraction is the problem.** `ak-29.45.650-710.html` carries genuine
   Windows-1252 bytes — 5 x `0x97`, 2 x `0x93`, 2 x `0x94`, 1 x `0xa7` — and the
   artifact declares `text/html; charset=windows-1252`.
3. **The decode is host-dependent.** Re-running the pinned extraction under each
   candidate decoder reproduced the hosted digest exactly rather than
   approximately:

   | decode of the same bytes                | extracted length | sha256                                 |
   | --------------------------------------- | ---------------- | -------------------------------------- |
   | `TextDecoder("windows-1252")`, full ICU | 10,715           | `a683b51c…` (the pin)                  |
   | `latin1` / ISO-8859-1                   | 10,706           | `548462116e…` (**the hosted failure**) |

`TextDecoder` is only required to support UTF-8; the legacy single-byte
encodings depend on the ICU data the running Node was built with, and the
degradation is silent. Where that data is absent, `0x97` decodes to U+0097, a C1
control character, instead of an em dash — nine such characters inside the
scope, each one byte shorter in UTF-8, which is the 9-byte length difference and
the different digest. Nothing moved except the runtime.

## The repair

`src/source/core/parse/html-text.ts` now owns the mapping instead of borrowing
it from the host. The WHATWG index for `0x80`-`0x9F` — the only range where
Windows-1252 and ISO-8859-1 disagree — is repository data; every other byte is
its own code point; the five positions the encoding leaves unassigned decode to
their C1 code points as the standard requires, because dropping a byte the
publisher sent would be its own silent rewrite. UTF-8 still goes through
`TextDecoder`, which every Node build supports.

No expected hash was edited. No rights scope was widened. No raw byte changed.
The pinned digests are exactly the ones a correct Windows-1252 decode has always
produced; the repair makes every host produce them.

## Shared-surface declaration (for LAND / QUAL reconciliation)

`html-text.ts` is core, so the change was scoped and then proved harmless:

- Only the three fiscal statute artifacts declare a non-UTF-8 charset anywhere
  in `data/source/*/artifact-lock.json`. The **UTF-8 path is byte-identical**.
- QUAL's `state-legislatures` and `civil-service-labor` call
  `normalizeRetrievedText(bytes)` with no media type, so they take that
  unchanged UTF-8 path. `source:validate` reports state-legislatures 50 records
  / 0 errors, unchanged.
- `source:replay` is clean across all 16 domains: **every tracked source
  artifact regenerates byte-identically**, so no pinned digest in any domain
  moved.

## Reported, not changed: the same class in `delimited.ts`

`src/source/core/parse/delimited.ts:79` decodes through
`new TextDecoder(encoding)` where `encoding` may be `"latin1"` — which WHATWG
treats as an alias for Windows-1252, so it carries the identical host
dependence. `bea-regional` is its only caller. It is **latent, not active**: the
byte it exists for is `0xF1` (Doña Ana County), identical under both mappings,
and the product's single `0x80`-`0x9F` byte (a `0x92` in
`CAINC1__Footnotes.html`) is in a member the domain never parses. Changing
another domain's decode semantics is outside this role's scope and could move
evidence this role cannot adjudicate, so it is returned to LAND/D as a finding.

## Evidence controls retained and added

Positive: `source:validate` 12 fiscal records / 0 errors; `source:replay` clean;
`source:check-fiscal-disposition` 50 states / 750 groups / 2,650 claims.

Negative controls preserved: missing session-law parent, relinked parent digest,
altered effective-date text, absent excerpt, tampered disposition count,
wrong-level query, duplicate-conflict, canonical-seat refusal.

Negative controls added:

- **`refuses the enacted-text digest a mis-decoding host produced`** pins
  `548462116e…` as a _refusal_. The digest the broken host produced can never
  quietly become the expected value — the exact substitution this contract
  forbids now fails a test.
- **`extracts the pinned enacted text on a host with no legacy-encoding data`**
  stubs `TextDecoder` with an ICU-less implementation, asserts the simulation is
  faithful (the host decoder really does lose the em dash to U+0097), and then
  proves the substrate still extracts the pinned text and still opens
  production. Reverting the decoder makes this test fail with the hosted error
  shape, so it is a control that bites rather than a test that cannot fail.
- **`maps the Windows-1252 upper range without consulting the host`** locks all
  32 mappings and confirms no byte outside that range is altered.

The `decodes the declared Windows-1252 statute bytes` test was re-aimed from
`new TextDecoder("windows-1252")` to the repository's own decoder. Asserting
through the host's decoder tested the runner, not this substrate — which is why
it passed locally and failed hosted. Its substance is unchanged.

## D1-D6 verified at this head

- **D1** — the locked parent is the 36,898,000-byte ch. 74 SLA 1985 PDF,
  `30dfaeab…`, `cached-not-committed`; the committed 13,727-byte derived slice
  hashes to `4c6cb651…` on disk and its rights-scoped excerpt to `c811d628…`.
  Acquisition is preserved as published and was not repeated. Missing-parent,
  wrong-parent-digest and altered-date controls all still refuse.
- **D2** — `enactedDate` (nullable), `effectiveDate`, `lastAmendedDate`
  (nullable) and `observedDate` are four distinct fields; unacquired
  intervening amendment history returns `UNESTABLISHED` rather than a guess.
- **D3** — `openLegislativeFiscalProposalAnalysis` is a real named LEG Work
  consumer requiring the canonical elected-seat chain; it exposes only
  `propose-authority-change` and refuses to exercise a levy.
- **D4** — `source:check-fiscal-disposition` regenerates and compares the whole
  disposition and is part of `validate`; a changed tracked count fails.
- **D5** — closed properly by the repair above: the excerpt decodes to a real em
  dash with no U+FFFD, on any host.
- **D6** — real-corpus boundaries: `1985-12-31` NOT_YET_EFFECTIVE,
  `1986-01-01` IN_FORCE, `1990-06-01` UNESTABLISHED (amendment history not
  acquired), `2026-09-09` IN_FORCE, `2026-09-10` UNESTABLISHED (no projection),
  plus duplicate-CONFLICTING and wrong-level UNESTABLISHED.

## Boundaries kept

Secondary 92N research stays isolated behind `research-input/` and
`research-disposition.json`; no 92N claim reaches a production consumer. The
proposal-versus-current-power distinction is untouched and no revenue is
forecast. No UI root, no global application edit, no main merge, no deployment.
