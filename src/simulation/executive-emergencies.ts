import { addDays } from "./dates";
import { issueExecutiveInstrument } from "./legislation";
import { legislatureProfilePackId } from "./legislature-game-profile";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { decideExecutiveActionAuthority } from "./executive-action-authority";
import { appendCrisisRecord, crisisRecords } from "./crisis/records";
import { createStableId } from "./ids";
import type { EntityId, World } from "./types";
import type {
  GoverningMatter,
  GoverningOffice,
} from "./governing/state-governing";
export { activeExecutiveEmergency } from "./executive-emergency-reader";

export function recordExecutiveEmergency(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
): World {
  const stateUsps = office.stateUsps;
  if (!stateUsps || !matter.subjectKey) return world;
  const sourceTag = matter.openedEvent.tags.find((tag) =>
    tag.startsWith("source-event:"),
  );
  const sourceEventId = sourceTag?.slice("source-event:".length) as
    EntityId | undefined;
  if (
    !sourceEventId ||
    !crisisRecords(world).some(
      (record) =>
        record.kind === "hazard-episode" &&
        record.eventId === sourceEventId &&
        record.stateUsps === stateUsps,
    )
  )
    return world;
  const jurisdictionKey = `US-${stateUsps}`;
  const pack = executiveRulePackForJurisdiction(jurisdictionKey);
  const duration = pack.emergencyDeclaration.initialDurationDays;
  const clause = {
    kind: "emergency-declaration" as const,
    topicKey: matter.subjectKey,
  };
  const authority = decideExecutiveActionAuthority(pack, clause, null);
  if (
    !authority.allowed ||
    duration.kind !== "known" ||
    !Number.isSafeInteger(duration.value) ||
    duration.value < 1
  )
    return world;
  const stableKey = `${matter.stableKey}:emergency-declaration`;
  const activeUntil = addDays(world.currentDate, duration.value - 1);
  const instrumentWorld = issueExecutiveInstrument(world, {
    stableKey,
    jurisdictionKey,
    jurisdictionId: office.jurisdictionId,
    legislativeRulePackId: legislatureProfilePackId(jurisdictionKey),
    instrument: "executive-order",
    designation: `Emergency Declaration ${stateUsps}`,
    shortTitle: `Emergency: ${matter.subjectKey}`,
    summary: `Declare an emergency for ${matter.subjectKey} through ${activeUntil}.`,
    actorLabel: pack.displayName,
    actorPersonId: office.holderPersonId,
    rationale: authority.reason,
    sourceDocumentKey: `session38:emergency:${matter.id}`,
    publishedAt: world.currentDate,
    effectiveAt: world.currentDate,
    expiresAt: activeUntil,
    propositionIds: [],
    propositionAnswers: [],
    authorityChecks: [{ clause }],
  });
  const measure = instrumentWorld.history.legislativeMeasures?.find(
    (row) => row.stableKey === stableKey,
  );
  if (!measure) return world;
  const declarationId = createStableId(
    "crisis-record",
    `${world.id}:${stableKey}:emergency-record`,
  );
  return appendCrisisRecord(instrumentWorld, {
    kind: "executive-emergency-declaration",
    stableKey: `${stableKey}:emergency-record`,
    effectiveAt: world.currentDate,
    // CRISIS causal parents must be earlier records in the CRISIS family.
    // The source event and order measure remain explicit fields on this row.
    causalParentIds: [],
    visibility: "public",
    eventId: null,
    declarationId,
    operation: "declared",
    stateUsps,
    jurisdictionId: office.jurisdictionId,
    officeKey: office.officeKey,
    actorPersonId: office.holderPersonId,
    executiveOrderMeasureId: measure.id,
    sourceEventId,
    subject: matter.subjectKey,
    activeUntil,
    reason: authority.reason,
  });
}
