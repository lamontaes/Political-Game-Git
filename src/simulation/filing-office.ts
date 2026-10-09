import filingOffice from "../../data/research/elections/filing-office.json" with { type: "json" };
import { countyGovernmentUnit } from "./government-units";
import type { GovernmentUnitIdentity } from "./government-units";
import { municipalRulePackFor } from "./municipal-election-rule-packs";
import type { ElectionAdministrationModel } from "./municipal-election-rules";
import { localGoverningBodyIdentityForOfficeKey } from "./nationwide-world/local-governing-body-candidacy-packs";
import { localGovernmentDisplayName } from "./nationwide-world/local-governments";
import {
  localClerkTitle,
  sittingLocalClerk,
} from "./living-world/local-government-seats";
import { countyRowOfficeRule } from "./nationwide-world/county-row-offices";
import type { EntityId, World } from "./types";

/**
 * Where a candidate for a local seat files, and who takes the filing.
 *
 * Which government runs a place's local elections is its state's rule
 * (`municipal-election-rule-packs.ts`, read from each state's code): a town's
 * own clerk, the county's election office, either by office, or a statewide
 * board. A territory without a rule pack is read from
 * `data/research/elections/filing-office.json`. A county seat always files with
 * the county; a state whose rule sends filings to the county, but whose town
 * has no county government above it, files with the town itself.
 */
export interface FilingOffice {
  /** The seat being filed for. */
  readonly seatOfficeKey: string;
  /** The government whose clerk takes the filing. */
  readonly unit: GovernmentUnitIdentity;
  readonly governmentName: string;
  readonly clerkTitle: string;
  /** The clerk sitting there today, or null until one is seated. */
  readonly clerkPersonId: EntityId | null;
  readonly administration: ElectionAdministrationModel;
  readonly administrationBasis:
    | { readonly kind: "read"; readonly citation: string }
    | { readonly kind: "estimated"; readonly estimatedFrom: string };
}

type TerritoryRow = {
  readonly administration: ElectionAdministrationModel;
  readonly estimatedFrom: string;
};

function administrationFor(
  stateUsps: string,
): Pick<FilingOffice, "administration" | "administrationBasis"> | null {
  const rule = municipalRulePackFor(stateUsps)?.electoral.administration;
  if (rule?.kind === "known")
    return {
      administration: rule.value,
      administrationBasis: { kind: "read", citation: rule.source.citation },
    };
  const territory = (
    filingOffice.territories as Readonly<Record<string, TerritoryRow>>
  )[stateUsps];
  return territory
    ? {
        administration: territory.administration,
        administrationBasis: {
          kind: "estimated",
          estimatedFrom: territory.estimatedFrom,
        },
      }
    : null;
}

/** The government whose clerk takes a filing for this seat. */
function filingUnit(
  seat: GovernmentUnitIdentity,
  administration: ElectionAdministrationModel,
): GovernmentUnitIdentity {
  if (seat.unitType === "county") return seat;
  if (administration !== "county-election-board-coordinated") return seat;
  const county = seat.countyGeoid
    ? countyGovernmentUnit(seat.countyGeoid)
    : null;
  return county ?? seat;
}

/** Where a filing for this local seat goes, or null for any other office. */
export function filingOfficeForSeat(
  world: World,
  officeKey: string,
): FilingOffice | null {
  const seat = localGoverningBodyIdentityForOfficeKey(officeKey);
  if (!seat) return null;
  const administration = administrationFor(seat.unit.stateUsps);
  if (!administration) return null;
  const unit = filingUnit(seat.unit, administration.administration);
  const clerk = sittingLocalClerk(world, unit);
  return {
    seatOfficeKey: officeKey,
    unit,
    governmentName: localGovernmentDisplayName(unit),
    clerkTitle:
      clerk?.title ??
      (unit.unitType === "county"
        ? countyRowOfficeRule(unit.stateUsps, "clerk").title
        : localClerkTitle(unit)),
    clerkPersonId: clerk?.personId ?? null,
    ...administration,
  };
}
