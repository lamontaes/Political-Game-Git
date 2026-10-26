# Session 20 progress

## Done

- Published the pure public-program capacity-outturn receiver contract and wired it immediately after both canonical `recordCapacityOutturn` call sites.
- Published the generated static law-module manifest and folder-drift generator/test.
- Sent Session 41 the exact contract and receiving route on issue #2424.
- Added focused tests that run both the installment and delivery hooks through `advanceWorld` with per-call ordered registrations, and verify saved lineage, event date, zero/unknown, failed payment, missing outturn, and replay behavior.
- Current branch head before this checkpoint update: `b6fb8544666b1988730c113731356e493303c59a`.

## Verification and blocker

- `npm run typecheck` passed.
- `npm run test:law-consequence-modules` and `npm run check:law-consequence-modules` passed.
- Focused public-program receiver and registry suites passed 10/10.
- Targeted ESLint, Prettier, and `git diff --check` passed.
- Focused public-program Vitest has one repeated failure at `src/simulation/governing/public-program.test.ts:76`: local and state tax-account organization IDs are equal. Reproduced with the PR base `public-program.ts` from `f88508186b78f526ecf89a420b5fb584171e039a` as well.
- Session 41's actual named-person receiver is available on #2460 but remains out of the manifest until the authorized main-landing/rebase/admission sequence. New-game/save-continue proof is still pending runtime composition after that sequence.
- The CTO routed the confirmed baseline tax-account ID failure to Fable; Session 20 is not changing its code or assertion.

## Next

- Re-run `npm run typecheck` at the next implementation change.
- Keep the baseline tax identity failure with Fable; do not alter its assertion or implementation.
- After the CTO's ordered main landing/rebase sequence, admit Session 41's receiver export through the generator and verify raw Node/Vitest parity plus random-place new-game/save proof.
