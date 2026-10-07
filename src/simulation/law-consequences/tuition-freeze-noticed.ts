import { recordById } from "../history-index";
import { recordLawExposure } from "../law-exposure";
import { resourceFlowTermsAt } from "../resource-queries";
import { money } from "../resources";
import { TUITION_FREEZE_QUESTION } from "../../education/tuition-prices";
import type { EntityId, World } from "../types";

export const TUITION_FREEZE_NOTICE_VERSION = "tuition-freeze-noticed/v1";

/**
 * A tuition freeze that held a charge below its billed price reaches the
 * student who owes it: the saved lower terms cite the law's stamp, and the
 * saving is the billed amount minus the held amount. A charge the freeze left
 * unchanged writes nothing. Idempotent on the saved terms.
 */
export function noticeTuitionFreeze(
  world: World,
  tuitionFlowId: EntityId,
): World {
  const flow = recordById(world.history.resourceFlows, tuitionFlowId);
  if (
    !flow ||
    flow.basisKind !== "obligation:tuition" ||
    flow.source.kind !== "person" ||
    !world.people[flow.source.personId]
  )
    return world;
  const terms = resourceFlowTermsAt(world, flow.id);
  const stamp = terms?.lawEffectStamps?.find(
    (record) =>
      record.effectKind === "price-cost" &&
      record.questionKey === TUITION_FREEZE_QUESTION,
  );
  const prior = terms?.supersedesTermsId
    ? recordById(world.history.resourceFlowTerms, terms.supersedesTermsId)
    : undefined;
  if (
    !terms ||
    !stamp ||
    !prior ||
    prior.amount.currency !== terms.amount.currency
  )
    return world;
  const saved = prior.amount.minorUnits - terms.amount.minorUnits;
  if (saved <= 0) return world;
  const stableKey = `${TUITION_FREEZE_NOTICE_VERSION}:${terms.id}`;
  if (world.history.lawExposures?.some((row) => row.stableKey === stableKey))
    return world;
  return recordLawExposure(world, {
    stableKey,
    personId: flow.source.personId,
    measureId: stamp.governingLawKey,
    channel: "public-service",
    direction: "gain",
    amount: money(saved, terms.amount.currency),
    cadence: "one-time",
    sourceRecordId: terms.id,
  });
}
