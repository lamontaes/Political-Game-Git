# VIMG-JPEG1 — JPEG intake measurement

Owning packet: Drive `1rvT1HtikfxU9n0B3qTf7zYo43V4VV05cSRffFPJ1_JY`.
Base: live main `1a91101ab4f5369aeec21c6e9f32c21114794c81`.
Workspace: `/private/tmp/pg-vimg-jpeg1`; branch `codex/vimg-jpeg1`.
Preflight: clean, local HEAD equals fetched origin/main. Original detached
workspace and other worktrees remain untouched.

1. Extend only the filesystem measurement seam with bounded JPEG structure
   validation; preserve the PNG branch, request schema, lineage and hash semantics.
2. Prove baseline/progressive JPEG, malformed/truncated rejection, PNG parity,
   and the existing asset-bank refusal of unassessed production promotion.
3. Replay the exact preserved requests (Drive raw JSON
   `1XXV83-HHH7DRWZagPraDqNCwx0mKYoPY`) against their canonical candidate bytes,
   using scratch requests and isolated before/after `--out` directories.
4. Run focused tests, formatting, lint, typecheck and required art commands;
   record SHA-256/mtime equality and non-tooling gates. Open draft PR, check
   exact-head CI, leave unmerged for independent tooling review.

No pixel edits, transcoding, generation, candidate promotion, runtime changes,
manifest/catalog changes, or build-packaging changes are authorized.

## Completion evidence — 2026-09-07

Implemented in the existing filesystem seam. PNG measurement (including its
historical extension-derived format and alpha behavior) is unchanged. JPEG
requires SOI plus a matching `.jpg`/`.jpeg` suffix, a supported 8-bit baseline or
progressive frame, bounded marker/table/scan structure, nonempty scan data and
EOI. Unsupported coding processes, deferred dimensions, conflicting extensions,
malformed segments and truncated streams fail closed with an explicit
`JPEG structure:` message under the existing `unreadable-dimensions` error code.
No request/schema/lineage evaluator changes or new dependencies.

This is container/dimension validation, not an entropy decoder or a guarantee
of visual quality. No pixels are decoded, normalized or rewritten. Progressive
and baseline 17×9 fixtures are original solid-color test fixtures made with
Pillow, embedded in the test; neither preserved source was used to make them.

### Exact preserved replays

Evidence authority: Drive `1MLIexbFgVhoSWv1C-sy0QnBfCdVKGwU8xrm-oeScTPE` and
its raw JSON bundle `1XXV83-HHH7DRWZagPraDqNCwx0mKYoPY`. The raw bundle was
retrieved with the Drive connector, and the two requests were replayed without
changing any declarations. Scratch symlinks resolve their original basenames
to the exact canonical repository files; no source copies or replacements.

Canonical directory:
`art/references/candidates/recent-drive-sweep/source-images/`.

| Source       | SHA-256 before AND after                                           | Bytes before AND after | mtime nanoseconds before AND after |
| ------------ | ------------------------------------------------------------------ | ---------------------- | ---------------------------------- |
| IMG_5205.JPG | `c2829c934d7f3aa78dd8a2ed07be75c23189dd7dc6a614176403691edc43439c` | 3068039                | 1788749432223892091                |
| IMG_5189.JPG | `a538616176e4340aa828fa56dbc61fe18b298552d7604e889233872bbb1179aa` | 3418160                | 1788749431929597506                |

Both hashes match the packet's #109 preserved-candidate evidence. Before:
CLI exit 1, reject, null dimensions, empty content hash, sole finding
`unreadable-dimensions`. After: CLI exit 0, 5504×3072, format `jpg`, original
content hash, findings `native-detail-unverified` and `rights-status-unknown`.

**The existing dimensional intake report calls this `production`; it is not
promotion or human acceptance.** The seeded asset bank remains `undecided`
with all judgments unassessed. Tests attempt promotion in memory and verify
`production-while-unassessed` refusal. Rights remain unknown, native detail
unverified, provenance unresolved, human acceptance absent and room geometry
unknown. IMG_5189 still requires the packet's style-weight/framed-building
adjudication. No asset manifest, production catalog or source art changed.

Scratch evidence: `/private/tmp/vimg-jpeg1-evidence/`. For each `IMG_5205` and
`IMG_5189`, `request.json`, `before/environment-intake-report.json`,
`after/environment-intake-report.json` and `after/asset-bank.json` are retained.
`before-source-state.json` and `after-source-state.json` compare equal. Replay:

```sh
npm run intake:environment -- /private/tmp/vimg-jpeg1-evidence/IMG_5205/request.json --out /private/tmp/vimg-jpeg1-evidence/IMG_5205/after
npm run intake:environment -- /private/tmp/vimg-jpeg1-evidence/IMG_5189/request.json --out /private/tmp/vimg-jpeg1-evidence/IMG_5189/after
```

### Validation and compatibility

- 32 tests pass across `environment-intake-jpeg`, `environment-authoring-pipeline`
  and `environment-intake-queue`: baseline/progressive, every truncated fixture
  prefix, malformed lengths/frame/scan/tables, misleading extension, PNG parity,
  exact candidates, repeatability, hash/mtime preservation and promotion refusal.
- Repository lint and typecheck pass. A separate strict TypeScript check of the
  changed intake/test entry points passes (the repository's standard typecheck
  does not include all art scripts/tests). Final touched-file lint/format pass.
- `validate:art`, `inventory:art`, `qa:art` pass; inventory is up to date at
  322 items and generated QA has no tracked changes.
- `git diff --check` passes. Browser tests are not needed locally for this
  Node-only tooling change; the existing exact-head CI workflow remains required.

Architecture integrity review: corrected the filesystem JPEG measurement seam;
confirmed PNG and pure authoring contracts compatible; no simulation, source,
persistence, presentation, player, manifest, production catalog or packaging
change. The task's current authority and historical stage rules agree on this
bounded tooling scope. No accepted semantics are reopened.

LEARN: encode format support with whole-stream truncation regressions and exact
source hash/mtime checks, rather than introducing a normalization workaround.
The focused suite is the durable mechanism.

Implementation complete; independent JPEG tooling acceptance pending. Draft PR
must remain unmerged. Published head and exact-head CI are recorded in the PR
and delivery message, avoiding a self-referential commit SHA in this file.
