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
 * Which officer receives a local candidate's papers is read from each state's
 * election code (`filingOfficers` in `data/research/elections/filing-office.json`,
 * for the 33 states whose local elections a county office runs): a town's own
 * clerk or another town officer, or a county office such as the board of
 * elections. Every other state's administration rule
 * (`municipal-election-rule-packs.ts`) has the town's own clerk run its
 * elections, and a territory without a rule pack is read from the same file. A
 * county seat always files with the county; a town seat whose state sends it
 * to the county, but which has no county government above it, files with the
 * town itself.
 */
export interface FilingOffice {
  /** The seat being filed for. */
  readonly seatOfficeKey: string;
  /** The government whose clerk takes the filing. */
  readonly unit: GovernmentUnitIdentity;
  readonly governmentName: string;
  /** The office that receives the filing, as people write it. */
  readonly officeTitle: string;
  /**
   * The title of the official at the counter: the office's own when one
   * officer holds it, or the one a board's staff is read under.
   */
  readonly clerkTitle: string;
  /** Where the officer's title and level were read, when they were. */
  readonly officerCitation: string | null;
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

type OfficerRow = {
  readonly title: string | null;
  /** The title names a board or commission rather than one officer. */
  readonly body?: boolean;
  readonly citation: string;
  readonly url: string;
  /** The official who takes filings at a board's counter, where read. */
  readonly counterTitle?: string;
};

type StateOfficers = {
  readonly municipal: OfficerRow & {
    readonly level: "municipality" | "county";
  };
  readonly county: OfficerRow | null;
};

const OFFICERS = (
  filingOffice.filingOfficers as {
    readonly states: Readonly<Record<string, StateOfficers>>;
  }
).states;

/**
 * The government whose officer takes a filing for this seat, that officer's
 * title where the state names one other than the clerk, and the citation.
 */
function filingUnit(seat: GovernmentUnitIdentity): {
  readonly unit: GovernmentUnitIdentity;
  readonly row: OfficerRow | null;
} {
  const officers = OFFICERS[seat.stateUsps] ?? null;
  if (seat.unitType === "county")
    return { unit: seat, row: officers?.county ?? null };
  const municipal = officers?.municipal ?? null;
  if (municipal?.level === "county") {
    const county = seat.countyGeoid
      ? countyGovernmentUnit(seat.countyGeoid)
      : null;
    // No county government above the town: its own clerk takes the filing.
    return county
      ? { unit: county, row: municipal }
      : { unit: seat, row: null };
  }
  return { unit: seat, row: municipal };
}

/**
 * The government whose counter takes a filing for this seat, by id, read from
 * data alone; null where no counter takes it. The same unit as
 * `filingOfficeForSeat`, for readers that hold no world.
 */
export function filingUnitIdForSeat(officeKey: string): string | null {
  const seat = localGoverningBodyIdentityForOfficeKey(officeKey);
  if (!seat || !administrationFor(seat.unit.stateUsps)) return null;
  return filingUnit(seat.unit).unit.id;
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
  const { unit, row } = filingUnit(seat.unit);
  const ownClerk =
    unit.unitType === "county"
      ? countyRowOfficeRule(unit.stateUsps, "clerk").title
      : localClerkTitle(unit);
  // A board's counter is kept by the official read for it; a board with none
  // read is kept by the government's own clerk.
  const clerkTitle =
    row?.counterTitle ?? (row?.body ? ownClerk : (row?.title ?? ownClerk));
  const clerk = sittingLocalClerk(world, unit, clerkTitle);
  return {
    seatOfficeKey: officeKey,
    unit,
    governmentName: localGovernmentDisplayName(unit),
    officeTitle: row?.title ?? ownClerk,
    clerkTitle,
    officerCitation: row?.citation ?? null,
    clerkPersonId: clerk?.personId ?? null,
    ...administration,
  };
}
