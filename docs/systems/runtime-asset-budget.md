# Runtime Asset Budget Audit

The runtime asset budget audit is a deterministic, read-only explanation of
files already emitted by a production build. It classifies raster bytes; it does
not prune files, change a build glob, establish a size limit, or decide that an
asset is safe to delete.

Run a clean production build first, then invoke the tool directly because this
bounded slice deliberately adds no shared package script:

```bash
npm run build
node --import tsx scripts/art-asset-factory/runtime-asset-budget.ts --pretty > /tmp/runtime-asset-budget.json
```

`--root`, `--build`, `--manifest`, and `--largest` override the repository root,
build-output directory, manifest, and largest-file list length. Paths in the
JSON remain relative to the repository or build root.

## Canonical input containment

The audit fails closed on any input outside the repository root. After the
repository root, build root, and manifest are resolved to absolute real paths —
symlinks included — each must be contained by the repository root under a
`path.relative` segment test rather than a string prefix comparison, and the
manifest must additionally be a regular file. A relative escape, an absolute
external path, a `..` traversal, and a symlink that leaves the repository are
all rejected with a nonzero exit. A repository-contained alternate build
directory remains supported.

Containment is the trust boundary itself, not a label: because an external build
root or external manifest can never produce a report, a report that exists is
necessarily describing canonical repository inputs. The tool therefore carries
no spoofable "canonical" flag. Manifest `final_path` and raster-tier paths are
likewise resolved through symlinks before their containment, existence, and
SHA-256 checks, so a repository-relative link cannot relabel an external file as
a released production identity. The report contains no
timestamp, filesystem-order dependency, or host-specific absolute path, so the
same tree and build output serialize identically.

## Evidence and classification

The tool hashes every emitted raster and every repository raster under `art/`.
It also builds a hash index from every manifest `final_path` and raster tier and
verifies that each declared path exists with the declared SHA-256. A malformed
manifest, missing build/art directory, manifest hash drift, or a symlink in the
audited build is a structural/data error and fails the run.

Each emitted path remains a separate row even when multiple paths contain the
same bytes. This preserves honest package totals. Manifest matches and all
same-hash repository source paths remain on the row as evidence.

The primary classifications are mutually exclusive:

- `player-runtime`: a production, runtime-released manifest final/tier identity;
- `developer-evidence-qa`: a development-fixture manifest identity or a known
  fixture, proof, contact-sheet, or QA source path;
- `source-candidate-reference`: an unreleased manifest identity or a known
  source, candidate, reference, draft, rejected, or intake path;
- `unmatched-unclassified`: no authoritative manifest identity or recognized
  repository source-path classification was found.

Signal booleans remain independent of the primary class, so a duplicate hash
that appears in more than one repository role is reported honestly. Only the
primary classification rollups are summed, preventing double-counting.

## Interpretation boundaries

Emitted bytes are packaging bytes, not network bytes downloaded by a player.
Emission does not prove that player runtime can reach a file. Conversely, a
missing manifest hash match is only a pruning-investigation signal. It does not
authorize deletion, movement, source loss, or a build-glob change.

The `pruningInvestigationPool` is the stable path/hash list of emitted rasters
with no manifest final/tier hash match. It includes any path-classified developer
evidence, QA, source, candidate, or reference bytes alongside genuinely
unclassified bytes. `largestInvestigationGroups` rolls up that pool without
double-counting. A later explicitly authorized lifecycle task must decide their
disposition.

The report exposes totals a future budget gate could measure, but
`approvedLimitBytes` is `null` and `enforced` is `false`. Until an approved
project budget exists, size alone never makes this command fail.
