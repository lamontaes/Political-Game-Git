# S30-L office onboarding → A

Feature owner: L (`cursor/staff-office-onboarding-28c4`). A owns the final
`PlayerGame` mount. Do not copy this branch's other files over A's root.

## Player change

A seated member opening Work → Your office can record revisable voting and
casework preferences and read a staff briefing from actual
`employment:legislative-staff` records. Opening the surface does not vote.
A standing instruction binds the current measure version; S still owns the
legal vote/amendment write.

## Minimal current-root mount

In `src/player/PlayerGame.tsx`, add:

```tsx
import { OfficeOnboardingWorkspace } from "./OfficeOnboardingWorkspace";
```

Inside `legislativeOffice`, after the first orientation paragraph and before
the docket, mount:

```tsx
<OfficeOnboardingWorkspace
  world={session.world}
  playerPersonId={session.personId}
  selectedMeasureId={workingBill?.measureId ?? assignment?.measureId ?? null}
  onWorldChange={onLegislativeChange}
/>
```

No other root navigation, schema, or legislative-authority change is required.
`OfficeOnboardingWorkspace` imports its own CSS. Old saves omit the optional
history arrays and remain valid.

## L ↔ S seam

S should import `evaluateOfficeVoteInstruction` from
`src/presentation/office-vote-instruction.ts` before any floor vote or
amendment transition that claims to follow a standing instruction. An `armed`
result is permission to _consider_ the instruction, not a vote. See
`docs/integration/s30-l-s-vote-instruction.md`.

## Named remaining gap

Automatic execution of an armed instruction is not claimed. L records and
evaluates; S writes the canonical legislative transition when it is legally
available.
