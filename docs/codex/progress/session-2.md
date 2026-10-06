# Session 2 progress

## Done

- BG-63 implementation on `codex/session2-bg63-removenamecards` at current main `e591ffc63`.
- Removed opening-scene nameplates and the separate executive name box. Opening official figures now open the normal person card by click or keyboard.
- Updated `tests/e2e/playtest65-u.spec.ts` to require no floating labels and open the dossier from an official figure.
- Prettier, ESLint, and `git diff --check` pass.

## Blocker

- Random-game Playwright proof is not yet captured. The repo storage guard refuses its 2 GiB reservation because this host has 24 GiB free against a 25 GiB reserve (0 GiB usable; 2.6 GiB more is required).
- `npm run typecheck` reaches project checks but reports two unrelated existing omissions of `personalLifeDepiction` in `src/simulation/press/press-premise.test.ts`.
- Vitest startup also fails when Vite's source identity plugin spawns `git` (`spawnSync git EPERM`).

## Next

- Retry the random-game proof after storage headroom is available:
  `OCD_STORAGE_STATE_DIR=/tmp/ocd-dev npx playwright test tests/e2e/playtest65-u.spec.ts --grep 'PLAYTEST65 creator, opening, map and movable Calendar preserve the life'`
- Rebase before READY if main advances; then update the PR progress section and board #2424.
