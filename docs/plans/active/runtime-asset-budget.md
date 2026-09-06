# Runtime Asset Budget Audit Plan

Status: implemented on a new draft-PR branch; awaiting independent exact-head
audit and owner acceptance. No pruning is authorized.

## Authority and baseline

- Task: Drive `S2 — RUN NOW — EMITTED-ASSET BUILD BUDGET AUDIT`, ID
  `1dTb46xobgy3QE884vv05PCzqBRKzj9lRvpg7x82JScs`.
- Primary audit: Drive `ASTRA_GLOBAL_VISUAL_SYSTEM_EFFICIENCY_AUDIT`, ID
  `1urdYdyluCPDhpcOiOMX-du_KLBK1uuBJ`.
- Accepted main fetched before editing:
  `982f613a9737e25e506dc430e4f6e121dd72b3ca`.
- Work is isolated from the supplied detached workspace and its pre-existing
  modified evidence images.
- Clean build command: `npm run build`.

The Astra benchmark reported roughly 400.31 MB of emitted files, 397.03 MB of
rasters, and 184 rasters / about 355.86 MB with no hash match in the union of
manifest final/tier paths. These are comparison evidence, never hardcoded
limits or expected constants.

## Bounded implementation

1. Enumerate and byte-count actual emitted build files deterministically.
2. SHA-256 every emitted raster and preserve one row per emitted path.
3. Index and verify manifest final/tier identity, then hash repository raster
   paths so QA/evidence and source/candidate/reference signals remain visible.
4. Assign one primary classification per row, retain independent evidence
   flags, compute exact rollups, and emit the stable no-manifest-match
   investigation pool.
5. Test duplicate paths, exact sums, classification boundaries, deterministic
   output, read-only behavior, network-language refusal, and absence of an
   arbitrary budget gate.
6. Run the report twice against one clean production build; compare byte-for-byte.
7. Run focused tests, formatting/lint/type checks, `git diff --check`, the three
   required art commands, and practical normal validation without changing
   shared validation/package surfaces.

## Explicit exclusions

This slice does not edit `package.json`, Vite configuration, build globs,
`src/App.tsx`, runtime player code, central validation, manifest/source art, or
files owned by PRs #85, #89, or #90. It does not delete, move, regenerate,
promote, or release any asset. Emitted size is not network demand or runtime
reachability, and no report result grants pruning authority.

## Acceptance

The finish condition is a new unmerged draft PR that reports the exact base,
branch, head, changed files, recomputed byte table, benchmark differences,
largest investigation groups, tests, CI, limitations, and independent-audit
state.

## Clean-build result at the accepted base

| Measure                                   | Files |       Bytes | Decimal MB |
| ----------------------------------------- | ----: | ----------: | ---------: |
| All emitted files                         |   268 | 400,305,735 |     400.31 |
| Emitted rasters                           |   256 | 397,027,042 |     397.03 |
| Manifest final/tier hash match            |    72 |  41,171,269 |      41.17 |
| No manifest final/tier hash match         |   184 | 355,855,773 |     355.86 |
| Player-runtime classification             |    10 |  32,861,313 |      32.86 |
| Developer evidence/QA classification      |    42 |  26,359,162 |      26.36 |
| Source/candidate/reference classification |   201 | 333,331,943 |     333.33 |
| Unmatched/unclassified classification     |     3 |   4,474,624 |       4.47 |

The benchmark and recomputation agree at the benchmark's stated two-decimal MB
precision, including the 184-file no-manifest-match pool. The investigation
pool itself comprises 166 source/candidate/reference files (330,226,764 bytes),
15 developer evidence/QA files (21,154,385 bytes), and 3 unclassified files
(4,474,624 bytes).

The largest individual pool members are preserved source sheets: `shoes.png`
(22,343,998 bytes), `supplies.png` (13,399,368), `female top.png` (12,485,785),
`average woman.png` (11,873,617), and `older woman.png` (11,868,933). These
measurements identify investigation priorities only; they do not authorize
movement or deletion.

## Verification receipt

- Focused audit tests: 1 file / 6 tests passed.
- Full `npm run validate`: 127 files / 2,150 tests passed; formatting, lint,
  typecheck, source validation/replay, clean production build, deterministic
  demo, and art validation passed. Existing source-acquisition gates remained
  informational and unchanged.
- `npm run inventory:art`: 322-item inventory up to date.
- `npm run qa:art`: generated QA remained byte-identical to tracked output.
- Two report runs from the same build were byte-identical at SHA-256
  `ceccbaf858c78615ad4fcb11dd13561f854e28344a59445efc128af507bde39a`.
- `git diff --check`: passed.

## LEARN pass

An emitted filename is insufficient asset identity because the bundler rewrites
names and may deduplicate bytes. Keep content-hash manifest evidence orthogonal
to the mutually exclusive reporting category, and preserve every emitted path
as its own accounting row. The implementation and duplicate-path tests encode
that rule without enlarging future task prompts.
