import { recordWorldEvent } from "../simulation";
import type { EntityId, World } from "../simulation";
import { docketBill } from "./legislation-docket";

/** Explicit selection uses ordinary saved history; reading never writes. */
export function selectedDocketKey(
  world: World,
  scenarioKey: string,
  personId: EntityId,
): string | null {
  const event = world.history.events
    .filter(
      (e) =>
        e.type === "legislation.working-bill-selected" &&
        e.participants.some((p) => p.personId === personId) &&
        e.context.socialContext === scenarioKey,
    )
    .at(-1);
  const key = event?.context.choice;
  return key &&
    docketBill(world, { scenarioKey, playerPersonId: personId, docketKey: key })
    ? key
    : null;
}

export function selectDocketBill(
  world: World,
  scenarioKey: string,
  personId: EntityId,
  docketKey: string,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("Select a bill as the current player.");
  const bill = docketBill(world, {
    scenarioKey,
    playerPersonId: personId,
    docketKey,
  });
  if (!bill) throw new Error("This bill is no longer on the selected docket.");
  if (selectedDocketKey(world, scenarioKey, personId) === docketKey)
    return world;
  return recordWorldEvent(world, {
    stableKey: `docket-selection:${personId}:${world.history.nextSequence}`,
    type: "legislation.working-bill-selected",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: bill.jurisdictionId,
    involvedEntityIds: [bill.measureId, personId].sort(),
    participants: [
      {
        personId,
        role: "agency:reader",
        detail: "Selected this bill as the working document.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["legislation.document"],
    summary: `Selected ${bill.designation} as the working document.`,
    context: {
      location: null,
      socialContext: scenarioKey,
      pressure: null,
      choice: docketKey,
      motivation: null,
      immediateReaction: null,
    },
  });
}
