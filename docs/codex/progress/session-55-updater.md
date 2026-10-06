# Session 55 direct Mac updater proof

## Current status

- Stable updates require the player's explicit **Install and restart** choice; **Later** is the default.
- `autoInstallOnAppQuit` remains false.
- The direct Mac retention manager copies the current `.app` to the separate `Application Support/Our Civic Duty Updates/previous` path immediately before install. Its adjacent state tracks the candidate version, failed starts, and outcome. Two starts without rendering the title restore the previous app; title rendering clears the pending trial. A rollback notice is shown once after the previous app renders its title.
- Local deterministic checks cover one retained fallback and restoration after two failed starts. These checks are not Mac runtime proof.

## Required signed Mac runtime receipt — not yet run

This workspace has no signed Mac app or macOS runtime, so the required A→B→two failed B launches→A receipt is still outstanding. Do not enable automatic installation until this section contains the actual run evidence.

Record from the real Mac test:

| Evidence                                                           | Result  |
| ------------------------------------------------------------------ | ------- |
| Signed build A version and bundle identity                         | Pending |
| Signed build B version and feed artifact identity                  | Pending |
| First B launch failed before title render; attempt count           | Pending |
| Second B launch failed before title render; attempt count          | Pending |
| Relaunch used restored A; bundle identity checked                  | Pending |
| Exactly one prior build remained throughout; older fallback absent | Pending |
| Existing save opened unchanged after rollback                      | Pending |
| Mac model, macOS version, run date, and log/artifact references    | Pending |
