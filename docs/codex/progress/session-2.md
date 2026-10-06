# Session 2 progress

## Done

- BG-63 implementation on `codex/session2-bg63-removenamecards`, based on main `e591ffc63`; implementation now also removes the generic `PlacePeopleLayer` nameplate branch so other scenes cannot opt into floating labels.
- Removed opening-scene nameplates and the separate executive name box. Opening official figures now open the normal person card by click or keyboard.
- Updated `tests/e2e/playtest65-u.spec.ts` to require no floating labels and open the dossier from an official figure.
- Prettier, ESLint, and `git diff --check` pass.
- `ScenePersonSelection.test.tsx` — 7 passed using a temporary Vitest config that omits only the build-identity plugin; includes a regression that `PlacePeopleLayer` has no nameplate renderer.
- Session 11 coordination update posted to board #2424 comment 6016069044 with the exact changed component scope and the portrait hunks left to Session 11.

## Blocker

- Random-game Playwright proof is not yet captured. The repo storage guard refuses its 2 GiB reservation because this host has 24 GiB free against a 25 GiB reserve (0 GiB usable; 2.6 GiB more is required).
- `npm run typecheck` reports two unrelated existing omissions of `personalLifeDepiction` in `src/simulation/press/press-premise.test.ts` (lines 35 and 125).
- Vitest startup also fails when Vite's source identity plugin spawns `git` (`spawnSync git EPERM`).

## Next

- Retry the random-game proof after storage headroom is available:
  `OCD_STORAGE_STATE_DIR=/tmp/ocd-dev npx playwright test tests/e2e/playtest65-u.spec.ts --grep 'PLAYTEST65 creator, opening, map and movable Calendar preserve the life'`
- Rebase before READY if main advances; then update the PR progress section and board #2424.
- Push the `PlacePeopleLayer` extension to #2469 when remote access is available; keep the PR draft until random-game runtime proof is captured and full typecheck is green.
