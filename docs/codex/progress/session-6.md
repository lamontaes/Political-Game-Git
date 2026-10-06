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
3. Update PR #2440 body with exact head, focused tests/typecheck, care-weight contract, and choice-writer behavior. Publish the `faithChoice?: EntityId | null` writer contract for Session 4's formative scene offer; do not claim the offer itself is implemented.
4. Continue Session 6's independent faith and long-memory work. Do not rebase from closed #43 or resume SP05 performance edits/profiles without a new dispatch.
