# Session 41 progress — LW-28

## Current claim

LW-28 library and parks saved service effects. Draft PR #2460 is open from `codex/session41-lw28`; frozen module commit `7f3544edfa39635b36f60aaa7dc1b04a36e118d8` contains the module path and export delivered to Session20.

## Done

- Added typed `public-library-service` and `parks-service-spending` module registrations.
- Reused the canonical funded-service resolver/writer and tied recipient exposure to the saved delivery event ID.
- Repaired the stale funded-service fixture determination without removing integrity assertions.
- Changed service test: 227/227 passed. `npm run typecheck`, changed-file Prettier, and changed-file ESLint passed.
- Session20's proof-only composition on this module confirmed a non-empty static manifest and identical 10-kind Node/Vitest discovery. Published receiver PR #2456 is now at `402e188235992e466cebbacf90717bb29513f6a2` and remains open/unmerged; its published manifest is still empty. CTO comment 6013781644 allows proof-only composition and keeps Session20 as sole manifest writer.
- Added an outturn-specific parks resolver through outturn → commitment → appropriation → source measure. It uses the outturn event date and household residence cutoff and records the outturn/appropriation as cause.
- Applied CTO comment 6013767969: every law-linked parks outturn is resolved, including zero restoration; zero keeps its cause exposure but does not change capacity. Operational count zero is described as closed derived from count because no open-state field is recorded.
- No park coordinates, neighborhood-density rank, explicit opening-state field, or recorded parks-employer jobs are available in the current data paths. No proximity, density, open-hours, or worker effect is fabricated.
- Delivered module path/export/frozen commit to Session20 on #2424 comment 6013440113.

## Blockers and next work

- Wait for Session20's receiver PR to land before claiming runtime admission; the proof-only composition is not runtime admission.
- Identify the owner of the public-program producer hook immediately after `recordCapacityOutturn`; `POOL.md` currently has no owner entry for this writer. Do not edit its file.
- Add supported park proximity, opening-state, and worker effects only when the relevant owner supplies the required recorded fields and data. Actual area exposure currently follows operational outturns by recorded residence; visit notices remain tied to actual visitor receipts.
- Changed proof: parks and service-delivery suites passed (229/229), `npm run typecheck` passed including test import checking, and changed-file ESLint/Prettier passed. Random-place new-game/save-continue proof is still pending.
- Publish the current cohesive candidate and updated blocker evidence when GitHub access is available.

## Next command

`git status --short --branch`

Then run the focused parks tests and typecheck; publish the candidate when GitHub access is available. Do not edit Session20’s shared registry or merge/build.
