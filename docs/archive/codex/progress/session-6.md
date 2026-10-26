# Session 6 progress

## Current faith part

Faith reader and formative choice writer are on `codex/session6-p5-faith-memory`, based on current main `f88508186b78f526ecf89a420b5fb584171e039a`. PR #2440's remote head branch is `codex/session6-p5-faith-memory-mainline`; update that published branch with this work after final verification.

- `currentFaithForPerson` reads personal memberships/participation first, then dated household upbringing. It adds no faith store.
- Household attribution uses active person-held parental/guardian/custody authority, existing dated care shares, then membership start date; unsupported equal care remains mixed. Missing care contributes 0 and does not erase a caregiver's congregation.
- A new `faith-choice` kind lives in `childhoodRecords`, sourced from the controlled person's actual formative event (person, actor role, date, scene and selected option validated). `null` records unaffiliated. NPCs cannot use the player-choice writer. Later personal participation or choice wins by effective date and sequence.
- `childhoodRecordEntries` and `appendChildhoodEntry` remain the single store/writer path. Source integrity enforces exact event date, person involvement, actor role, option tags, and an existing congregation classification as of that date.
- Random-place new-game faith read remains in the focused test. Current `faith-record.test.ts` passes 2/2 including attributed household, explicit unaffiliated and congregation choices, source mismatch, NPC guard, and later participation precedence. `npm run typecheck` passes (803 test files, 0 unresolved imports); Prettier and `git diff --check` pass.
- PR #43 is verified closed/unmerged at `590c26643ba2cbb61462e359564adac2090696c3`; reviewed live patch/docs show no faith/caregiving writer dependency. Its head is absent from this workspace object database; actual local `origin/main` is `f88508186b78f526ecf89a420b5fb584171e039a`. CTO ruling #6014272179 withdraws the PR43 dependency and authorizes current-main faith work now.

## SP05

SP05 birthday reuse is published on draft PR #2461, registered branch `codex/session6-family-cohort-reuse`, frozen head `de477c3211b577e6f9c474b1d6930eaabb409e05`. Focused suite 16/16 and typecheck passed. CTO ruling #6014272179 parks SP01/SP05 as unapproved drafts; Session 5 now profiles baseline main only. Do not alter the published SP05 head or run any more cohort profile/repair work unless dispatched.

## Next

1. Commit the faith/choice/interface changes on this registered branch, and push to `origin/codex/session6-p5-faith-memory-mainline` (existing PR #2440 head branch).
2. Update PR #2440 body with exact head, focused tests/typecheck, care-weight contract, and choice-writer behavior. Publish the `faithChoice?: EntityId | null` writer contract for Session 4's formative scene offer; do not claim the offer itself is implemented.
3. Continue Session 6's independent faith and long-memory work. Do not rebase from closed #43 or resume SP05 performance edits/profiles without a new dispatch.

# Session 6 progress — 2026-10-06

## READY work

- #2438: ordinary conversation no longer randomly asks for a date; romance grows through recorded shared time.
- #2440: a per-person faith record reads that person's explicit dated congregation membership.
- #2442: focused Contacts look back at dated favors and still-unsettled conflict.
- #2443: caregiver decisions for young children persist as dated childhood-record entries.
- Creator/Begin PR #2402 is already merged. Rebasing showed all 21 commits in its patch are upstream; no diff remains against main.

All active Session 6 heads were rebased onto main `f8850818` and re-published on new branch names to avoid force pushes. Each is open and marked READY. Superseded heads #2423, #2426, #2434, and #2437 are closed.

## Verification

- Romance: focused tests 3 passed; typecheck, release check, lint, formatting, zero-dice and diff checks passed.
- Faith record: random-place new-game test 1 passed; typecheck and release check passed.
- Contact look-back: focused projection and UI tests 2 passed; typecheck and release check passed.
- Childhood record: random-place age-six proof and changed test files 12 passed; typecheck and release check passed.

## Blocker and open design question

- GitHub rejected the READY update to issue #2052 with HTTP 403: comments are disabled because the issue has more than 2,500 comments. The four READY PRs remain reviewable and have `PROGRESS:` notes in their bodies.
- The faith-record question asked on #2052 was likewise blocked: should household congregation history appear only as attributed childhood context, or should faith be recorded only from the person's own participation? Current implementation safely reports only explicit personal congregation membership.

## Next

Continue the light childhood work: read `docs/codex/assignments/b21-family-partner-and-kids.md` and `docs/codex/assignments/b33-opening-questions-and-first-day.md`; extend caregiver-choice evidence toward the caregiving summary and prove ages 5–17 through an adult life. Start from fresh main with:

```sh
git fetch origin main
git switch -c codex/session6-childhood-summary origin/main
```
