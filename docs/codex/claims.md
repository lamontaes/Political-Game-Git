# File claims

| Team               | Files                                                                                                                                                                                                       | Claimed at                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team 4 cloud speed | `docs/codex/handbacks/team-4-cloud-speed.md`; ignored `test-results/speed/profile-month.ts`, `test-results/speed/cloud-*`, `test-results/speed/current-main-month*`                                         | Cloud transfer checkpoint; source helpers remain limited to the four released helpers and state intake. A measured fix will name its exact source/test paths before editing. |
| Team 4 cloud speed | `src/simulation/character-history.ts`: existing published lazy-copy context-person hunk only; `src/simulation/character-history-context-people.test.ts`; `docs/release/changes/context-people-lazy-copy.md` | Same-machine measurement of exact PR 1151 delta `040c538b21bb92b162f25a8733087647636db550`, absent from current main. No other character-history hunk released.              |

## Team 5 ordered playtest item 1

Owner/CTO 12:08 assignment: remove menu short-walk/home offers, preserve real
activity journeys and conversation content. Exact claims: `src/presentation/player-places.ts`
walk projection/helpers/imports; `src/presentation/player-places.test.ts` retired
walk-menu assertions; `src/player/opening-life/LifeScenePanel.tsx` walk-button
block/imports only; `tests/e2e/ui9-owner-corrections.spec.ts` retired walk-offer
case only; `docs/release/changes/remove-menu-short-walks.md`; Team 5 handback.
No PlayerGame, life-scene-flow writer, neighborhood conversations or Claude
scene-people rendering claim. Item 5 dossier regression remains on its preserved
branch until the ordered items preceding it are complete or blocked.
