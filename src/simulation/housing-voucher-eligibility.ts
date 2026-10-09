import incomeScope from "../../data/research/money/housing-voucher-income-scope.json" with { type: "json" };
import { ageOnDate } from "./dates";
import { recordedMonthlyPayByPerson } from "./household-pay";
import {
  householdLocationAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import {
  lifePlaceByJurisdictionId,
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { hudRentRowFor, veryLowIncomeLimit } from "./living-world/town-rent";
import {
  resourceFlowsForEndpoint,
  resourceFlowTermsAt,
} from "./resource-queries";
import type { EntityId, IsoDate, World } from "./types";

/** Income qualification only; this reader creates no enrollment or payment. */
export function housingVoucherIncomeScope(
  world: World,
  personId: EntityId,
  onDate: IsoDate,
) {
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const membership = householdMembershipsAt(world, personId, cutoff).find(
    (row) => row.state.residenceRole === "primary",
  );
  if (!membership) return null;
  const householdId = membership.membership.householdId;
  const location = householdLocationAt(world, householdId, cutoff);
  if (!location) return null;
  const place = lifePlaceByJurisdictionId(location.jurisdictionId);
  const stateKey =
    place?.stateJurisdictionKey ?? stateKeysById().get(location.jurisdictionId);
  const reference = incomeScope.rows.find(
    (row) => row.jurisdictionKey === stateKey,
  );
  if (!reference) return null;
  const members = peopleInHouseholdAt(world, householdId, cutoff);
  const pay = recordedMonthlyPayByPerson(world, onDate);
  let known = 0;
  let missingAdultIncome = false;
  for (const memberId of members) {
    if (
      ageOnDate(world.people[memberId]!.birthDate, onDate) <
      incomeScope.adultIncomeMinimumAge
    )
      continue;
    const monthly = pay.get(memberId);
    if (monthly !== undefined) known += monthly * 12;
    else if (
      ageOnDate(world.people[memberId]!.birthDate, onDate) >=
      incomeScope.adultIncomeMinimumAge
    )
      missingAdultIncome = true;
  }
  const annualIncomeMinor = Math.round(
    missingAdultIncome
      ? Math.max(known, reference.householdIncomeDollars * 100)
      : known,
  );
  const hud = hudRentRowFor(location.jurisdictionId);
  const localLimit = hud ? veryLowIncomeLimit(hud, members.length) : null;
  const size = Math.max(1, members.length);
  const factors = incomeScope.familySizeFactors;
  const factor =
    size <= factors.length
      ? factors[size - 1]!
      : factors.at(-1)! +
        incomeScope.eachAdditionalFactor * (size - factors.length);
  const limitMinor = Math.round(
    (localLimit ?? reference.veryLow4Dollars * factor) * 100,
  );
  const memberSet = new Set(members);
  const flows = members
    .flatMap((memberId) =>
      resourceFlowsForEndpoint(world, { kind: "person", personId: memberId }),
    )
    .filter(
      (flow) =>
        flow.startsAt <= onDate &&
        flow.basisKind.startsWith("compensation:") &&
        flow.recipient.kind === "person" &&
        memberSet.has(flow.recipient.personId),
    );
  const latestTerms = flows.flatMap((flow) => {
    const terms = resourceFlowTermsAt(world, flow.id, cutoff);
    return terms ? [terms] : [];
  });
  return {
    householdId,
    annualIncomeMinor,
    limitMinor,
    qualifies: annualIncomeMinor <= limitMinor,
    incomeEstimated: missingAdultIncome,
    limitEstimated: localLimit === null || !!hud?.estimated,
    estimatedFrom: reference.estimatedFrom,
    sourceRecordIds: [
      ...new Set([
        membership.membership.id,
        membership.state.id,
        location.id,
        ...flows.map((flow) => flow.id),
        ...latestTerms.map((terms) => terms.id),
      ]),
    ],
  };
}

let stateKeys: ReadonlyMap<EntityId, string> | undefined;
function stateKeysById() {
  return (stateKeys ??= new Map(
    lifePlaceStateIdentities().flatMap((place) => {
      const state = stateJurisdictionForKey(place.jurisdictionKey);
      return state ? [[state.id, place.jurisdictionKey] as const] : [];
    }),
  ));
}
