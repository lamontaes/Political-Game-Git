# Real Modular Character Integration

## Status

Completed — implemented and validated on
`claude/real-modular-character-integration` for independent PR review. Human
visual and play review remains required on the open unmerged PR.

## Baseline and scope

- Started from accepted `origin/main` at
  `514a6f979247f7162aeca26b26f1392535e32443` (PR #46 and #47 merged).
- Recorded D-055: deterministic real-master intake, manifest availability
  classes, the ordinary office seam, and the measured seat-contact repair.
- Copied 32 selected owner masters byte-for-byte to
  `art/references/masters/pg-modular/` (2 bodies, 5 heads, 8 hairstyles,
  4 tops, 3 bottoms, 3 footwear, 5 pack manifests). Originals on Desktop and
  in Downloads were not modified.
- Added `scripts/art-asset-factory/pg-modular-intake.ts` and
  `npm run intake:pg-modular`: keying, cropping, rig measurement, face-gap
  and neck-cut origins, fit ratios, Lanczos-3 resampling; 35 released
  derivatives in catalog generation 2.
- Added `availability` (`development-fixture` / `production-candidate`) on
  manifest records; fixtures step aside per kind where production candidates
  exist.
- Extended `composeOfficeVisuals`: authored recipe → modular render plan →
  placeholder; `OfficeScene` renders `ModularCharacter` for modular visuals.
- Repaired the office seat-contact defect: worktop occluder polygon ends at
  the primary chair (mask re-derived, hash updated); A01/B01 roots set to the
  measured seat lines via `scripts/art-asset-factory/seated-contact.ts`;
  anchors moved to the chairs' seat points; essential rectangle widened.
- Developer proof at `?view=character-proof` renders the real set (default)
  or the DEV set (`&set=dev`), with recipe cards, reuse, source lineage, the
  office path table, and before/after evidence.

## Real proof recipes (seed `pg-real-character-proof-2026-09-01-3`)

| Stage | Body           | Head          | Hair             | Top     | Bottom     | Footwear |
| ----- | -------------- | ------------- | ---------------- | ------- | ---------- | -------- |
| 1     | pg-male-lean   | pg-head-m-004 | —                | top-006 | bottom-005 | shoe-004 |
| 2     | pg-male-lean   | pg-head-m-005 | —                | top-011 | bottom-010 | shoe-001 |
| 3     | pg-female-lean | pg-head-f-01  | hair-f-black-004 | top-005 | bottom-005 | shoe-009 |
| 4     | pg-female-lean | pg-head-f-01  | hair-f-black-008 | top-006 | bottom-001 | shoe-004 |

## Verification

- Full Vitest: 40 files and 664 tests passed (8 intake/repair tests, the
  rewritten office-seam and real-set proof tests included).
- Playwright: 60 browser tests passed (real proof, office repair, DEV set,
  responsive matrix).
- `npm run validate` (format, lint, typecheck, tests, build, deterministic
  demo, art validation) passed; `inventory:art` 84 items; `qa:art`
  transparency confirmed on all 35 derivatives; `git diff --check` passed.
- Source masters on Desktop and in Downloads verified byte-identical to the
  copies; every derivative reproduces by hash from the intake script.

## Exclusions preserved

No generated art, no import of the wider asset bank, no population appearance
generation, no posing or animation, no head-angle generation, no first-session
change, no campaign/election change, no corpus consumption, no Slice F. The
seated real pose, complexion-matched bodies, masculine hair, eyewear, and
accessories remain asset requirements.
