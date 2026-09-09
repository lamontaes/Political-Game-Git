# Frozen adapter coordination

Recipient: `/private/tmp/pg-ui-core-release-transfer`, `codex/ui-core-release-transfer`; retained production source 455b87b, merged main 1eb0b0d. UI owns App/PlayerGame/shared shell/root navigation and creator transition. Owners retain their feature-local components and canonical writers.

Preferred component props: `world`, `playerPersonId` (or existing `personId`), `onWorldChange(nextWorld)`. Entity links must carry canonical IDs. Please supply exact frozen SHA, dependencies, file list and a proposed root integration patch; UI reviews and applies root edits here. No new generic registration engine is requested.

- OPENING: received `OpeningLifePanel`, `OpeningLifeFlow`, controller and proposed patch path. Reconcile with recovered Claude opening source through existing OPENING owner.
- PEOPLE: existing deterministic person/portrait resolver; supported released assets only. Needs same selected person across scene, quick/full dossier and Talk; no new identity or candidate promotion.
- ENV: current canonical place/activity -> scene adapter, explicit availability/release status. Scene switching cannot substitute for travel.
- MUNI: feature-local public-work panel, immutable World and canonical commands; enter via Work alongside existing legislation.
- DEV/JUD/EXEC/LIFE: frozen-adapter requests successfully posted on PRs #138–141. Preserve EXEC's actual LIFE-PATHS staff/time dependency.

Native outgoing task-message tools are unavailable in this recipient. This file and PR comment threads are fallback handoff surfaces. No heavy validation running yet.

## Current checkpoint

Supersedes the earlier no-tests-started status. ENV97fbcde is merged; receipt from544d78b is applied. Root now gates household narration/conversations in actual attendance aftermath and derives shell place from the completed activity. Normal proof env06 passes keyboard completion, community-room plate,1440/960 screenshots and save/reload. Evidence under `/private/tmp/ui-core-transfer-recovery/browser/ui-core-transfer-env-06`.

PEOPLE production-only patch fromd9d3afe applied and two portrait boundary tests pass. MUNI's proposed `MunicipalWorkspace({world,onWorldChange})` fits Work; awaiting frozen source. OPENING and recovered LEG exact heads still awaited. Full heavy validation queued after existing owners; no full-green claim. Single draft UI publication follows this checkpoint; root ownership remains here.

OLD-WORK-RECOVERY1 acknowledgment: UI-CORE owns the shared `useRasterTier` decode-error presentation and the player rendering boundary for `ComposedCharacterVisual.isPlaceholder`. PEOPLE owns the canonical character-plan contract; ENV owns raster admission/tier metadata. Both historical #92 findings are accepted as unresolved UI visual follow-ups, outside the creator/selected-person/pin fixes already proved. No repair or acceptance is claimed, and OLD-WORK should not edit these shared paths. They remain in the transfer's explicit defect ledger until addressed with the relevant existing visual owner.
