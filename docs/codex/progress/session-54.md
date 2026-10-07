# Session 54 resume marker

- Branch: `session54/b06-p3`
- Pool item: `b06-p3` — who handles constituent cases.
- Base: merged current `origin/main` (`0eb5a1442`).
- Implemented: route saved `office.case-opened` records using the officeholder's current recorded casework preference; identify player exceptions from people-known, reporter, public-official, donation, pending-measure and strongly negative-view records; route routine cases to an active office caseworker or the municipal clerk/manager for a council seat. Preserve the exact office relationship on cases and carry message reason/proposition tags for routing.
- Scope boundary: routing layer only; the player case-scene consumer is not present in this change.
- Gates after rebasing: Prettier passed; ESLint passed; changed tests passed (3 files, 9/9) with `/tmp/session54-vitest.config.mjs` because the repository Vite config's git plugin hits sandbox `EPERM`.
- PR: #3584 is open and ready; it is outside Session 54’s merge remainder.
- Next: monitor overlap with the shared case writer in open draft #3447, then continue the 10-minute merger triage cadence. No player-scene consumer is included in p3.
