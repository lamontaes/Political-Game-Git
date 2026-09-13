# L ↔ S standing vote-instruction contract

Agreed at the existing seat identity, not a second legislature.

## Identities

- Actor: controlled `personId`.
- Office: `ActiveMemberSeat.relationshipId` from `resolveActiveMemberSeat`.
- Chamber: `ActiveMemberSeat.chamberKey`.
- Measure: canonical `legislativeMeasures` id.
- Version: `measureTextVersion(world, measureId)` (current provision ids,
  amendment ids/status, last legislative action).

## Writer

L writes `officeWorkflowPreferences`, `officeVoteInstructions`, and
`officeBriefingInspections`. Those arrays are optional on old saves.

S writes legislative actions, amendments, votes, and other process records.
L must not call those writers.

## Function

`evaluateOfficeVoteInstruction(world, { actorPersonId, officeRelationshipId,
chamberKey, measureId })`

- `armed`: live seat matches the bound office/chamber; preference is
  `prior-instructions-with-exceptions`; instruction exists; measure version
  matches.
- `refused` with a stable `code`, including `measure-changed`,
  `no-active-seat`, `office-mismatch`, `no-preference`,
  `mode-forbids-standing-instruction`, `instruction-missing`.

A preference is never legal proxy-voting permission. Opening the office must
not execute an armed instruction.

## Persistence / old saves

Missing arrays mean no preference and no instruction. Replay does not invent
them.
