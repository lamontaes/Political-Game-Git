# Old engine removal

The old game's code that the new game never reaches is deleted: about 1,880 files, with the owner's go-ahead on Oct 12. About 1,600 old files stay until the new game stops importing them.

## Deleted (1,874 files)

- 1,860 unreachable files under `src`: simulation 630 of 1,944, presentation 768 of 1,014, player 333 (all), ui 31 (all), content 18, r1-review 10, cli 7, persistence 2, and the old app entry (`App.tsx`, `main.tsx`, `review.tsx`, `art-desk-entry.tsx`, `styles.css`).
- 14 old-only tests and scripts (`tests/e2e` old specs, asset and environment tests, `scripts/life-report.ts`, `scripts/playtest/observer-probe.ts`).

## Keep list: old files the new game still uses (about 1,600)

- `src/bench/scene.ts` uses the presentation appearance engine, backdrops and dress code.
- `src/rules/legislatures` and `src/rules/economy` use types and rules from `src/simulation`.
- `tests/golden-path/place.ts` and `tests/fixtures/*` use `src/simulation/life-places`.

Follow-up: move the few pieces those use into `src/core2` or `src/rules`, then rerun the script and delete the rest.

## Left for follow-up

- `src/maps/MapPlaceContext.tsx`, `src/maps/map-preview-entry.tsx` and `map-preview.html` import deleted presentation files (3 type errors). Delete them with the map preview.
- `src/authoring` (the art desk) was restored with `presentation/scene-consumers` and `component-masters`: `vite.config.ts` loads them, and every vitest run fails without them.
- Art tooling (`scripts/art-asset-factory`, `scripts/dev-lab/artbench*`, `scripts/appearance`) imports old code and was not touched; `vite.config.ts` loads `artbench-bridge`.
- Root `index.html`, `review.html` and the `vite.config.ts` inputs still name the deleted app entry. OPUS-PLAY must provide an app entry and build target for `/play`.
- `src/bench/changes.ts` has 3 type errors (`ModuleIndexValue`) that are not from this change.
- Not run: lint, golden-path suite, core2/bench/director tests, bench start at `/play`.

The full deleted-file list is in the commit (`git show --stat`).

Method: `node scripts/dead-code/reachable.mjs` walks imports from `src/bench`, `src/core2`, `src/director`, `src/release`, `src/rules` and the golden-path tests.

## Oct 12 refresh (main at d569a78)

- Merged `origin/opus-play` and `origin/main`; the one conflict (`life.test.ts`) took main's version.
- Restored `src/presentation/guide-terms.ts` (and its test): `src/bench/server.ts` now imports it.
- The reachability script now treats `vite.config.ts` as an entry and counts a test as live only when its own imports resolve. That removed 123 tests that exercised deleted code (119 in `src/presentation` and `src/simulation`, 4 in `education`, `fiscal-authority`, `maps` and `devtools`). Kept on purpose: the art desk in `src/authoring` and its scripts (`vite.config.ts` loads them).
- No import in `src/core2`, `src/bench`, `src/director`, `src/release`, `src/rules` or the golden-path suite points at a deleted file. `data/research/**` is untouched.

## Oct 12 evening refresh (main at 373ff58)

- Merged main (the `/play` screen, outcome web, history from 2000, traits, phrase banks). Conflicts in core2 data and tests took main's newer versions.
- Restored two tests of kept code: `src/simulation/traits/act-pulls.test.ts` (main changed it) and `src/presentation/component-masters.test.ts`. `src/simulation/people-promise.ts` comes back with it: the act-pulls test reads it as the producer of `people.promise-renegotiation`, which `data/content/decision-option-acts.json` still labels. The script had read `new URL(".", import.meta.url)` as a missing module; it now skips folder paths.
- The zero-dice allowlist drops 15 rows for deleted files; `docs/release/changes/old-engine-removal.md` declares no player-facing change.
- No file reachable from the new game imports a deleted file. 183 old scripts and tests outside `src` (art tooling, dev-lab, e2e fixtures, old nationwide tests) still import deleted files; none is reachable.
- 120 deleted tests test old files that stay but depend on deleted old fixtures (`opening-life`, `observer-world`, `trait-proof-support`, `time-command`); they go when those old files go.
