import { governmentUnitDisplayName } from "./government-unit-names";
import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { knownRule, unknownRule } from "../legislature-rules";
import {
  municipalMinimumAgeEstimate,
  municipalMinimumAgeSource,
} from "../municipal-qualification-estimate";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";
import { localChiefExecutiveRules } from "./local-chief-executive-rules";
import { countyGoverningBodyRules } from "./county-governing-body-rules";
import { localGoverningBodyName } from "./local-governing-body-names";
import {
  COUNTY_ROW_OFFICE_KEYS,
  countyElectedRowOffices,
  type CountyRowOfficeKey,
} from "./county-row-offices";

/**
 * A town's own governing body as a candidacy pack, for every municipal
 * government the Census 2025 Government Units listing records.
 *
 * The same shape as `state-executive-candidacy-packs.ts`, one level down, and
 * a leaf like it: no places, no World. What it says is small. The listing
 * establishes that this municipal government exists; the game then holds, as
 * its own disclosed profile, that a general-purpose municipal government has a
 * governing body its residents elect. That is the one thing this file adds,
 * and it is labeled as the game's, not the law's.
 *
 * An unread municipal minimum age uses a disclosed estimate from the same
 * state's other elected offices. It does not establish municipal law. Seat
 * count, wards, residence, term and filing remain unresolved; dated admitted
 * rules take precedence over the estimate at filing time.
 *
 * A mayor is offered where the town elects one directly
 * (`local-chief-executive-rules.ts`): read where the town's government was
 * read, and otherwise drawn from ICMA's national shares, which ChatGPT
 * supplied on 2026-09-22. This file used to leave the mayor out because which
 * form a town has had not been read; that answer is what lets it in now.
 */

export const LOCAL_GOVERNING_BODY_PROFILE_NOTE =
  "The game holds that every town with a government of its own elects its governing body. The town's seat count, districts, residence requirements and term are unconfirmed. An estimated minimum age does not settle those requirements.";

const QUALIFICATION_AT_FILING =
  "The age and residence requirements for this municipal office are unconfirmed.";
const NO_FILING_PROCEDURE =
  "No filing deadline, filing officer, nomination or ballot-access procedure has been read for this town.";
const NO_FORM =
  "The town's form of government has not been read, so whether its seats are at large or by district, and whether a mayor is elected separately, is not known.";

const MAYOR_FORM =
  "The town elects one mayor. Its charter has not been read, so the mayor's powers and who may stand are not known here.";
const NO_MAYOR_FILING =
  "No filing deadline, filing officer, nomination or ballot-access procedure has been read for this town's mayor.";

const OFFICE_PREFIX = "local-government-";
const OFFICE_SUFFIX = "-governing-body";
const CHIEF_SUFFIX = "-chief-executive";
const ROW_INFIX = "-row-";

/**
 * Which of a government's elected offices: a seat on its body, its mayor, or
 * one of a county's row offices (`county-row-offices.ts`).
 */
export type LocalElectedSeat =
  "governing-body" | "chief-executive" | "row-office";

export interface LocalGoverningBodyIdentity {
  readonly unit: GovernmentUnitIdentity;
  readonly seat: LocalElectedSeat;
  readonly officeKey: string;
  readonly candidacyPackId: string;
  /** "City of Bowling Green", the publisher's name in ordinary capitals. */
  readonly governmentName: string;
  /**
   * "Seattle City Council" or "Anchorage Assembly" (`local-governing-body-names.ts`),
   * or for a mayor the government itself, since a mayor sits on no body of that name.
   */
  readonly bodyName: string;
  /** "Council member", "Trustee", or the mayor's title, such as "Mayor". */
  readonly officeTitle: string;
  /** Which row office this is, where the seat is a county row office. */
  readonly rowOffice?: CountyRowOfficeKey;
}

const displayName = governmentUnitDisplayName;

/**
 * The governing body of an active municipal or county government. A county
 * keeps its recorded body name and member title. Identity does not establish
 * an election calendar, district residence or eligibility; those remain rules.
 */
export function localGoverningBodyIdentity(
  unit: GovernmentUnitIdentity,
): LocalGoverningBodyIdentity | null {
  if (!unit.functionalActive) return null;
  if (unit.unitType !== "municipality" && unit.unitType !== "county")
    return null;
  const officeKey = `${OFFICE_PREFIX}${unit.publisherId}${OFFICE_SUFFIX}`;
  const governmentName = displayName(unit);
  // Display only: the office key above never depends on the body's name.
  const body =
    unit.unitType === "county"
      ? countyGoverningBodyRules(unit)
      : localGoverningBodyName(unit);
  if (!body) return null;
  return {
    unit,
    seat: "governing-body",
    officeKey,
    candidacyPackId: `${officeKey}:candidacy`,
    governmentName,
    bodyName: body.bodyName,
    officeTitle: body.memberTitle,
  };
}

/**
 * The town's mayor as an office anybody may file for, or null where the town
 * does not elect one directly (its council chooses, or it is not a town).
 */
export function localChiefExecutiveIdentity(
  unit: GovernmentUnitIdentity,
): LocalGoverningBodyIdentity | null {
  const rules = localChiefExecutiveRules(unit);
  if (!rules?.directlyElected.value) return null;
  const officeKey = `${OFFICE_PREFIX}${unit.publisherId}${CHIEF_SUFFIX}`;
  const governmentName = displayName(unit);
  return {
    unit,
    seat: "chief-executive",
    officeKey,
    candidacyPackId: `${officeKey}:candidacy`,
    governmentName,
    bodyName: governmentName,
    officeTitle: rules.title.value,
  };
}

/**
 * A county row office the county elects (sheriff, prosecutor, clerk,
 * treasurer, assessor or coroner), or null where its state does not elect it.
 */
export function localRowOfficeIdentity(
  unit: GovernmentUnitIdentity,
  office: CountyRowOfficeKey,
): LocalGoverningBodyIdentity | null {
  const rule = countyElectedRowOffices(unit).find(
    (row) => row.office === office,
  );
  if (!rule) return null;
  const officeKey = `${OFFICE_PREFIX}${unit.publisherId}${ROW_INFIX}${office}`;
  const governmentName = displayName(unit);
  return {
    unit,
    seat: "row-office",
    officeKey,
    candidacyPackId: `${officeKey}:candidacy`,
    governmentName,
    bodyName: governmentName,
    officeTitle: rule.title,
    rowOffice: office,
  };
}

/**
 * A government's elected offices: its governing body, then its mayor if
 * elected, then (for a county) each row office its state elects.
 */
export function localElectedOffices(
  unit: GovernmentUnitIdentity,
): readonly LocalGoverningBodyIdentity[] {
  return [
    localGoverningBodyIdentity(unit),
    localChiefExecutiveIdentity(unit),
    ...COUNTY_ROW_OFFICE_KEYS.map((office) =>
      localRowOfficeIdentity(unit, office),
    ),
  ].filter((identity) => identity !== null);
}

/** The town office (governing body or mayor) this office key names, or null. */
export function localGoverningBodyIdentityForOfficeKey(
  officeKey: string,
): LocalGoverningBodyIdentity | null {
  if (!officeKey.startsWith(OFFICE_PREFIX)) return null;
  const rowAt = officeKey.lastIndexOf(ROW_INFIX);
  const rowOffice =
    rowAt < 0 ? null : officeKey.slice(rowAt + ROW_INFIX.length);
  const rowKey = COUNTY_ROW_OFFICE_KEYS.find((key) => key === rowOffice);
  const suffix = rowKey
    ? `${ROW_INFIX}${rowKey}`
    : officeKey.endsWith(OFFICE_SUFFIX)
      ? OFFICE_SUFFIX
      : officeKey.endsWith(CHIEF_SUFFIX)
        ? CHIEF_SUFFIX
        : null;
  if (!suffix) return null;
  const publisherId = officeKey.slice(OFFICE_PREFIX.length, -suffix.length);
  const unit = governmentUnit(`gus2025:${publisherId}`);
  if (!unit) return null;
  const identity = rowKey
    ? localRowOfficeIdentity(unit, rowKey)
    : suffix === OFFICE_SUFFIX
      ? localGoverningBodyIdentity(unit)
      : localChiefExecutiveIdentity(unit);
  return identity?.officeKey === officeKey ? identity : null;
}

export function localGoverningBodyIdentityForPackId(
  packId: string,
): LocalGoverningBodyIdentity | null {
  if (!packId.endsWith(":candidacy")) return null;
  return localGoverningBodyIdentityForOfficeKey(
    packId.slice(0, -":candidacy".length),
  );
}

export function localGoverningBodyCandidacyPack(
  identity: LocalGoverningBodyIdentity,
  similarOffices: CandidacyPack | null = null,
): CandidacyPack {
  const mayor = identity.seat !== "governing-body";
  const county = identity.unit.unitType === "county";
  // A county board's age stays unread; a row office (sheriff, clerk, ...) takes
  // the same disclosed estimate a town office does, from the state's other
  // elected offices, so a resident can stand for one.
  const estimate =
    county && identity.seat !== "row-office"
      ? null
      : municipalMinimumAgeEstimate(
          `US-${identity.unit.stateUsps}`,
          identity.officeKey,
          similarOffices,
        );
  const form = county
    ? "This county's district boundaries, seat phases and selection procedure have not been recorded in this candidacy pack."
    : mayor
      ? MAYOR_FORM
      : NO_FORM;
  const filing = county
    ? "This county's nomination and filing procedure must be read before a campaign can use its calendar."
    : mayor
      ? NO_MAYOR_FILING
      : NO_FILING_PROCEDURE;
  const qualification = county
    ? "This county office's qualifications and term must be read from its own rules at filing."
    : QUALIFICATION_AT_FILING;
  const option: ElectiveOfficeOption = {
    officeKey: identity.officeKey,
    chamberName: identity.bodyName,
    office: {
      officeKey: identity.officeKey,
      title: identity.officeTitle,
      seatKey: null,
      occupationClassification: "service:elected-local-official",
    },
    seats: unknownRule(form),
    recordedBy: {
      packId: identity.candidacyPackId,
      packName: identity.governmentName,
    },
    qualification: {
      minimumAge: estimate
        ? knownRule(estimate.minimumAge, municipalMinimumAgeSource(estimate))
        : unknownRule(qualification),
      ...(estimate ? { minimumAgeEstimate: estimate } : {}),
      residency: unknownRule(qualification),
      termYears: unknownRule(qualification),
      filing: unknownRule(filing),
    },
    unresolvedGaps: mayor ? [filing] : [form, filing],
  };
  return {
    packId: identity.candidacyPackId,
    jurisdictionKey: `US-${identity.unit.stateUsps}`,
    displayName: identity.governmentName,
    legislativeRulePackId: identity.unit.id,
    offices: [option],
    // Player-facing: what is not known, never where the listing came from.
    unresolvedGaps: county
      ? [form, filing]
      : [LOCAL_GOVERNING_BODY_PROFILE_NOTE, NO_FILING_PROCEDURE],
  };
}
