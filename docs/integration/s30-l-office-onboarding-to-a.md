# S30-L office onboarding → A

Feature owner: L (`cursor/staff-office-onboarding-28c4`, P31-L repair of
`8cf65b2b`). A owns the final shared-root merge. This branch already mounts
the workspace on the ordinary legislative office route so A can receive the
current adapter rather than a conceptual snippet.

## Player change

A seated member opening Work → Your office sees How this office works. They
choose one of three voting workflows and one of three casework workflows,
then commit with Record this office workflow. Trying a radio spends no time
or money and does not save. A standing instruction is a separate deliberate
action and is refused until a workflow is recorded. Staff text is a briefing
of known public or recorded items, not a recommended package and not executed
delegation. Opening the surface does not vote or finish casework.

## Current-root mount (already applied on this branch)

In `src/player/PlayerGame.tsx`, `legislativeOffice` mounts:

```tsx
import { OfficeOnboardingWorkspace } from "./OfficeOnboardingWorkspace";

<OfficeOnboardingWorkspace
  world={session.world}
  playerPersonId={session.personId}
  selectedMeasureId={workingBill?.measureId ?? assignment?.measureId ?? null}
  onWorldChange={onLegislativeChange}
/>;
```

after the first orientation paragraph and before the docket. No other root
navigation, schema, or legislative-authority change is required.
`OfficeOnboardingWorkspace` imports its own CSS. Old saves omit the optional
history arrays and remain valid.

Ordinary-route proof: `tests/e2e/office-onboarding-ordinary.spec.ts` reaches
a won seat through `reachMemberOffice` and asserts `#office-onboarding`.
Fixture interaction proof remains `tests/e2e/office-onboarding.spec.ts`.

## L ↔ S seam

S should import `evaluateOfficeVoteInstruction` from
`src/presentation/office-vote-instruction.ts` before any floor vote or
amendment transition that claims to follow a standing instruction. An `armed`
result is permission to consider the instruction, not a vote. See
`docs/integration/s30-l-s-vote-instruction.md`.

## Named remaining gap

Automatic execution of an armed instruction is not claimed. Casework
execution and a skill-ranked recommendation engine are not claimed. L
records and evaluates; S writes the canonical legislative transition when it
is legally available.
