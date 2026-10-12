/** Raw saved records and separately owned officer, council and compiled tax/authority receipts. */
import {
  countyGovernmentUnit,
  type GovernmentUnitIdentity,
} from "../../../simulation/government-units";
import { sittingLocalOfficers } from "../../../simulation/living-world/local-government-seats";
import { councilRules } from "../../../simulation/living-world/local-council-binding";
import { localFiscalAuthorityFor } from "../../../simulation/local-fiscal-authority";
import {
  localTaxGovernment,
  localTaxPowerEvidenceFor,
} from "../../../simulation/local-tax-authority";
import { budgetMonthFacts } from "./budget-month-facts";
import { housingFacts } from "./housing-facts";
import {
  countyHearingSourceKey,
  type CountyHearingFacts,
} from "../county-hearings";
import type { World } from "../../../simulation/types";
export function countyHearingFacts(
  world: World,
  extra: readonly GovernmentUnitIdentity[] = [],
  agenda?: { ok: boolean; reason: string; world: World },
): CountyHearingFacts {
  const units = [
    ...new Map(
      [
        ...extra,
        ...(world.publicBudgets?.governments ?? []).flatMap((g) =>
          g.level === "county"
            ? [countyGovernmentUnit(g.key.slice(7))].filter(
                (u): u is GovernmentUnitIdentity => !!u,
              )
            : [],
        ),
      ].map((u) => [u.id, u]),
    ).values(),
  ];
  const officers = new Map(
    units.map((u) => [u.id, sittingLocalOfficers(world, u)]),
  );
  const fiscal = new Map<string, ReturnType<typeof localFiscalAuthorityFor>>();
  const taxPower = new Map<
    string,
    ReturnType<typeof localTaxPowerEvidenceFor>
  >();
  for (const u of units) {
    for (const control of [
      world.control,
      ...officers
        .get(u.id)!
        .map((o) => ({ kind: "person" as const, personId: o.personId })),
    ]) {
      const key = "us-tax-terms:county.property-tax-terms";
      fiscal.set(
        countyHearingSourceKey(control, u.id, key, "typed-proposal"),
        localFiscalAuthorityFor(
          { ...world, control },
          u.id,
          key,
          "typed-proposal",
        ),
      );
    }
    const gov = localTaxGovernment(u.id);
    if (gov) {
      const input = {
        asOf: world.currentDate,
        ...gov,
        governmentKey: u.id,
        instrument: "property" as const,
      };
      taxPower.set(
        countyHearingSourceKey(input),
        localTaxPowerEvidenceFor(input),
      );
    }
  }
  return {
    id: world.id,
    startedAt: world.startedAt,
    currentDate: world.currentDate,
    records: world.history,
    control: world.control,
    policyCatalog: world.policyCatalog,
    publicBudgets: world.publicBudgets,
    budget: budgetMonthFacts(
      world,
      units.map((u) => u.id as never),
      [world.currentDate],
    ),
    housing: housingFacts(world),
    officers,
    council: new Map(units.map((u) => [u.id, councilRules(u)])),
    fiscal,
    taxGovernment: new Map(units.map((u) => [u.id, localTaxGovernment(u.id)])),
    taxPower,
    agendaResponse: () => {
      if (!agenda) throw Error("No common agenda receipt");
      return { ...agenda, facts: countyHearingFacts(agenda.world, extra) };
    },
  };
}
