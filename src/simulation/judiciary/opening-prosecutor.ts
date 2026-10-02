import { eventById } from "../event-index";
import { recordByStableKey } from "../history-index";
import {
  createWorkRelationship,
  type CreateWorkRelationshipInput,
} from "../life";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../life-queries";
import { assertPublicGovernmentIdentity } from "../public-government-identity";
import { resourceFlowTermsAt } from "../resource-queries";
import {
  createWorkCompensation,
  makeCurrencyCode,
  type CreateWorkCompensationInput,
} from "../resources";
import type { EntityId, World } from "../types";

/** Current recorded legal work only; no judicial salary or calendar conversion. */
export function recordedProsecutorPayComparison(world: World) {
  const flowsByWork = new Map<
    EntityId,
    World["history"]["resourceFlows"][number][]
  >();
  for (const flow of world.history.resourceFlows) {
    if (flow.basisReference.kind !== "work") continue;
    const key = flow.basisReference.workRelationshipId;
    const rows = flowsByWork.get(key) ?? [];
    rows.push(flow);
    flowsByWork.set(key, rows);
  }
  const comparisons = world.personOrder.flatMap((personId) =>
    activeWorkRelationshipsAt(world, personId).flatMap(
      ({ relationship, role }) => {
        if (
          role.occupationClassification !== "profession:prosecutor" &&
          role.occupationClassification !== "profession:lawyer" &&
          role.occupationClassification !== "profession:attorney"
        )
          return [];
        return (flowsByWork.get(relationship.id) ?? []).flatMap((flow) => {
          if (
            flow.basisReference.kind !== "work" ||
            flow.basisReference.workRelationshipId !== relationship.id
          )
            return [];
          const terms = resourceFlowTermsAt(world, flow.id);
          return terms?.status === "active" && terms.amount.currency === "USD"
            ? [
                {
                  personId,
                  workRelationshipId: relationship.id,
                  termsId: terms.id,
                  amount: terms.amount.minorUnits,
                  cadenceKind: terms.cadenceKind,
                },
              ]
            : [];
        });
      },
    ),
  );
  const cadences = [...new Set(comparisons.map((row) => row.cadenceKind))];
  const groups = cadences.map((cadenceKind) => ({
    cadenceKind,
    rows: comparisons.filter((row) => row.cadenceKind === cadenceKind),
  }));
  const largest = groups.filter(
    (group) => !groups.some((other) => other.rows.length > group.rows.length),
  );
  if (largest.length !== 1) return null;
  const group = largest[0]!;
  const averageMinor = Math.round(
    group.rows.reduce((sum, row) => sum + row.amount, 0) / group.rows.length,
  );
  const spreadMinor = Math.sqrt(
    group.rows.reduce((sum, row) => sum + (row.amount - averageMinor) ** 2, 0) /
      group.rows.length,
  );
  return {
    amount: { minorUnits: averageMinor, currency: makeCurrencyCode("USD") },
    cadenceKind: group.cadenceKind,
    spreadMinor,
    comparisons: group.rows,
  };
}

/** Binds an actual dated appointment; this adapter grants no appointment authority. */
export function bindRecordedOpeningProsecutor(
  world: World,
  input: {
    readonly appointmentEventId: EntityId;
    readonly work: CreateWorkRelationshipInput;
    readonly compensation?: Omit<
      CreateWorkCompensationInput,
      "workRelationshipId"
    >;
  },
): World {
  const appointment = eventById(world, input.appointmentEventId);
  if (
    !appointment ||
    appointment.occurredAt !== input.work.startedAt ||
    !appointment.participants.some(
      (row) =>
        row.personId === input.work.personId && row.role === "agency:appointed",
    ) ||
    appointment.jurisdictionId !== input.work.initialRole.locationJurisdictionId
  )
    throw new Error(
      "A prosecutor requires an actual dated appointment at the recorded venue.",
    );
  if (
    input.work.initialRole.occupationClassification !==
      "profession:prosecutor" ||
    !input.work.organizationId
  )
    throw new Error(
      "A prosecutor appointment requires its canonical employer and role.",
    );
  const employer = organizationProfileAt(world, input.work.organizationId);
  if (!employer || employer.closed || !employer.publicGovernmentIdentity)
    throw new Error(
      "A prosecutor appointment requires a recorded government employer identity.",
    );
  assertPublicGovernmentIdentity(world, employer.publicGovernmentIdentity);
  const existing = recordByStableKey(
    world.history.workRelationships,
    input.work.stableKey,
  );
  if (existing) {
    if (
      existing.personId !== input.work.personId ||
      existing.organizationId !== input.work.organizationId
    )
      throw new Error(
        "The saved prosecutor appointment binds a different holder or employer.",
      );
    return world;
  }
  const estimate = input.compensation
    ? null
    : recordedProsecutorPayComparison(world);
  if (!input.compensation && !estimate)
    throw new Error(
      "No unambiguous recorded prosecutor or attorney pay cohort is available.",
    );
  const next = createWorkRelationship(world, input.work);
  const work = recordByStableKey(
    next.history.workRelationships,
    input.work.stableKey,
  )!;
  return createWorkCompensation(
    next,
    input.compensation
      ? { ...input.compensation, workRelationshipId: work.id }
      : {
          stableKey: `${input.work.stableKey}:compensation`,
          workRelationshipId: work.id,
          startsAt: input.work.startedAt,
          amount: estimate!.amount,
          cadenceKind: estimate!.cadenceKind,
          restrictionKind: null,
          jurisdictionId: input.work.initialRole.locationJurisdictionId,
          provenance: {
            kind: "authored",
            note: `ESTIMATED FROM CURRENT GAME LEGAL WORK: mean ${estimate!.amount.minorUnits} USD minor; spread ${estimate!.spreadMinor}; cadence ${estimate!.cadenceKind}; comparison records ${JSON.stringify(estimate!.comparisons)}; appointment ${appointment.id}.`,
          },
        },
  );
}
