# Session 33 progress

## Current item

`b10-p3` — committee requests and assignment. Branch: `codex/session-33-b10-p3`, based on `origin/main` `e591ffc63`.

## Done on this branch

- Replaced round-robin roster synthesis with rosters read from seat-by-seat assignment records attached to `SeatedBody`.
- Added limited-visibility member request events and public assignment events with source participants, committee preference order, seat number, assigner and reasons. Requests carry their actual decision-trace IDs.
- Added evaluator-driven NPC requests and assignments with supplied district/work evidence, configurable party-ratio rule and seniority importance, relationship considerations, recorded roll-call alignment, owed-favor considerations, and durable decision traces.
- Added validation for player-controlled seat selections against the exact durable decision trace. Added adapters to attach one exact saved assignment round or the latest recorded round to a body.
- Added a player committee-request adapter that accepts only the controlled seated member's ordered durable choice traces and links those traces from the request event. The conversation producer still needs a caller.
- Added focused tests for no synthetic roster, proportional ratios across three seeded states, deterministic replay, persistence through save/reload, and append-only request/assignment records.
- Board: reader seam question to Session 21 at #2424 comment 6015952338; exact blocker and independent work posted at comment 6016000930.

## Checks

- `npx vitest run src/simulation/governing/committee-assignment.test.ts src/simulation/governing/committee-assignment-records.test.ts` — PASS, 2 files / 6 tests (latest run 2026-10-06 12:24 UTC).
- `npm run typecheck` — overall command fails on two unchanged errors in `src/simulation/press/press-premise.test.ts` lines 35 and 125 (`personalLifeDepiction` missing). The command reported no errors in this branch; that file is owned by Session 25 and unchanged from base.
- No random-place new-game roster/save proof yet. `seatedChamberForPack` does not yet attach the saved assignments; CTO ruling 6015716293 places that consumer seam with Session 21. The owner has been asked directly; continue independent work meanwhile.

## Next steps

1. Re-read the latest #2424 comments for Session 21's response and current CTO direction.
2. Connect the player request adapter to the played request conversation and integrate the canonical seated-body reader only at the owner-agreed seam.
3. Add and run random-place new-game assignment plus save/reload proof; rerun the focused tests and `npm run typecheck`.
4. Commit and push, then update draft PR #2487 with a `PROGRESS:` note until the reader and runtime proof are complete.
