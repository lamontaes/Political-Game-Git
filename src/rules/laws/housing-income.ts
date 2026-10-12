/** KEEP income qualification; dated household/pay/region receipts come from their owning producers. */
import type { EntityId, IsoDate, World } from "../../simulation/types";
import type * as life from "../../simulation/life-queries";
import type { HudRentRow } from "../../simulation/living-world/town-rent";
import type { resourceFlowTermsAt } from "../../simulation/resource-queries";
import { ageOnDate } from "../offices/calendar";
export interface HousingFacts {
  readonly nextSequence: number;
  readonly people: World["people"];
  readonly incomeScope: {
    readonly adultIncomeMinimumAge: number;
    readonly familySizeFactors: readonly number[];
    readonly eachAdditionalFactor: number;
    readonly rows: readonly {
      readonly jurisdictionKey: string;
      readonly householdIncomeDollars: number;
      readonly veryLow4Dollars: number;
      readonly estimatedFrom: string;
    }[];
  };
  readonly memberships: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.householdMembershipsAt>
  >;
  readonly locations: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.householdLocationAt>
  >;
  readonly places: ReadonlyMap<
    EntityId,
    { readonly stateJurisdictionKey: string | null }
  >;
  readonly stateKeys: ReadonlyMap<EntityId, string>;
  readonly members: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly monthlyPay: ReadonlyMap<EntityId, number>;
  readonly hud: ReadonlyMap<EntityId, HudRentRow | null>;
  readonly flowsForPerson: ReadonlyMap<
    EntityId,
    World["history"]["resourceFlows"]
  >;
  readonly terms: ReadonlyMap<EntityId, ReturnType<typeof resourceFlowTermsAt>>;
}
export const HUD_FAMILY_SIZE_FACTORS = [
  0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32,
] as const;

export function veryLowIncomeLimit(
  row: HudRentRow,
  people: number,
): number | null {
  if (row.veryLow4 === null) return null;
  const size = Math.max(1, people);
  const factor =
    size <= 8
      ? interpolateFactor(size)
      : HUD_FAMILY_SIZE_FACTORS[7] + 0.08 * (size - 8);
  return row.veryLow4 * factor;
}

function interpolateFactor(size: number): number {
  const low = Math.floor(size);
  const high = Math.ceil(size);
  const a = HUD_FAMILY_SIZE_FACTORS[low - 1]!;
  const b = HUD_FAMILY_SIZE_FACTORS[high - 1]!;
  return a + (b - a) * (size - low);
}
export function housingVoucherIncomeScope(
  facts: HousingFacts,
  personId: EntityId,
  onDate: IsoDate,
) {
  const membership = (facts.memberships.get(personId) ?? []).find(
    (row) => row.state.residenceRole === "primary",
  );
  if (!membership) return null;
  const householdId = membership.membership.householdId;
  const location = facts.locations.get(householdId);
  if (!location) return null;
  const place = facts.places.get(location.jurisdictionId);
  const stateKey =
    place?.stateJurisdictionKey ?? facts.stateKeys.get(location.jurisdictionId);
  const reference = facts.incomeScope.rows.find(
    (row) => row.jurisdictionKey === stateKey,
  );
  if (!reference) return null;
  const members = facts.members.get(householdId) ?? [];
  const pay = facts.monthlyPay;
  let known = 0;
  let missingAdultIncome = false;
  for (const memberId of members) {
    if (
      ageOnDate(facts.people[memberId]!.birthDate, onDate) <
      facts.incomeScope.adultIncomeMinimumAge
    )
      continue;
    const monthly = pay.get(memberId);
    if (monthly !== undefined) known += monthly * 12;
    else if (
      ageOnDate(facts.people[memberId]!.birthDate, onDate) >=
      facts.incomeScope.adultIncomeMinimumAge
    )
      missingAdultIncome = true;
  }
  const annualIncomeMinor = Math.round(
    missingAdultIncome
      ? Math.max(known, reference.householdIncomeDollars * 100)
      : known,
  );
  const hud = facts.hud.get(location.jurisdictionId);
  const localLimit = hud ? veryLowIncomeLimit(hud, members.length) : null;
  const size = Math.max(1, members.length);
  const factors = facts.incomeScope.familySizeFactors;
  const factor =
    size <= factors.length
      ? factors[size - 1]!
      : factors.at(-1)! +
        facts.incomeScope.eachAdditionalFactor * (size - factors.length);
  const limitMinor = Math.round(
    (localLimit ?? reference.veryLow4Dollars * factor) * 100,
  );
  const memberSet = new Set(members);
  const flows = members
    .flatMap((memberId) => facts.flowsForPerson.get(memberId) ?? [])
    .filter(
      (flow) =>
        flow.startsAt <= onDate &&
        flow.basisKind.startsWith("compensation:") &&
        flow.recipient.kind === "person" &&
        memberSet.has(flow.recipient.personId),
    );
  const latestTerms = flows.flatMap((flow) => {
    const terms = facts.terms.get(flow.id);
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
