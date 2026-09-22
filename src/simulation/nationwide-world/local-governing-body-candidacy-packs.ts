import { governmentUnitDisplayName } from "./government-unit-names";
import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { unknownRule } from "../legislature-rules";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";

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
 * Everything a real charter or statute would settle stays UNKNOWN here on
 * purpose: how many seats, whether they are at large or by ward, who may
 * stand, for how long, and whether a mayor is elected separately. Candidacy
 * eligibility reads those from RULES at filing time, so admitting a town's
 * facts changes behavior with no edit to this file. A mayor is deliberately
 * not offered: a directly elected mayor is one form among several, and which
 * form a town has is exactly the fact the game has not read.
 */

export const LOCAL_GOVERNING_BODY_PROFILE_NOTE =
  "The game holds that every town with a government of its own elects its governing body. It has not read this town's charter, so the number of seats, wards, term and who may stand are not known here.";

const QUALIFICATION_AT_FILING =
  "Read from RULES at filing time for this town's governing body; not recorded in this pack.";
const NO_FILING_PROCEDURE =
  "No filing deadline, filing officer, nomination or ballot-access procedure has been read for this town.";
const NO_FORM =
  "The town's form of government has not been read, so whether its seats are at large or by ward, and whether a mayor is elected separately, is not known.";

const OFFICE_PREFIX = "local-government-";
const OFFICE_SUFFIX = "-governing-body";

export interface LocalGoverningBodyIdentity {
  readonly unit: GovernmentUnitIdentity;
  readonly officeKey: string;
  readonly candidacyPackId: string;
  /** "City of Bowling Green", the publisher's name in ordinary capitals. */
  readonly governmentName: string;
  /** "City of Bowling Green governing body". */
  readonly bodyName: string;
}

const displayName = governmentUnitDisplayName;

/**
 * The governing body of one municipal government, or null for anything that
 * is not an active municipality. Counties and townships are not offered here:
 * a township reaches no place today, and a county's board is a separate piece.
 */
export function localGoverningBodyIdentity(
  unit: GovernmentUnitIdentity,
): LocalGoverningBodyIdentity | null {
  if (unit.unitType !== "municipality" || !unit.functionalActive) return null;
  const officeKey = `${OFFICE_PREFIX}${unit.publisherId}${OFFICE_SUFFIX}`;
  const governmentName = displayName(unit);
  return {
    unit,
    officeKey,
    candidacyPackId: `${officeKey}:candidacy`,
    governmentName,
    bodyName: `${governmentName} governing body`,
  };
}

/** The municipal governing body this office key names, or null. */
export function localGoverningBodyIdentityForOfficeKey(
  officeKey: string,
): LocalGoverningBodyIdentity | null {
  if (
    !officeKey.startsWith(OFFICE_PREFIX) ||
    !officeKey.endsWith(OFFICE_SUFFIX)
  )
    return null;
  const publisherId = officeKey.slice(
    OFFICE_PREFIX.length,
    -OFFICE_SUFFIX.length,
  );
  const unit = governmentUnit(`gus2025:${publisherId}`);
  const identity = unit ? localGoverningBodyIdentity(unit) : null;
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
): CandidacyPack {
  const option: ElectiveOfficeOption = {
    officeKey: identity.officeKey,
    chamberName: identity.bodyName,
    office: {
      officeKey: identity.officeKey,
      title: "Member of the governing body",
      seatKey: null,
      occupationClassification: "service:elected-local-official",
    },
    seats: unknownRule(NO_FORM),
    recordedBy: {
      packId: identity.candidacyPackId,
      packName: identity.governmentName,
    },
    qualification: {
      minimumAge: unknownRule(QUALIFICATION_AT_FILING),
      residency: unknownRule(QUALIFICATION_AT_FILING),
      termYears: unknownRule(QUALIFICATION_AT_FILING),
      filing: unknownRule(NO_FILING_PROCEDURE),
    },
    unresolvedGaps: [NO_FORM, NO_FILING_PROCEDURE],
  };
  return {
    packId: identity.candidacyPackId,
    jurisdictionKey: `US-${identity.unit.stateUsps}`,
    displayName: identity.governmentName,
    legislativeRulePackId: identity.unit.id,
    offices: [option],
    // Player-facing: what is not known, never where the listing came from.
    unresolvedGaps: [LOCAL_GOVERNING_BODY_PROFILE_NOTE, NO_FILING_PROCEDURE],
  };
}
