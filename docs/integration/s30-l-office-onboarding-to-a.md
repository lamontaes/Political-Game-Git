# S30-L office onboarding → A

Feature owner: L (`cursor/staff-office-onboarding-28c4`, REST37-L). A owns
the final shared-root merge. This branch already mounts the workspace on the
ordinary legislative office route.

## Player change

A seated member opening Work → Your office stages voting and casework radios,
then commits with Record. A standing instruction binds the current bill
**text** (provisions and amendments), not a calendar step. Staff brief
attributed public or recorded accounts bound to origin event ids. Private and
missing records stay unavailable. Opening does not vote or finish casework.
`executedDelegation` remains false.

## Current-root mount (already applied)

`OfficeOnboardingWorkspace` in `legislativeOffice` after the orientation
paragraph. Draft radios reset on world/person/office identity, not only
preference id.

Ordinary-route proof: `tests/e2e/office-onboarding-ordinary.spec.ts` uses
`KENTUCKY_REGRESSION_HOMETOWN` and `reachMemberOffice`.

## L ↔ S consumer

`applyLegislativeStep` and `legislative-bargaining-actions.ts` consume
`dispositionsHonoringOfficeInstructions`. `openLegislativeWork` seats the live
member onto the matching chamber body so the overlay matches a canonical
`personId`. Stale text blocks the write. See
`docs/integration/s30-l-s-vote-instruction.md`.

## Named remaining gaps

- Ordinary production seating (`employInLegislativeOffice`) does not hire
  `employment:legislative-staff` onto `ActiveMemberSeat.organizationId`, so
  the ordinary Work route is an honest **no-staff** office. Do not invent an
  aide. A real staff producer belongs on the chamber/member organization after
  seating.
- Casework execution and a skill-ranked amendment package remain unfinished
  consumers. Preferences do not complete them.
- Automatic vote execution beyond overlaying the live member's recorded
  disposition on S's existing floor writes is not claimed.
