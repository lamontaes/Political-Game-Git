# Session 41 progress — LW-28

## Current claim

LW-28 library and parks saved service effects. Draft PR #2460 is open from `codex/session41-lw28`; frozen module commit `7f3544edfa39635b36f60aaa7dc1b04a36e118d8` contains the module path and export delivered to Session20.

## Done

- Added typed `public-library-service` and `parks-service-spending` module registrations.
- Reused the canonical funded-service resolver/writer and tied recipient exposure to the saved delivery event ID.
- Repaired the stale funded-service fixture determination without removing integrity assertions.
- Original service proof: 227/227 passed; `npm run typecheck`, changed-file Prettier, and changed-file ESLint passed.
- Session20's #2456 receiver foundation and pure static manifest are now on main through merge `55d6e214b4535f0d08f3cd86ab8c3e416b9b5470`.
- Added an outturn-specific parks resolver through outturn → commitment → appropriation → source measure. It uses the saved outturn event date and household residence cutoff and records the outturn/appropriation as cause.
- Adapted to the confirmed #2456 API first published in ancestor `a561c7cef5f63f28c2f3927151961c70cce0cd0a`: `receiveParksCapacityOutturn(world, context)` is typed as `PublicProgramCapacityOutturnReceiver`, and `publicProgramCapacityOutturnReceivers` exports the ordered `{ key, receive }` registration. The receiver validates saved lineage, derives canonical residents, uses `context.eventDate` and `sourceMeasureId`, and creates no person exposure when the law link is null.
- Applied CTO comment 6013767969: every law-linked parks outturn is resolved, including zero restoration; zero keeps its cause exposure but does not change capacity. Operational count zero is described as closed derived from count because no open-state field is recorded.
- Added a module-owned receiver factory so focused tests can compose this module's typed registrations explicitly through the canonical dispatcher while the generated manifest remains untouched. This is local composition evidence, not shared manifest admission.
- No park coordinates, neighborhood-density rank, explicit opening-state field, or recorded parks-employer jobs are available in the current data paths. No proximity, density, open-hours, or worker effect is fabricated.
- Delivered module path/export/frozen commit to Session20 on #2424 comment 6013440113.
- Exact #2456 API composition proof: parks and service-delivery suites passed 229/229, `npm run typecheck` passed including test-import checking, and changed-file ESLint/Prettier passed. The temporary API overlay was removed; the API source file is not part of #2460.
- After rebasing on main, regenerated the manifest temporarily with this module: focused parks/service tests passed 229/229. On the latest main, `npm run typecheck` reports two unrelated errors in `src/simulation/press/press-premise.test.ts` (lines 35 and 125), where fixtures lack the newly required `PlaySettings.personalLifeDepiction`. The LW-28 diff does not touch that file. An earlier run on the preceding main passed typecheck with this same temporary manifest composition.

## Blockers and next work

- #2456 merged into main as `55d6e214b4535f0d08f3cd86ab8c3e416b9b5470`; #2460 is rebased onto current main `e591ffc637d1f6db84d2ff920e8662ce123202ed`.
- The rebase drops the inherited registry/type/interface hunks; the diff against main contains only the nine LW-28 owned files. No Vite or presentation discovery remains in the simulation registry.
- Session20 is the sole owner of generated-manifest admission. Main's manifest is empty, so `npm run check:law-consequence-modules` reports manifest drift and default service-effect tests fail capability validation until Session20 admits this module. A proof-only generated manifest makes the focused suites pass; it remains uncommitted. Do not edit `public-program.ts` or the shared registry.
- The latest main typecheck also has the unrelated `press-premise.test.ts` errors noted above; test-file typecheck cannot be reported as passing until the mainline fixture owner repairs them.
- The one-module generated manifest is not Prettier-clean: the generator emits multiline arrays that Prettier collapses. Session20 owns the generator and should make generated output Prettier-clean without weakening its drift check.
- Session20 reports 239 focused tests across four suites and a nonempty raw Node registry import passing with the exact #2460 module locally composed. Its cycle-safe lazy-registration PR is not yet published; this is an owner-reported local-composition result, not shared-main runtime acceptance.
- The parks save/continue test now appends an outturn to the fixture's valid funded-program chain, serializes and reloads the resulting world, checks saved exposures, and confirms replay idempotence using the actual outturn record ID. Per CTO comment 6016167112, `assertLawExposureIntegrity` now runs immediately after `assertPublicProgramIntegrity`, which validates and admits public-program record IDs into the shared identity set. This preserves the original validator and avoids a duplicate-ID pre-add. The earlier Save/Continue failure was `A law exposure's source record is missing`; it now passes without substituting the outturn event ID.
- Current focused verification: Prettier and `git diff --check` pass. Test-file import checking reports 804 uncovered files and zero unresolved imports. Full `npm run typecheck` still stops only at the two unchanged `press-premise.test.ts` fixture errors above.
- Session20's cycle-safe registry repair is draft PR #2510 at corrected published head `99c41786a1994ae70f271b6b191484b65775afe7`; owner reports generator/type/focused tests passing, while local and hosted reruns remain pending. Main manifest admission, profile/source-replay acceptance, and runtime acceptance are still unproven.
- Parks Save/Continue has focused proof with the authorized source-ID validation ordering. Random-place new-game/save-continue and shared runtime proof remain pending actual generated-manifest admission and cycle-safe registry integration.
- Add park proximity, opening-state, and worker effects only when their owners provide the required recorded fields and data. Actual area exposure follows operational outturns by recorded residence; visit notices remain tied to actual visitor receipts.
- Random-place new-game/save-continue proof remains pending actual module admission into the generated manifest and runtime dispatch.
- Candidate is published on PR #2460; no merge or build.

## Next command

`npx vitest run --config /tmp/vitest-session41.config.mjs src/simulation/law-consequences/parks-service-area.test.ts`

Then check CTO response 6016142237, consume Session20's exact published lazy-registration head, verify shared admission, and complete raw Node/profile/source-replay plus random-place new-game/save-continue proof.
