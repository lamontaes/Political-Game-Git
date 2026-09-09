# Frozen adapter coordination

Recipient: `/private/tmp/pg-ui-core-release-transfer`, `codex/ui-core-release-transfer`; retained production source 455b87b, merged main 1eb0b0d. UI owns App/PlayerGame/shared shell/root navigation and creator transition. Owners retain their feature-local components and canonical writers.

Preferred component props: `world`, `playerPersonId` (or existing `personId`), `onWorldChange(nextWorld)`. Entity links must carry canonical IDs. Please supply exact frozen SHA, dependencies, file list and a proposed root integration patch; UI reviews and applies root edits here. No new generic registration engine is requested.

- OPENING: received `OpeningLifePanel`, `OpeningLifeFlow`, controller and proposed patch path. Reconcile with recovered Claude opening source through existing OPENING owner.
- PEOPLE: existing deterministic person/portrait resolver; supported released assets only. Needs same selected person across scene, quick/full dossier and Talk; no new identity or candidate promotion.
- ENV: current canonical place/activity -> scene adapter, explicit availability/release status. Scene switching cannot substitute for travel.
- MUNI: feature-local public-work panel, immutable World and canonical commands; enter via Work alongside existing legislation.
- DEV/JUD/EXEC/LIFE: frozen-adapter requests successfully posted on PRs #138–141. Preserve EXEC's actual LIFE-PATHS staff/time dependency.

Native outgoing task-message tools are unavailable in this recipient. This file and PR comment threads are fallback handoff surfaces. No heavy validation running yet.
