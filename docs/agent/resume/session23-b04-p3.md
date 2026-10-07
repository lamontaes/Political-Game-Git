# Session 23 b04-p3 resume marker

Branch: `session23-b04-p3`
Base: `3c7e70d12fd445f786a86fbe7449748bddc63e86` (`origin/main` at last refresh)

## Preserved backend work

- Adds campaign-to-standing-group formation records, reusing the committee organization.
- Active volunteer and employee campaign staff, plus strong-view campaign contacts, receive `evaluateDecision` membership choices.
- Active standing-group members feed civic-action stake, `peopleKnownTo`, and `peopleTiedTo` readers.
- Leaves campaign issue salience out because no campaign-to-platform/proposition link exists.

## Blockers before a player-complete flow

- Kit 13 has no approved name-entry control; campaign committee names in `projectCampaign` are auto-derived, so they cannot satisfy “named by the player.” Do not reuse them silently or add a new label without approval.
- `CampaignCommitmentRecord` stores candidate and proposition but no campaign ID or platform relation. There is no canonical source for the salience of issues this candidate ran on.
- Council attendance has an existing resident civic-action path that uses the same stake inputs; no separate organization-attendance engine was added.
- Later recruiting can read co-members through `peopleKnownTo` (`campaignHelperCandidates` consumes it). No standalone standing-group recruitment producer exists.

## Last checked

- Focused Vitest: 6 files, 20 tests passed on `3c7e70d12` before removing the unapproved auto-name UI experiment.
- Prettier, ESLint, and `git diff --check`: passed on the backend code.
- Typecheck ran after backend/helper updates and exited without diagnostics.
- Release check is blocked by existing main red `docs/release/changes/pool-b02-p6-blocked-oct7.md` containing `#2441`.
- Load check hit existing main red `ERR_UNKNOWN_FILE_EXTENSION` for `src/styles.css`.

Do not mark this branch ready until the naming and issue-salience seams are resolved and the p3 played-game proof can run.
