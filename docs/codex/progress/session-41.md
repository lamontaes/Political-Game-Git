# Session 41 progress — LW-28

## Current claim

LW-28 library and parks saved service effects. Draft PR #2460 is open from `codex/session41-lw28`; frozen module commit `7f3544edfa39635b36f60aaa7dc1b04a36e118d8` contains the module path and export delivered to Session20.

## Done

- Added typed `public-library-service` and `parks-service-spending` module registrations.
- Reused the canonical funded-service resolver/writer and tied recipient exposure to the saved delivery event ID.
- Repaired the stale funded-service fixture determination without removing integrity assertions.
- Original service proof: 227/227 passed; `npm run typecheck`, changed-file Prettier, and changed-file ESLint passed.
- The earlier proof-only composition at frozen module head `885fd6e914cc4e0f632465224432213a12e81b45` confirmed a non-empty static manifest and identical 10-kind Node/Vitest discovery. Session20's current PR #2456 head is `b87abc88f03a842d31a5bfaa53aa5e08d1f942d9` (open/unmerged); it describes the published manifest as empty until Session41's source is admitted.
- Added an outturn-specific parks resolver through outturn → commitment → appropriation → source measure. It uses the saved outturn event date and household residence cutoff and records the outturn/appropriation as cause.
- Adapted to the confirmed #2456 API first published in ancestor `a561c7cef5f63f28c2f3927151961c70cce0cd0a`: `receiveParksCapacityOutturn(world, context)` is typed as `PublicProgramCapacityOutturnReceiver`, and `publicProgramCapacityOutturnReceivers` exports the ordered `{ key, receive }` registration. The receiver validates saved lineage, derives canonical residents, uses `context.eventDate` and `sourceMeasureId`, and creates no person exposure when the law link is null.
- Applied CTO comment 6013767969: every law-linked parks outturn is resolved, including zero restoration; zero keeps its cause exposure but does not change capacity. Operational count zero is described as closed derived from count because no open-state field is recorded.
- No park coordinates, neighborhood-density rank, explicit opening-state field, or recorded parks-employer jobs are available in the current data paths. No proximity, density, open-hours, or worker effect is fabricated.
- Delivered module path/export/frozen commit to Session20 on #2424 comment 6013440113.
- Exact #2456 API composition proof: parks and service-delivery suites passed 229/229, `npm run typecheck` passed including test-import checking, and changed-file ESLint/Prettier passed. The temporary API overlay was removed; the API source file is not part of #2460.

## Blockers and next work

- #2456 has not landed on main. Main remains `f88508186b78f526ecf89a420b5fb584171e039a`; #2460 remains based on main and is not stacked on Session20's branch.
- Session20 is the sole owner of the post-outturn registration writer after both `recordCapacityOutturn` call sites (CTO comment 6014071812), and owns generated-manifest admission. Do not edit `public-program.ts` or the shared registry.
- After #2456 lands on main, rebase #2460 onto main and remove the inherited Vite/presentation glob registry hunk. Then coordinate Session20's admission of this module and prove actual Node/profile/source-replay/runtime registration.
- Add park proximity, opening-state, and worker effects only when their owners provide the required recorded fields and data. Actual area exposure follows operational outturns by recorded residence; visit notices remain tied to actual visitor receipts.
- Random-place new-game/save-continue proof remains pending main landing, dispatch, and runtime manifest admission.
- Candidate is published on PR #2460; no merge or build.

## Next command

`git status --short --branch`

Then check for #2456 main landing, rebase #2460 only after that landing, remove the inherited glob registry hunk, coordinate module admission with Session20, and complete random-place new-game/save-continue proof after admission.