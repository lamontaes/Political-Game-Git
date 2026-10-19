# Session 88 progress

Candidate filing terms now reach the one eligibility gate and candidate guidance for every supported place. The change is ready for review, but this checkout cannot post its claim or READY notice because it has no GitHub remote or authenticated GitHub CLI.

## Done

- Built b01-p1 on `session88/b01-p1-petition-terms`.
- Added one candidate-filing terms reader and complete estimated fallback rows for all 56 supported places and four office families.
- Wired filing terms into `candidacyEligibility` and candidate guidance.
- Extended state-office qualification intake vocabulary for filing fees and petition signatures.
- Added the 56-place coverage check and updated the played candidate-guidance check.

## Verification and limits

- Focused filing-term tests passed: 3 tests.
- The focused generated-world candidate-guidance test passed: 1 test, with 23 unrelated tests skipped by the name filter.
- ESLint, Prettier, and zero-dice passed on the changed paths.
- Typecheck reached two existing `PlaySettings.personalLifeDepiction` fixture errors in `src/simulation/press/press-premise.test.ts`; Session 88 did not alter that surface.
- Release check could not resolve its configured base commit `0dceca57a44ce30201c03ea387ae470737112dde` in this checkout.
- This checkout has no Git remote and GitHub CLI has no authentication, so the required claim and READY posts on issue #2424 could not be sent here.

## Next

- Post `Session 88 takes b01-p1` and the READY notice on issue #2424 when the publishing environment supplies GitHub access.
- Continue with b01-p3 after b01-p1 lands; b01-p2 is already done on the current base.
- Exact next command: `git status --short --branch`.
