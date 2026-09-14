# L ↔ S standing vote-instruction contract

Agreed at the existing seat identity, not a second legislature.

## Identities

- Actor: controlled `personId`.
- Office: `ActiveMemberSeat.relationshipId` from `resolveActiveMemberSeat`.
- Chamber: `ActiveMemberSeat.chamberKey`.
- Measure: canonical `legislativeMeasures` id.
- Version: `measureTextVersion(world, measureId)` — current provision ids and
  amendment ids/status only. Referral, calendar, and other steps are
  `measureProceduralStage` and do not void the instruction.

## Writer

L writes `officeWorkflowPreferences`, `officeVoteInstructions`, and
`officeBriefingInspections`. Those arrays are optional on old saves.

S writes legislative actions, amendments, votes, and other process records.
L must not call those writers.

## Consumer (wired)

`applyLegislativeStep` overlays an armed instruction onto the live member's
floor, amendment, and concurrence dispositions through
`applyArmedOfficeInstructionsToDispositions`. `openLegislativeWork` now seats
that live member onto the matching chamber body so the overlay has a
canonical `personId` to match; the filing sponsor remains linked on the
origin floor. If the bill text no longer matches, the step throws the
evaluation reason and writes nothing. An armed result is still not itself a
vote; the canonical vote record is S's write.

A stored workflow preference is never executed delegation and never a proxy
vote. `review-batch` and `handle-individually` do not overlay.

## Function

`evaluateOfficeVoteInstruction(world, { actorPersonId, officeRelationshipId,
chamberKey, measureId })`

- `armed`: live seat matches the bound office/chamber; preference is
  `prior-instructions-with-exceptions`; instruction exists; measure text
  version matches. `proceduralStage` is informational.
- `refused` with a stable `code`, including `measure-changed`,
  `no-active-seat`, `office-mismatch`, `no-preference`,
  `mode-forbids-standing-instruction`, `instruction-missing`.

Opening the office must not execute an armed instruction.

`legislative-bargaining-actions.ts` still writes floor and amendment votes
from derived member decisions without this overlay. That path should call
`applyArmedOfficeInstructionsToDispositions` before `takeFloorVote` /
`offerFloorAmendment`; L does not own those writers.

## Persistence / old saves

Missing arrays mean no preference and no instruction. Replay does not invent
them.
