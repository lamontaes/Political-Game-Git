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
import type { HistoricalEvent, World } from "../../../types";
import { noticeCivilFamilyServiceDelivery } from "../../civil-family-service-noticed";

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
  // The existing service resolver and writer own completion, request,
  // appropriation and positive operating-payment evidence. Only the typed
  // law row category changes at this receiving boundary.
  return resolveLawServiceConsequence(
    world,
    { ...row, kind: "service-delivered" },
    context,
  );
}

function applyServiceAndNotice(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
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
  selectors: [SERVICE_SELECTOR],
  actions: [SERVICE_ACTION],
  predicates: [FUNDED_SERVICE],
  units: ["hours"] as const,
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
