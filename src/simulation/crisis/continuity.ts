import type { EntityId, EventVisibility, IsoDate, World } from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { publicOfficesHeldBy } from "./offices";
import { appendCrisisRecord } from "./records";
import type { OfficeRef, OfficialContinuityChange } from "./types";

/**
 * Office-continuity notices. The offices are read from `before` — the World
 * immediately before the death or capacity record — because office
 * projections already stop listing a person once their death is visible.
 */

const EVENT_TYPE: Record<OfficialContinuityChange, `${string}.${string}`> = {
  death: "crisis.officeholder-died",
  "incapacity-began": "crisis.officeholder-incapacitated",
  "incapacity-ended": "crisis.officeholder-capacity-restored",
};

function summaryFor(
  change: OfficialContinuityChange,
  offices: readonly OfficeRef[],
) {
  const titles = offices.map((office) => office.title).join("; ");
  switch (change) {
    case "death":
      return `Died while holding office: ${titles}.`;
    case "incapacity-began":
      return `Became unable to carry out the duties of office: ${titles}.`;
    case "incapacity-ended":
      return `Became able again to carry out the duties of office: ${titles}.`;
  }
}

export function recordOfficialContinuity(
  before: World,
  after: World,
  personId: EntityId,
  change: OfficialContinuityChange,
  options: {
    readonly visibility?: EventVisibility;
    readonly effectiveAt?: IsoDate;
    readonly sourceRecordId?: EntityId;
    readonly extraParentIds?: readonly EntityId[];
  } = {},
): World {
  const offices = publicOfficesHeldBy(before, personId);
  if (offices.length === 0) return after;
  const person = after.people[personId]!;
  const source =
    options.sourceRecordId ??
    (change === "death"
      ? after.history.personDeaths.find((death) => death.personId === personId)
          ?.id
      : after.history.personFunctionalCapacities
          .filter((record) => record.personId === personId)
          .at(-1)?.id);
  if (!source) throw new Error("Continuity notice needs its source record.");
  const effectiveAt =
    options.effectiveAt ??
    (change === "death"
      ? after.history.personDeaths.find((death) => death.id === source)!.diedAt
      : after.history.personFunctionalCapacities.find((c) => c.id === source)!
          .effectiveAt);
  const visibility = options.visibility ?? "public";
  const stableKey = `crisis:continuity:${change}:${personId}:${effectiveAt}`;
  const withEvent = recordWorldEvent(after, {
    stableKey: `${stableKey}:event`,
    type: EVENT_TYPE[change],
    occurredAt: effectiveAt,
    recordedAt: after.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [personId, source].sort(),
    participants: [
      {
        personId,
        role: "focus:officeholder",
        detail: offices.map((office) => office.officeKey).join(","),
      },
    ],
    personFactConstraints: [],
    visibility,
    tags: [
      "crisis",
      "crisis.official-continuity",
      `continuity:${change}`,
      ...offices.map((office) => `office:${office.officeKey}`),
    ],
    summary: summaryFor(change, offices),
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = withEvent.history.events.at(-1)!;
  const next = appendCrisisRecord(withEvent, {
    kind: "official-continuity",
    stableKey,
    effectiveAt,
    causalParentIds: [source, ...(options.extraParentIds ?? [])],
    visibility,
    eventId: event.id,
    personId,
    change,
    offices,
    sourceRecordId: source,
  });
  assertWorldIntegrity(next);
  return next;
}
