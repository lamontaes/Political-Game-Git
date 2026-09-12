# RECOVERY25 BRAND — owner-review candidates

## Scope

Produce two original, restrained `Our Civic Duty` logo/app-icon candidates from
the accepted #211 title-readability head. Deliver editable SVG sources, raster
exports, and isolated title/desktop-context mockups. Preserve the #211 local
scrim, contrast, focus, and typography work.

## Delivered

1. Option 1, Civic Roundtable: editable dark/light wordmarks, monochrome mark,
   app-icon SVG, transparent wordmark PNGs, 1024–16 px icon ladder, and `.icns`.
2. Option 2, Open Threshold: the same complete source/export set.
3. Two 1440×900 current-title mockups using the accepted community-meeting art
   and #211's localized scrim/backed-control treatment.
4. Two 1440×900 desktop sheets covering desktop icon, About, compact menu, and
   128/64/32/16 px icon contexts.
5. Candidate labels, provenance, font/palette notes, and explicit non-selection,
   non-publication, and non-identity-change declarations.
6. Reproducible local rendering and validation scripts.

No shipping title, `PlayerGame`, shared stylesheet, app ID, product/storage
name, save profile, code-signing identity, or store asset was changed.

## Verification

- `node tools/brand-preview/recovery25/validate.mjs` — PASS.
- `npm run validate:art` — PASS.
- `npm run inventory:art` — PASS; 1,892 items. Existing people-candidate
  duplicate-hash warnings remain; the brand exports add none.
- `npm run qa:art` — PASS; contact sheet and QA report regenerated.
- Focused Playwright proof — 11/11 PASS for #211 front-door readability and
  pointer/keyboard behavior.
- `npm run lint` — PASS.
- `git diff --check` — PASS.
- `npm run typecheck` — incomplete because the shared installed dependency set
  cannot resolve the already-declared `pdfjs-dist/legacy/build/pdf.mjs` import in
  `src/source/domains/state-local-fiscal-authority/session-law.ts`. No brand file
  imports or changes that module.
- Human visual inspection completed for all four mockups and both 32 px exports.

## Acceptance state

Visual prototype delivery is complete. Both options remain equally labeled
owner-review candidates. Human brand selection and any later shipping identity
work remain explicitly unaccepted and out of scope.
