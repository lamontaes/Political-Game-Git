import {
  SERVICE_ACTION,
  SERVICE_SELECTOR,
  FUNDED_SERVICE,
  applyLawServiceConsequence,
  resolveLawServiceConsequence,
} from "../../service-delivered";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type { EntityId, HistoricalEvent, World } from "../../../types";
import { noticeCivilFamilyServiceDelivery } from "../../civil-family-service-noticed";
import { applyLawConsequences } from "../../../enacted-law-effects";
import type {
  PublicProgramCapacityOutturnContext,
  PublicProgramCapacityOutturnReceiver,
  PublicProgramCapacityOutturnReceiverRegistration,
} from "../../../public-program-capacity-outturn";
import { recordParksServiceAreaEffect } from "../../parks-service-area";
import { lawInForce } from "../../../governing/law-in-force";
import { hasHouseholdResidenceInJurisdiction } from "../../../life-queries";
import { eventById } from "../../../event-index";

const LIBRARY_QUESTION =
  "us-policy-positions:civil-family-community.fund-public-libraries";
const PARKS_QUESTION =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";

function resolveServiceKind(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
  kind: "public-library-service" | "parks-service-spending",
  questionKey: string,
): readonly ResolvedLawConsequence[] {
  if (row.kind !== kind || context.questionKey !== questionKey) return [];
  if (row.id === `${PARKS_QUESTION}:recorded-area-outturn`)
    return kind === "parks-service-spending"
      ? resolveParksAreaOutturn(world, row, context)
      : [];
  // The existing service resolver and writer own completion, request,
  // appropriation and positive operating-payment evidence. Only the typed
  // law row category changes at this receiving boundary.
  return resolveLawServiceConsequence(
    world,
    { ...row, kind: "service-delivered" },
    context,
  );
}

function resolveParksAreaOutturn(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (context.activity !== "service" || !context.questionKey) return [];
  const outturn = world.history.publicProgramRecords?.find(
    (record) =>
      record.kind === "capacity-outturn" &&
      record.id === context.activityId &&
      record.programKey.startsWith("parks:"),
  );
  if (!outturn || outturn.kind !== "capacity-outturn") return [];
  const event = eventById(world, outturn.eventId);
  if (!event || event.occurredAt !== context.onDate) return [];

  const records = world.history.publicProgramRecords ?? [];
  const commitment = records.find(
    (record) =>
      record.kind === "commitment" && record.id === outturn.commitmentId,
  );
  if (!commitment || commitment.kind !== "commitment") return [];
  const appropriation = records.find(
    (record) =>
      record.kind === "appropriation" &&
      record.id === commitment.appropriationId,
  );
  if (
    appropriation?.kind !== "appropriation" ||
    appropriation.jurisdictionId !== outturn.jurisdictionId ||
    !appropriation.sourceMeasureId ||
    (context.governingLawId &&
      context.governingLawId !== appropriation.sourceMeasureId)
  )
    return [];

  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === context.questionKey,
  );
  if (!proposition) return [];
  const law = lawInForce(
    world,
    outturn.jurisdictionId,
    proposition.id,
    event.occurredAt,
  );
  if (
    !law ||
    law.answer !== "yes" ||
    law.measureId !== appropriation.sourceMeasureId
  )
    return [];

  const cutoff = {
    asOfDate: event.occurredAt,
    historySequenceExclusive: outturn.sequence,
  };
  return context.subjectIds
    .filter((personId) =>
      hasHouseholdResidenceInJurisdiction(
        world,
        personId,
        outturn.jurisdictionId,
        cutoff,
      ),
    )
    .map((personId) => ({
      row,
      law,
      questionKey: context.questionKey!,
      jurisdictionId: outturn.jurisdictionId,
      subject: { kind: "person" as const, id: personId },
      activityId: outturn.id,
      effectiveAt: event.occurredAt,
      sourceRecordIds: [outturn.id, appropriation.id],
      value: {
        type: "amount" as const,
        value: outturn.unitsOperational,
        unit: "count" as const,
      },
    }));
}

function applyServiceAndNotice(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.row.id === `${PARKS_QUESTION}:recorded-area-outturn`) {
    const outturn = world.history.publicProgramRecords?.find(
      (record) =>
        record.kind === "capacity-outturn" && record.id === resolved.activityId,
    );
    return outturn?.kind === "capacity-outturn"
      ? recordParksServiceAreaEffect(world, outturn, resolved.subject.id)
      : world;
  }
  const saved = applyLawServiceConsequence(world, resolved);
  const receipt = saved.history.events.find(
    (event): event is HistoricalEvent =>
      event.type === "service.delivery-recorded" &&
      event.stableKey ===
        `law-service:${resolved.activityId}:${resolved.subject.id}:${resolved.row.id}`,
  );
  return receipt ? noticeCivilFamilyServiceDelivery(saved, receipt) : saved;
}

const common = {
  owner: "Session 41",
  selectors: [SERVICE_SELECTOR, "parks.service-area-resident"],
  actions: [SERVICE_ACTION, "record-park-area-outturn"],
  predicates: [FUNDED_SERVICE],
  units: ["hours", "count"] as const,
  apply: applyServiceAndNotice,
};

const libraryServiceRegistration: LawConsequenceKindRegistration<ResolvedLawConsequence> =
  {
    ...common,
    kind: "public-library-service",
    resolve: (world, row, context) =>
      resolveServiceKind(
        world,
        row,
        context,
        "public-library-service",
        LIBRARY_QUESTION,
      ),
  };

const parksServiceRegistration: LawConsequenceKindRegistration<ResolvedLawConsequence> =
  {
    ...common,
    kind: "parks-service-spending",
    resolve: (world, row, context) =>
      resolveServiceKind(
        world,
        row,
        context,
        "parks-service-spending",
        PARKS_QUESTION,
      ),
  };

export const registrations: readonly LawConsequenceKindRegistration<ResolvedLawConsequence>[] =
  [libraryServiceRegistration, parksServiceRegistration];

type LawConsequenceDispatcher = typeof applyLawConsequences;

/**
 * Bind the typed module to the canonical dispatcher. Focused local composition
 * supplies this module's registrations explicitly until the generated static
 * manifest admits the module on shared main.
 */
export function createParksCapacityOutturnReceiver(
  dispatch: LawConsequenceDispatcher = applyLawConsequences,
): PublicProgramCapacityOutturnReceiver {
  return (world, context: PublicProgramCapacityOutturnContext): World => {
    const { outturn, eventDate, commitment, installment, appropriation } =
      context;
    const sourceMeasureId = context.sourceMeasureId;
    if (
      outturn.kind !== "capacity-outturn" ||
      !outturn.programKey.startsWith("parks:") ||
      commitment.kind !== "commitment" ||
      installment.kind !== "installment" ||
      appropriation.kind !== "appropriation" ||
      outturn.commitmentId !== commitment.id ||
      outturn.installmentId !== installment.id ||
      installment.commitmentId !== commitment.id ||
      commitment.appropriationId !== appropriation.id ||
      appropriation.jurisdictionId !== outturn.jurisdictionId ||
      sourceMeasureId === null ||
      sourceMeasureId !== (appropriation.sourceMeasureId ?? null)
    )
      return world;

    const savedRecords = world.history.publicProgramRecords ?? [];
    if (
      !savedRecords.some(
        (record) =>
          record.kind === "capacity-outturn" && record.id === outturn.id,
      ) ||
      !savedRecords.some(
        (record) => record.kind === "commitment" && record.id === commitment.id,
      ) ||
      !savedRecords.some(
        (record) =>
          record.kind === "installment" && record.id === installment.id,
      ) ||
      !savedRecords.some(
        (record) =>
          record.kind === "appropriation" && record.id === appropriation.id,
      )
    )
      return world;

    const savedOutturn = savedRecords.find(
      (record) =>
        record.kind === "capacity-outturn" && record.id === outturn.id,
    );
    const event = eventById(world, outturn.eventId);
    if (
      savedOutturn?.kind !== "capacity-outturn" ||
      !event ||
      event.occurredAt !== eventDate ||
      event.occurredAt !== world.currentDate
    )
      return world;
    const cutoff = {
      asOfDate: eventDate,
      historySequenceExclusive: savedOutturn.sequence,
    };
    const subjectIds = (Object.keys(world.people) as EntityId[])
      .filter((personId) =>
        hasHouseholdResidenceInJurisdiction(
          world,
          personId,
          savedOutturn.jurisdictionId,
          cutoff,
        ),
      )
      .sort();

    return dispatch(
      world,
      {
        activity: "service",
        activityId: savedOutturn.id,
        onDate: eventDate,
        questionKey: PARKS_QUESTION,
        governingLawId: sourceMeasureId,
        subjectIds,
      },
      registrations,
    );
  };
}

/**
 * Route an actual saved parks outturn through the ordinary law dispatcher.
 * Uses Session20's published context; caller-provided facts are not accepted.
 */
export const receiveParksCapacityOutturn = createParksCapacityOutturnReceiver();

export const publicProgramCapacityOutturnReceivers: readonly PublicProgramCapacityOutturnReceiverRegistration[] =
  [
    {
      key: "parks-law-service-area",
      receive: receiveParksCapacityOutturn,
    },
  ];
