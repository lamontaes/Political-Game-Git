# RECOVERY25 Prose

Status: completed

## Frozen inputs

- Initial integration base: `codex/morning23-a-landing` at `cb80eca6e6c53befba49adc5173a5c2315da4fb1`.
- Final integration base after the required pre-publish refresh: `codex/morning23-a-landing` at `27b55ea70aa923ae2ab9d8112d49c0e444139244`.
- School/content donors: PR #198 at `ae653046ea15dbe4f5d5e62f356856546fcaf641` and its current-scene successor PR #202 at `3882bcfd4b29de24117d9ffeb1323ec839a54a03`.
- Safe-content donor: PR #165 at `f6ed53fdeb061a9a17a298fc5510e1d816c87b94`.
- Current `main` observed through GitHub before work: `cc83c628707be429839c53c536181ceb65647735`.

## Delivered scope

1. Reconciled #198/#202's authored school incident, stable school peer, continuation, household naming, and scene/presence resolver onto the current A composition.
2. Preserved the current person card, wardrobe, appearance lineage, hometown, shell/menu, time, and scene work. With no released school plate, the playable school route intentionally uses the honest neutral fallback instead of apartment art.
3. Added an explicit given-name generation version at the new-life replay seam. Existing descriptors with no version retain legacy names and appearance/catalog continuity; freshly created lives opt into distinct household names. No save schema or existing save was rewritten.
4. Recovered #165's premise-gated ordinary-life situations. The colleague favor records a scheduled future shift through the existing Calendar and Places surfaces, and only a later venue activity records completion.
5. Omitted #165's audit-only 62-kernel reconciliation ledger and did not restore its superseded shift-management UI, report, or task.

## Playable proof

- Child route: Sydney Lane, age 10, encounters a broken projector cart in the school corridor with Kai Owen; the saved life reopens and reaches the later scene with the same named classmate and incident.
- Teen route: John McConnell, age 16, encounters the same incident family with Luna Kim; the saved life reopens and reaches the year-later branch with the same named classmate and incident.
- The child option was activated by pointer and the teen option by keyboard. The proof also covers distinct cast, no-school-peer omission, solo-home presence, shared-home presence, and save/reopen continuity.
- Rendered evidence is under `docs/agent/evidence/recovery25-prose/`.

## Verification completed

- Focused school/content, identity/replay, scene-context, corpus, save/reload, and appearance checks: green.
- Browser proof: 2 routes passed with screenshots; the final no-capture rerun also passed.
- Full bounded test run: 320 files passed with eight initially isolated environment/worker failures. The six loopback-bound tests passed when rerun with localhost permission, the visual timeout passed alone, and the appearance mismatch was fixed by versioning and passed in the final focused run.
- `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build`, release/source checks, deterministic demo, municipal generation check, and education check: green.
- Required asset checks: `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`: green.

## LEARN

- A correction to deterministic name generation needs an explicit replay version: absence must continue to mean the legacy algorithm, while new creation can deliberately select the corrected one.
- Visual proof artifacts should be captured outside source-controlled evidence paths until the final accepted run, so test cleanup cannot erase the handoff evidence.
- Prose continuation proof should assert the concrete incident and person text after save/reopen, not only the continuation template identifier.

## Handoff

The integration artifact is a single frozen branch and commit based on the A composition. Its PR records the donor heads, exact checks, remaining visual fallback, and the narrow root adapter (`resolvePlaySceneContext`) that A must retain. The branch does not edit or merge A's worktree.
