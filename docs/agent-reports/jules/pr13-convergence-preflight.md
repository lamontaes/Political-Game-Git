# REPORT ONLY — DO NOT MERGE

PR LINK: https://github.com/lamontaes/Political-Game-Git/pull/13

## 1. exact current main

72416e493a686b1f44b5c03b9a41e0fe141b13b8

## 2. exact PR #13 head

2f0b4e4cfc9f4f7765c6e7ebd978521ba1139134

## 3. merge-base

1527354a60345bd6eddc0d7074a885ee1b7b010e

## 4. relevant newer merged PRs

- PR #16: generated-person-foundation (commits 7a21ccb, 949f699, db35682, f53bf1f, 72416e4)
- PR #15: d-lite-calendar-continuity (commits 8114266, f28b044)

## 5. changed-file overlap table

| File                                   | Main Status | PR #13 Status | Conflict Type        |
| -------------------------------------- | ----------- | ------------- | -------------------- |
| `ARCHITECTURE.md`                      | Modified    | Modified      | C. COMBINE CAREFULLY |
| `docs/ACCEPTANCE-TESTS.md`             | Modified    | Modified      | C. COMBINE CAREFULLY |
| `docs/ARCHITECTURE-INTEGRITY-AUDIT.md` | Modified    | Modified      | C. COMBINE CAREFULLY |
| `docs/agent/ACTIVE-HANDOFF.md`         | Modified    | Modified      | C. COMBINE CAREFULLY |
| `docs/systems/player-presentation.md`  | Modified    | Modified      | C. COMBINE CAREFULLY |
| `package.json`                         | Modified    | Modified      | C. COMBINE CAREFULLY |
| `src/player/PlayerOffice.tsx`          | Modified    | Modified      | C. COMBINE CAREFULLY |
| `src/presentation/run-a-fixture.ts`    | Modified    | Modified      | C. COMBINE CAREFULLY |
| `tests/e2e/run-d-lite.spec.ts`         | Modified    | Modified      | C. COMBINE CAREFULLY |

## 6. file-by-file A/B/C/D/E classification

### A. CURRENT MAIN WINS ENTIRELY

- None of the overlapping files are completely overwritten by main, they all have changes that need to be merged.

### B. PR #13 VISUAL WORK SHOULD BE PRESERVED

- `src/player/PlayerOffice.tsx`: PR #13 introduces `formatRunACompactDate` and `formatRunAExpandedDate` and changes to `openPlanningWorkspace`.
- `docs/ACCEPTANCE-TESTS.md`: PR #13 adds specific visual acceptance criteria (Stage 6.5 Post-D-Lite Visual Integration).

### C. COMBINE CAREFULLY

- `ARCHITECTURE.md`: Both add sections. PR #13 adds visual/art manifest architecture, while Main adds Calendar/World time architecture.
- `docs/ACCEPTANCE-TESTS.md`: Main adds calendar continuity tests; PR #13 adds visual integration tests.
- `docs/ARCHITECTURE-INTEGRITY-AUDIT.md`: Main adds to the audit, PR #13 also adds.
- `docs/agent/ACTIVE-HANDOFF.md`: Both branches update test run stats and handoff state.
- `docs/systems/player-presentation.md`: Both have system updates.
- `package.json`: Main adds `stress:persons`, PR #13 adds other changes.
- `src/player/PlayerOffice.tsx`: Main modifies calendar interaction, PR #13 adds date formatting and modifies planning workspace arguments.
- `src/presentation/run-a-fixture.ts`: Small tweaks in both.
- `tests/e2e/run-d-lite.spec.ts`: Main heavily modifies calendar continuity tests. PR #13 adds some visual expectations (e.g., checking compact location).

### D. PR #13 VERSION IS OBSOLETE

- None identified.

### E. NO REAL SEMANTIC CONFLICT

- None identified.

## 7. conflict hotspots

- `tests/e2e/run-d-lite.spec.ts`: Heavy modifications in Main for calendar continuity (PR #15) will conflict with minor visual checks added in PR #13.
- `src/player/PlayerOffice.tsx`: `openPlanningWorkspace` signature changes in PR #13 might conflict with how Main uses it for calendar continuity.

## 8. PR #16 semantics PR #13 must preserve

PR #13 MUST preserve the `generated-person-foundation` semantics introduced in PR #16:

- **Person identity ownership:** Persons are generated deterministically using a seed and the `names-v1` corpus.
- **Appearance seed ownership:** `PersonAppearance { seed: string, recipeVersion: string }` is derived deterministically from the person identity seed.
- **Scene anchor ownership:** Scene anchors own position, contact, depth, occlusion, and sceneTransform without owning the person's body or appearance identity.
- **Pose compatibility responsibilities:** (As defined by scene anchors).
- **Deterministic explicit seed behavior:** `src/presentation/run-a-fixture.ts` now uses deterministic explicit seeds.
- **Default Run A compatibility:** Must remain compatible with the deterministic generation profile.

## 9. PR #13 work worth salvaging

- All visual integration logic (scene transforms, occlusion, depth, responsive camera).
- Art manifest parsing and validation integration.
- Seated character compositing and desk affordances.
- Code-authored UI adjustments (compact/expanded date formats in PlayerOffice).
- The new art assets (`art/` directory additions).
- Visual integration E2E tests (`tests/e2e/visual-integration.spec.ts`).

## 10. obsolete PR #13 work

- Any code assuming non-deterministic person generation or hardcoded non-seed-based appearances that contradicts PR #16's `PersonAppearance` substrate.

## 11. art integration seam

Eventual replacements must enter through:

- **Manifest/provenance:** `art/manifest/asset_manifest.json` and `art/manifest/provenance.json`.
- **Environment master:** `art/families/council-staff-office/` directory.
- **Characters:** `art/generated/approved/` for `primary_desk_seated` and `left_guest_seated`.
- **Runtime recipe selection:** `src/presentation/visual-integration.ts` handles the resolution of released records.
- **Scene anchor/Occlusion/Responsive camera:** Handled by `src/presentation/scene-transform.ts`.

## 12. portability overlap, if any

NO REMOTE PORTABILITY PR AVAILABLE DURING AUDIT.

## 13. recommended reconciliation order

1. Rebase PR #13 visual changes onto the new Main (or create a new branch from Main).
2. Resolve `package.json`, `ARCHITECTURE.md`, and documentation conflicts by concatenating additions.
3. Integrate `src/player/PlayerOffice.tsx` by keeping Main's calendar logic and adding PR #13's date formatters and UI tweaks.
4. Carefully resolve `tests/e2e/run-d-lite.spec.ts` by applying PR #13's visual assertions to Main's updated calendar flow.
5. Audit `src/presentation/run-a-fixture.ts` to ensure it uses PR #16's deterministic seed logic while incorporating PR #13's visual assignments.
6. Verify art pipeline and scene anchors integrate cleanly with PR #16's `PersonAppearance` structure.

## 14. tests that must survive

- All 490+ Vitest suites from Main, especially `src/simulation/person-foundation.test.ts` and `person-stress-harness.test.ts`.
- `tests/e2e/player-seed-replay.spec.ts` and `developer-seed-replay.spec.ts` (from PR #16).
- Main's updated `tests/e2e/run-d-lite.spec.ts` testing calendar continuity (from PR #15).
- PR #13's `tests/e2e/visual-integration.spec.ts`.

## 15. browser/human acceptance evidence required

- Visual confirmation of the responsive office scene at various breakpoints (1200x720, 1440x900, 1920x1080, etc.).
- Confirmation that deterministic people generate correctly with consistent visual appearance assigned by the seed.
- Confirmation that calendar continuity (PR #15) still works visually with the new office rendering (PR #13).

## 16. likely failure modes

- **Seed mismatch:** PR #13 might override or conflict with PR #16's explicit seed initialization in fixtures, causing test failures in seed replay tests.
- **E2E Flakiness:** `tests/e2e/run-d-lite.spec.ts` might fail if the DOM structure changes introduced by PR #13 visual integration break the selectors used by PR #15's calendar continuity tests.
- **Manifest validation failures:** If the art pipeline is run without the newly approved assets.

## 17. exact Antigravity preflight recommendations

- Branch from `origin/main` (72416e4).
- Cherry-pick or manually reconstruct the visual integration commits from PR #13.
- Focus strictly on salvaging the `src/presentation/visual-integration.ts`, `scene-transform.ts`, and art manifest logic.
- Ensure the `PersonAppearance` state from PR #16 is seamlessly consumed by the visual integration layer to map seed to rendering without mutating simulation state.

## 18. confirmation no repository file except this report changed

Confirmed. No other repository files have been modified during this audit.
