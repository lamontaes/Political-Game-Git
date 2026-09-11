import { personName, type EntityId, type World } from "../simulation";
import type { MunicipalGovernment, MunicipalReading } from "../simulation/municipal-government";
import { municipalGovernments } from "../simulation/municipal-government";
import { municipalSeats, type MunicipalRole } from "../simulation/municipal-public-work";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import { municipalWorkspaceFor } from "../presentation/municipal-workspace";

const STATE_NAMES: Readonly<Record<string, string>> = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};

export type MunicipalGovernmentGroup = "home" | "home-state" | "other";

export interface MunicipalGovernmentListEntry {
  readonly key: string;
  readonly displayName: string;
  readonly state: string;
  readonly group: MunicipalGovernmentGroup;
}

export interface MunicipalGovernmentGroupBlock {
  readonly group: MunicipalGovernmentGroup;
  readonly label: string;
  readonly entries: readonly MunicipalGovernmentListEntry[];
}

export interface MunicipalKnownPerson {
  readonly personId: EntityId | null;
  readonly name: string;
  readonly roleLabel: string;
  readonly seatLabel: string | null;
  readonly represented: boolean;
}

export interface MunicipalHomeContext {
  readonly placeLabel: string | null;
  readonly stateCode: string | null;
  readonly stateName: string | null;
  readonly governmentKey: string | null;
  readonly governmentName: string | null;
}

function containsLiteral(value: string, normalizedQuery: string): boolean {
  return value.toLowerCase().includes(normalizedQuery);
}

/** USPS code from a canonical state jurisdiction key such as `US-KY`. */
export function uspsFromStateJurisdictionKey(
  stateJurisdictionKey: string | null | undefined,
): string | null {
  if (!stateJurisdictionKey?.startsWith("US-")) return null;
  const code = stateJurisdictionKey.slice(3);
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function stateDisplayName(stateCode: string | null | undefined): string {
  if (!stateCode) return "Unknown state";
  return STATE_NAMES[stateCode] ?? stateCode;
}

function humanRole(role: MunicipalRole): string {
  switch (role) {
    case "resident":
      return "Resident";
    case "member":
      return "Member";
    case "presiding-member":
      return "Presiding member";
    case "mayor":
      return "Mayor";
    case "professional-manager":
      return "Professional manager";
    case "clerk":
      return "Clerk";
    default:
      return role;
  }
}

function humanLabel(value: string): string {
  const words = value.toLowerCase().replace(/[_-]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Trimmed, case-insensitive literal substring filter over government display fields. */
export function filterMunicipalGovernmentEntries(
  entries: readonly MunicipalGovernmentListEntry[],
  rawQuery: string,
): readonly MunicipalGovernmentListEntry[] {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (normalizedQuery.length === 0) return entries;
  return entries.filter(
    (entry) =>
      containsLiteral(entry.displayName, normalizedQuery) ||
      containsLiteral(entry.state, normalizedQuery) ||
      containsLiteral(stateDisplayName(entry.state), normalizedQuery) ||
      containsLiteral(entry.key, normalizedQuery),
  );
}

export function projectMunicipalHomeContext(world: World): MunicipalHomeContext {
  const capabilities = resolvePlayerCapabilities(world);
  const place = capabilities.homePlace;
  const stateCode = uspsFromStateJurisdictionKey(place?.stateJurisdictionKey);
  const workspace = municipalWorkspaceFor(world);
  const government = workspace?.government ?? null;
  return {
    placeLabel: place?.displayName ?? null,
    stateCode,
    stateName: stateCode ? stateDisplayName(stateCode) : null,
    governmentKey: government?.key ?? null,
    governmentName: government?.displayName ?? null,
  };
}

export function projectMunicipalGovernmentEntries(
  homeGovernmentKey: string | null,
  homeStateCode: string | null,
): readonly MunicipalGovernmentListEntry[] {
  return municipalGovernments().map((government) => {
    let group: MunicipalGovernmentGroup = "other";
    if (homeGovernmentKey && government.key === homeGovernmentKey) {
      group = "home";
    } else if (homeStateCode && government.state === homeStateCode) {
      group = "home-state";
    }
    return {
      key: government.key,
      displayName: government.displayName,
      state: government.state,
      group,
    };
  });
}

export function groupMunicipalGovernmentEntries(
  entries: readonly MunicipalGovernmentListEntry[],
): readonly MunicipalGovernmentGroupBlock[] {
  const groups: MunicipalGovernmentGroupBlock[] = [];
  const home = entries.filter((entry) => entry.group === "home");
  if (home.length > 0) {
    groups.push({
      group: "home",
      label: "Your home government",
      entries: home,
    });
  }
  const homeState = entries.filter((entry) => entry.group === "home-state");
  if (homeState.length > 0) {
    const stateLabel =
      homeState[0] ? stateDisplayName(homeState[0].state) : "your home state";
    groups.push({
      group: "home-state",
      label: `Other governments in ${stateLabel}`,
      entries: homeState,
    });
  }
  const other = entries.filter((entry) => entry.group === "other");
  if (other.length > 0) {
    groups.push({
      group: "other",
      label: "Other supported governments",
      entries: other,
    });
  }
  return groups;
}

export function projectMunicipalKnownPeople(
  world: World,
  government: MunicipalGovernment,
  reading: MunicipalReading | null,
): readonly MunicipalKnownPerson[] {
  const seated = municipalSeats(world, government.key);
  const people: MunicipalKnownPerson[] = seated.map((seat) => ({
    personId: seat.personId,
    name: personName(world.people[seat.personId]!),
    roleLabel: humanRole(seat.role),
    seatLabel: seat.seatLabel,
    represented: true,
  }));
  if (!reading) return people;
  const representedRoles = new Set(seated.map((seat) => seat.role));
  if (reading.mayor && !representedRoles.has("mayor")) {
    people.push({
      personId: null,
      name: "Unknown",
      roleLabel: humanLabel(reading.mayor.structuralPosition),
      seatLabel: null,
      represented: false,
    });
  }
  if (reading.manager && !representedRoles.has("professional-manager")) {
    people.push({
      personId: null,
      name: "Unknown",
      roleLabel: reading.manager.statedRole ?? "Professional manager",
      seatLabel: null,
      represented: false,
    });
  }
  return people;
}

/**
 * Resolve which government key the workspace should inspect.
 *
 * A shell-provided pin opens a government until the player deliberately picks
 * another one here. A later external pin replaces that choice.
 */
export function resolveMunicipalInspectionKey(input: {
  readonly openGovernmentKey?: string;
  readonly selectedKey: string;
  readonly userOverride: boolean;
}): string {
  if (input.userOverride) return input.selectedKey;
  return input.openGovernmentKey ?? input.selectedKey;
}

export function municipalSelectionOnExternalPin(
  openGovernmentKey?: string,
): { readonly selectedKey: string; readonly userOverride: false } {
  return { selectedKey: openGovernmentKey ?? "", userOverride: false };
}

export function municipalSelectionOnUserPick(
  key: string,
): { readonly selectedKey: string; readonly userOverride: true } {
  return { selectedKey: key, userOverride: true };
}
