# Session 51 b27-p4 resume marker

## Current draft

- Branch: `session-51-b27-p4`, based on refreshed `origin/main` `e597ec933608993a9ecfef6110b3f9b9f856a3c7`.
- The isolated draft adds the sourced Federal Direct undergraduate rate selector to `src/simulation/student-debt.ts` and tests it in `src/simulation/student-debt.test.ts`.
- The 2026–27 rate is 652 basis points. The checked-in source is snippet-derived, so each loan/disbursement records `ESTIMATED FROM AVERAGE` provenance. Dates outside the row's 2026-07-01 through 2027-06-30 window are marked as nearest-row estimates.
- The research row contains interest rates but no repayment-term schedule. The existing supplied repayment term remains a caller input; no unsupported term has been added.

## Acceptance still open

- `student-aid-facts.ts` currently supplies dependency facts and annual/aggregate federal loan limits, but no grant or scholarship amount/share. `data/source/education-tuition/tuition-input.json` supplies tuition sticker-price fields only; no student-aid share table is checked in. Do not treat missing aid evidence as a sourced amount.
- `character-history.ts` currently creates elementary, middle, and high-school history only; it has no postsecondary enrollment, tuition, aid, or loan records. Adding pre-start adult student loans needs a source-backed college-history and aid basis before generating any such records. No invented college attendance or loan size was added.
- The p4 end-to-end tuition-over-aid and pre-start-adult acceptance remains incomplete. Random-game money-screen proof was not run or claimed.

## Checks and resume command

- Rate-selector and one-place financing regressions passed separately with the temporary config: the selector test (1 passed, 20 skipped) and `finances actual shortfall in 4752006` (1 passed, 20 skipped). The temporary test config was removed after use.
- Changed-file ESLint, Prettier, `git diff --check`, and `npm run zero-dice` passed.
- `npm run typecheck` after fixing source tuple/date diagnostics reports only the two existing `press-premise.test.ts` PlaySettings fixture diagnostics; no p4 diagnostics remain.
- Resume with `cd /tmp/Political-Game-Git-b27-p4 && npm run typecheck`, then continue p4 only after sourcing/locating a college-kind aid-share record; add tests for tuition greater/equal to recorded aid and historical enrollment, and update existing draft PR #2605 without opening a duplicate.
