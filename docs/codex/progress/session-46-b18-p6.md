# Session 46 B18 part 6 — Letters, calls and email

## Scope

Part 6 records resident messages to elected officials and lets a member read the saved messages alongside the people’s aggregate consideration. Messages keep the sender, recipient, jurisdiction, proposition, stance, channel, salience and belief stake in the existing limited-visibility civic event. Only messages made by residents in the named constituency scope contribute to that scope’s consideration. The consideration names senders and cites their message events.

Background civic contacts become letters only when the resident has a settled proposition view to ground the topic and position. Contacts without that support remain recorded as generic contacts and do not affect message-based considerations. Explicit message recording supports letters, calls and email. This change does not create or alter an office inbox.

## Files

- `src/simulation/living-world/civic-actions.ts`
- `src/simulation/living-world/civic-actions.test.ts`
- `src/simulation/governing/constituent-views.ts`
- `src/simulation/governing/constituent-views.test.ts`
- `docs/codex/progress/session-46-b18-p6.md`

## Verification

- Focused Vitest plus `tests/nationwide/town-civic-actions.test.ts`: 7 tests passed.
- Repository typecheck source phase succeeds. The full typecheck currently stops on unrelated missing `PlaySettings.personalLifeDepiction` properties in `src/simulation/press/press-premise.test.ts` lines 35 and 125.
- Vitest uses a temporary minimal config because the checked-in Vite config calls `git status`, which is blocked by the sandbox with `spawnSync git EPERM`.
- Generated proof seed `session46-b18-p6-random-place-proof` draws Pemberwick, Connecticut (`0959210`). The test opens that new game, records ten adult residents’ letters to the generated current governor, and verifies ten event references and all ten sender names appear in the constituent consideration.
