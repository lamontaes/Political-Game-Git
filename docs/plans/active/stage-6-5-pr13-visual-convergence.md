# Stage 6.5 — PR #13 Visual Convergence onto Current Main

Status: **Completed & Verified**

## Context

Reconciles and recovers the approved visual and presentation architecture from PR #13 (`2f0b4e4cfc9f4f7765c6e7ebd978521ba1139134`) onto current main (`5bc8b131ae22515e27ff4b63b3ecaf64e3bdcfa0`) in a new isolated worktree and branch (`antigravity/pr13-convergence-current-main`).

## Deliverables

1. **Shared Responsive Office Scene Camera & Transform**:
   - `src/presentation/scene-transform.ts`: virtual 1024x572 plate coordinate system, DPR-aware, 3:2 to 12:5 bounded camera aperture, safe and essential bounding rect checks.
   - `src/presentation/scene-transform.test.ts`: pure invariant tests across 13 desktop viewports and DPR 1, 1.25, 2.

2. **Released Runtime Art Assets & Manifests**:
   - Released runtime assets in `art/families/council-staff-office/` and `art/generated/approved/`.
   - Updated `art/manifest/asset_manifest.json`, `environment_families.json`, and `provenance.json`.
   - Repaired taxonomy to `council-staff-office` / `ordinary-council-staff-office` (VIS-001).
   - Pixel-based PNG transparency validation in `scripts/art-asset-factory/qa.ts` using `pureimage` (VIS-002).

3. **Presentation & Player Office Integration**:
   - `src/presentation/visual-integration.ts`: deterministic recipe resolution without `appearanceByAnchor` or character-identity mutation.
   - `src/player/OfficeScene.tsx`: DPR-aware `useOfficeSceneTransform`, single transformed `.scene-camera`, foreground occluder layer at depth 4, semantic character controls with exact hitboxes, physical desk documents (`working-document-entry`, `briefing-memo`).
   - `src/player/PermanentShell.tsx`: compact resting `.next-commitment-status`, non-truncated compact/expanded date formatting, retreated navigation when workspaces open (VIS-003).
   - `src/player/PinRail.tsx`: unmounts when empty, eliminating floating empty placeholder boxes (VIS-003).
   - `src/player/PlayerOffice.tsx`: removed `.scene-caption` residue and `locationDetail` placeholder (VIS-004).
   - `src/player/player.css`: restored desk paper visuals, responsive camera styling, occluders, and status bar.

4. **Automated & Visual Proof**:
   - `src/presentation/visual-integration.test.ts` (4 unit tests).
   - `tests/art-asset-factory.test.ts` (38 unit tests).
   - `tests/e2e/visual-integration.spec.ts` (14 Playwright visual integration tests).
   - Complete test suite passes: 34 test files, 577 vitest unit tests, 53 Playwright E2E tests.
