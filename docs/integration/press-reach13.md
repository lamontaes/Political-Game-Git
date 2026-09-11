# PRESS-REACH13 UI-core contract

No `PlayerGame` or global navigation change is required. UI #144 already mounts
`PressWorkspace`. This branch updates that existing consumer:

- public civic developments, not only published digest items, are request bases;
- `seekCivicPressContact` is offered when no journalism role exists, and
  generates a new authored civic reporter rather than reassigning someone
  already in the life;
- arrangement proceeds after reporter acceptance without a compulsory adviser.

LAND/A should keep the existing `PressWorkspace` mount. Do not add a second
press panel or publisher.

## Ordinary-route proof

Exact head proof used the published UI #144 `PlayerGame` News mount. This branch
does not edit `PlayerGame`. `git diff 302e1f0c -- src/player/PlayerGame.tsx` is
empty, so no PT3 root patch is required.

Focused Playwright `tests/e2e/press-reach13-ordinary.spec.ts` on this checkout
walks custom legislative-staff start → News → establish authored reporter →
posted public-meeting/agenda basis → request → NPC response → unprepared
arrangement → condensed answer → publication in Civic Ledger → save/reload.

Hosted full `npm run test:e2e` remains an external UI-core job: run
`34636990923` cancelled at 45 minutes after `npm run validate` passed. The
timed-out files are campaign first-election, character-context reload,
legislation docket, narrow unsaved-note, and owner-play repair. Those specs
were not authored on this branch.
