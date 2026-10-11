import type { EntityId, Jurisdiction } from "../../simulation/types";
import type { PlayerOfficeScopeLevel } from "../../simulation/governing/office-consequence";
import type { currentGoverningOffices } from "../../simulation/governing/state-governing";
import type { currentPresidentOf } from "../../simulation/crisis/offices";
import type { projectCongress } from "../../simulation/living-world/congress";
import type { congressSeats } from "../../simulation/living-world/congress-seats";
import type { activeWorkRelationshipsAt } from "../../simulation/life-queries";
export interface OfficeFacts {
  readonly governingOffices: ReturnType<typeof currentGoverningOffices>;
  readonly congress: ReturnType<typeof projectCongress>;
  readonly congressCatalog: ReturnType<typeof congressSeats>;
  readonly seatTitles: Readonly<Record<string, string>>;
  readonly president: ReturnType<typeof currentPresidentOf>;
  readonly workEntries: ReturnType<typeof activeWorkRelationshipsAt>;
  readonly nationalJurisdictionId: EntityId;
  readonly jurisdictions: Readonly<Record<string, Jurisdiction>>;
}
export const OFFICE_EMPLOYMENT_KINDS: readonly string[] = [
  "employment:legislative-member",
  "employment:executive-office",
  "employment:state-agency-director",
  "employment:judicial-office",
];

function jurisdictionOfficeLevel(
  facts: OfficeFacts,
  jurisdictionId: EntityId | null,
): "county" | "town" | "state" | "federal" | null {
  if (jurisdictionId === facts.nationalJurisdictionId) return "federal";
  const kind = jurisdictionId
    ? facts.jurisdictions[jurisdictionId]?.kind
    : undefined;
  if (!kind) return null;
  if (kind === "state-placeholder" || kind === "state") return "state";
  if (kind.startsWith("territory")) return "state";
  if (kind === "county") return "county";
  if (["municipality", "city", "town", "borough"].includes(kind)) return "town";
  return null;
}

function workOfficeLevel(
  facts: OfficeFacts,
  kind: string,
  officeKey: string,
  jurisdictionId: EntityId | null,
): PlayerOfficeScopeLevel | null {
  if (kind === "employment:judicial-office") return "judicial";
  const jurisdictionLevel = jurisdictionOfficeLevel(facts, jurisdictionId);
  if (kind === "employment:legislative-member") {
    if (officeKey.startsWith("us-house:") || officeKey.startsWith("us-senate:"))
      return "congress";
    if (jurisdictionLevel === "state") return "state-legislature";
    if (jurisdictionLevel === "county") return "county";
    if (jurisdictionLevel === "town") return "town";
    return null;
  }
  if (
    kind === "employment:executive-office" ||
    kind === "employment:state-agency-director"
  ) {
    if (jurisdictionLevel === "federal") return "federal-executive";
    if (jurisdictionLevel === "state") return "state-executive";
    if (jurisdictionLevel === "county") return "county";
    if (jurisdictionLevel === "town") return "town";
    return null;
  }
  if (kind.startsWith("office:")) {
    if (jurisdictionLevel === "county") return "county";
    if (jurisdictionLevel === "town") return "town";
    if (jurisdictionLevel === "state") return "state-executive";
    if (jurisdictionLevel === "federal") return "federal-executive";
  }
  return null;
}

export function officesHeldBy(
  facts: OfficeFacts,
  personId: EntityId,
): readonly {
  readonly officeKey: string;
  readonly title: string;
}[] {
  const held: {
    officeKey: string;
    title: string;
  }[] = [];
  for (const office of facts.governingOffices)
    if (office.holderPersonId === personId)
      held.push({ officeKey: office.officeKey, title: office.title });
  const congress = facts.congress;
  for (const chamber of congress ? [congress.house, congress.senate] : [])
    for (const seat of chamber.seats)
      if (
        seat.occupant.kind === "member" &&
        seat.occupant.member.personId === personId
      ) {
        const known = facts.congressCatalog.find(
          (candidate) => candidate.seatKey === seat.seatKey,
        );
        held.push({
          officeKey: seat.seatKey,
          title: known
            ? (facts.seatTitles[known.seatKey] ?? known.seatKey)
            : seat.seatKey,
        });
      }
  for (const entry of facts.workEntries) {
    const title = entry.role.title;
    const officeKey = entry.relationship.stableKey;
    if (!title || !officeKey) continue;
    if (
      OFFICE_EMPLOYMENT_KINDS.includes(entry.relationship.kind) ||
      entry.relationship.kind.startsWith("office:")
    )
      held.push({ officeKey, title });
  }
  return held;
}

export function playerOfficeScope(
  facts: OfficeFacts,
  personId: EntityId,
): readonly {
  readonly officeKey: string;
  readonly title: string;
  readonly jurisdictionId: EntityId | null;
  readonly level: PlayerOfficeScopeLevel;
}[] {
  const scopes: {
    officeKey: string;
    title: string;
    jurisdictionId: EntityId | null;
    level: PlayerOfficeScopeLevel;
  }[] = [];
  for (const office of facts.governingOffices)
    if (office.holderPersonId === personId) {
      const jurisdictionLevel = jurisdictionOfficeLevel(
        facts,
        office.jurisdictionId,
      );
      const level: PlayerOfficeScopeLevel =
        office.programOffice?.kind === "municipal"
          ? jurisdictionLevel === "county"
            ? "county"
            : "town"
          : office.programOffice?.kind === "federal-executive"
            ? "federal-executive"
            : "state-executive";
      scopes.push({
        officeKey: office.officeKey,
        title: office.title,
        jurisdictionId: office.jurisdictionId,
        level,
      });
    }
  const president = facts.president;
  if (president?.personId === personId)
    scopes.push({
      officeKey: president.officeKey,
      title: president.title,
      jurisdictionId: facts.nationalJurisdictionId,
      level: "federal-executive",
    });
  const congress = facts.congress;
  for (const chamber of congress ? [congress.house, congress.senate] : [])
    for (const seat of chamber.seats)
      if (
        seat.occupant.kind === "member" &&
        seat.occupant.member.personId === personId
      ) {
        const known = facts.congressCatalog.find(
          (candidate) => candidate.seatKey === seat.seatKey,
        );
        scopes.push({
          officeKey: seat.seatKey,
          title: known
            ? (facts.seatTitles[known.seatKey] ?? known.seatKey)
            : seat.seatKey,
          jurisdictionId: facts.nationalJurisdictionId,
          level: "congress",
        });
      }
  for (const entry of facts.workEntries) {
    const title = entry.role.title;
    const officeKey = entry.relationship.stableKey;
    if (!title || !officeKey) continue;
    if (
      OFFICE_EMPLOYMENT_KINDS.includes(entry.relationship.kind) ||
      entry.relationship.kind.startsWith("office:")
    ) {
      const jurisdictionId = entry.role.locationJurisdictionId;
      const level = workOfficeLevel(
        facts,
        entry.relationship.kind,
        officeKey,
        jurisdictionId,
      );
      if (!level) continue;
      scopes.push({
        officeKey,
        title,
        jurisdictionId,
        level,
      });
    }
  }
  return scopes;
}
