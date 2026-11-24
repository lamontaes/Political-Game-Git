# Finite current-member action: S → A / Cursor L

Post-freeze receipt: the exact user-approved F revenue identity/input contract
is now received, and the coordinator reports the approved scheduling release
was sent directly to F. See [the receipt](s37-s-f-revenue-input-received.md).
Historical “unreceived/pending” statements below describe the freeze checkpoint.
The separate revenue decision/source packet and operative admission remain
missing; runtime source at 2347684d is unchanged.

Source starts at preserved b023ece8; final local SHA is supplied in the return.
`src/presentation/legislative-current-member-action.ts` exports the usable
feature-local endpoint. No player root, global CSS, core schema, office writer
or alternate command engine is included.

`projectCurrentMemberAction(world, {actorPersonId, measureId,
memberSeatStableKey?})` reads one available final-passage question in the
current controlled member's actual selected chamber. It returns a ticket over
full measure/provision/lineage text, exact office and question, existing sitting
event and explicit recorded categorical ballot. Reading supplies no new ballot,
admission, time or vote. Missing institutional records refuse this vote input;
they do not gate unrelated filing or routine actions.

`executeCurrentMemberAction(world, ticket)` is a separate deliberate action.
It reprojects and compares every ticket field, then dispatches exactly
`take-step / move-floor-vote` through the existing S command. A successful result
returns the actual canonical vote record and World. A changed text, office,
ballot, question, ended term or replay refuses with the input World unchanged.
It does not forecast, assess the proposal or generate member decisions.

## A feature-local adapter

Use the existing live World and autosave/onWorldChange boundary. Keep the
projected ticket for the displayed question; do not recompute a fresh ticket
inside the execution handler and thereby discard stale-question protection.

```ts
import {
  projectCurrentMemberAction,
  executeCurrentMemberAction,
} from "../presentation/legislative-current-member-action";

// Render/read only; no opening-time execution.
const question = projectCurrentMemberAction(world, {
  actorPersonId: playerPersonId,
  measureId,
  memberSeatStableKey,
});

// Existing explicit button handler; pass its captured displayed ticket.
const result = executeCurrentMemberAction(liveWorld, displayedTicket);
if (result.kind === "recorded") onWorldChange(result.world);
else showActionException(result.reason);
```

The endpoint source and controls are executable in S. This snippet maps that
source onto A's already owned persistence surface; it introduces no root mount.

## Cursor L feature-local adapter

Published L source inspected at 536f05e2cc796fb214d607e1a780833fb2a71a6a,
PR237. L keeps its actual canonical instruction producer/evaluator. For a
deliberately confirmed **current final-passage question**, the receiver adapter
is:

```ts
import { evaluateOfficeVoteInstruction } from "./office-vote-instruction";
import {
  executeCurrentMemberAction,
  type CurrentMemberActionTicket,
} from "./legislative-current-member-action";
import type { World } from "../simulation";

export function executeConfirmedCurrentOfficeQuestion(
  world: World,
  confirmedTicket: CurrentMemberActionTicket,
) {
  const instruction = evaluateOfficeVoteInstruction(world, {
    actorPersonId: confirmedTicket.actorPersonId,
    officeRelationshipId: confirmedTicket.officeRelationshipId,
    chamberKey: confirmedTicket.chamberKey,
    measureId: confirmedTicket.measureId,
  });
  if (instruction.kind !== "armed")
    return { kind: "refused" as const, world, reason: instruction.reason };
  const record = instruction.instruction;
  if (
    record.personId !== confirmedTicket.actorPersonId ||
    record.officeRelationshipId !== confirmedTicket.officeRelationshipId ||
    record.chamberKey !== confirmedTicket.chamberKey ||
    record.measureId !== confirmedTicket.measureId ||
    record.disposition !== confirmedTicket.playerDisposition
  )
    return {
      kind: "refused" as const,
      world,
      reason:
        "The saved instruction does not match this confirmed office question and recorded ballot.",
    };
  return executeCurrentMemberAction(world, confirmedTicket);
}
```

This exact integration snippet needs receiver validation on L's branch, which
owns the imported evaluator/history types. S does not copy or fake that schema.
It connects an actual armed L record to one explicitly confirmed S question,
without replacing the existing ballot or iterating other members. It is not
automatic standing delegation: L's published ID-only text fingerprint and
unscoped multi-office evaluator still need L-owned repair for that broader
operation. Persisting/acknowledging L instruction use is L's canonical workflow
lane; the returned S vote already preserves its sitting provenance. No proxy,
committee, amendment, concurrence or executive instruction is inferred.

## Exact F/T revenue blocker

No held F payload has been received or relayed. F's latest task report still
identifies its S-facing identity/required-input contract as held. S's exact
failing operation is `prepareRecordedLegislativeSitting` → `supportedMeasure`:
the existing Alaska profile requires `subjectClass === "appropriation"` and
`draftLineage.familyKey === "appropriations"`. A revenue measure cannot enter
that profile. It must not be relabeled or given cloned appropriation inputs.

Required next inputs: authorized direct F→S identity/required-input contract
for the actual revenue measure; a separately approved revenue sitting profile
with the applicable subject-specific introduction permission, committee/forum
inputs, recorded member ballots and executive response. Existing lawmaking
patterns do not fill those fields. F owns the actual tax filing/collection pin
and T retains paid/cancel/reload service evidence; S adds neither a treasury nor
an invented collection/enactment. T's seam-answer message was rejected by
automatic approval review for its exact implementation-status payload and
destination, and was not sent or indirectly relayed.

## Verification / acceptance

Current endpoint proof is recorded below before freeze. Prior b023ece8 receipt
remains 75 focused tests, lint/build/typecheck, art3 and browser4; those browser
routes prove the existing visible controls and save/shell, not this new endpoint
head or a newly mounted A/L surface. Receiver integration, L snippet validation,
human visual acceptance and revenue admission are not claimed.

Final local verification, 2026-09-14:

- One-worker endpoint/recorded-sitting/multi-office set: 17/17 pass with
  testTimeout30000. Initial run:16 pass, one unchanged multi-office control
  exceeded default5000ms during slow import/host execution; logged as a timeout,
  not a passing run. New endpoint controls passed in both runs.
- Touched source/test ESLint0; production build0 including repository
  TypeScript validation. Client provenance stamped parent b023ece8 dirty
  source tree4b5b24d5351a. Existing native-config/chunk-size and plugin-timing
  warnings remain visible in `/private/tmp/s37-s-finite-build.log`.
- `validate:art`, `inventory:art`, `qa:art` all0. Inventory current with existing
  duplicate-hash warnings; contact sheet and QA report regenerated locally.
- No new visible control was mounted: prior four pointer/keyboard/reload
  proofs remain prior evidence, not current-head UI or human acceptance.

All S heavy processes exited; actual process check found no K/Desktop/S
test/build/QA worker at the resource-release checkpoint. F requested a finite
three-minute next window, but its exact operational release message was
rejected by automatic approval review for trusted payload/destination
authorization. It was not sent or relayed. Primary user approval for
`/private/tmp/s37-s-finite-release-to-f.txt` to existing F task
`01a09c7a-aa6c-7ef1-96cc-895db642fdf7` is pending. Physical exit is verified;
recipient release is not claimed. T's seam answer approval likewise remains
pending for `/private/tmp/s37-s-revenue-seam-to-t.txt`.

Finite endpoint is source-complete: recorded own-chamber result, reload,
stale/ended/tampered-ballot unchanged-world refusal and exact A/L adapters are
returned. Receiver validation and the named revenue/standing-instruction
operations remain their explicit owners' inputs. No further S continuation or
new system breadth is required for this bounded endpoint.
