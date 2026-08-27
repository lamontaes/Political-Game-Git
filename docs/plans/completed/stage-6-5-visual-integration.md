# Stage 6.5 Post-D-Lite Visual Integration

## Status

Completed on `codex/stage-6-5-visual-integration`, based on accepted main
`a991116abc1e662b0ea810909e923423187e916e`.

## Scope

- Import the three owner-approved Packet 76 PNG sources after exact SHA-256
  verification.
- Deterministically remove the green extraction field from the two anonymous
  seated-character recipes and retain the source bytes for reproduction.
- Release the environment and derived characters through the existing Packet
  77 manifest/provenance gate.
- Classify the ordinary legislative/council room under the reusable
  `council-staff-office` environment family and verify required PNG
  transparency from decoded pixel alpha rather than header color type.
- Replace the office and character placeholders with a data-driven compositor
  while preserving all Run A–D-Lite semantics and controls.
- Apply only the banked compact-date, workspace-retreat, zero-pin, dead-strip,
  and safe-area presentation cleanup authorized by the packet.
- Prove deterministic selection, anchor/pose compatibility, portability,
  accessibility, responsive geometry, art integrity, and unchanged World data.

## Verification gate

Run focused Run A/B/C/D-Lite and visual/art tests, full Vitest and Playwright,
format, lint, typecheck, build, deterministic demo/replay, art validation,
inventory, QA, dependency audits, and `git diff --check`. Open one unmerged PR
to `main` and wait for exact-head CI.

## Exclusions

No simulation schema or semantics, Stage 7, Slice E, campaign/election work,
runtime generation, general character generator, animation, universal rig, or
full wardrobe system.

## Completed verification

- Run A/B/C/D-Lite focused suites: 16 / 35 / 37 / 26 passed.
- Visual/art focused suite: 42 passed.
- Full Vitest: 30 files and 471 tests passed.
- Full Playwright: 31 tests passed with the repository CI worker count.
- Format, lint, typecheck, build, deterministic demo, art validation,
  inventory, QA, and diff checks passed.
- Production dependency audit: zero vulnerabilities.
- Full dependency audit: one pre-existing high-severity `image-size`
  development-tool advisory with no available fix.
