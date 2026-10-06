import table from "../../data/content/economy-visibility.json";
import type {
  PlayerOfficeLevel,
  PlayerOfficeScopeEntry,
} from "../simulation/governing/office-consequence";
import type { EntityId } from "../simulation/types";
import { NATIONAL_ELECTION_JURISDICTION } from "../simulation/national-election-geography";

export type EconomyProjection =
  | "personal-money"
  | "home-town-conditions"
  | "local-paper-budget-stories"
  | "public-budget"
  | "fiscal-notes"
  | "program-lines"
  | "account-history"
  | "state-bill-fiscal-notes"
  | "state-macro-series"
  | "federal-budget-categories"
  | "national-macro-series";

export type LookItUp = "full" | "summary" | "none";

interface VisibilityRow {
  readonly lookItUp: LookItUp;
  readonly mount: readonly EconomyProjection[];
  readonly jurisdiction: "home-town" | "office" | "state" | "federal" | "none";
}

export const ECONOMY_VISIBILITY = table as Record<string, VisibilityRow>;

export interface EconomyVisibility {
  readonly mount: ReadonlySet<EconomyProjection>;
  readonly jurisdictions: ReadonlyMap<EntityId, LookItUp>;
  readonly lookItUp: LookItUp;
  readonly lookItUpFor: (jurisdictionId: EntityId) => LookItUp;
}

/** Union the public projections and exact jurisdictions available to offices. */
export function economyVisibilityFor(
  offices: readonly PlayerOfficeScopeEntry[],
  residentJurisdictionId?: EntityId | null,
  residentJurisdictionKind?: string | null,
): EconomyVisibility {
  const mount = new Set<EconomyProjection>();
  const jurisdictions = new Map<EntityId, LookItUp>();
  const rows: VisibilityRow[] = [];
  const residentHasHomeTown =
    residentJurisdictionId &&
    !["state", "federal", "territory"].some((prefix) =>
      residentJurisdictionKind?.startsWith(prefix),
    );
  if (residentHasHomeTown) {
    const row = ECONOMY_VISIBILITY.resident!;
    rows.push(row);
    jurisdictions.set(residentJurisdictionId, row.lookItUp);
  }
  for (const office of offices) {
    const row = rowForLevel(office.level, office.title);
    rows.push(row);
    const jurisdictionId =
      row.jurisdiction === "federal"
        ? NATIONAL_ELECTION_JURISDICTION.id
        : office.jurisdictionId;
    const old = jurisdictions.get(jurisdictionId);
    jurisdictions.set(jurisdictionId, mostOpen(old, row.lookItUp));
  }
  for (const row of rows)
    for (const projection of row.mount) mount.add(projection);
  return {
    mount,
    jurisdictions,
    lookItUp: rows.reduce<LookItUp>(
      (best, row) => mostOpen(best, row.lookItUp),
      "none",
    ),
    lookItUpFor: (jurisdictionId) =>
      jurisdictions.get(jurisdictionId) ?? "none",
  };
}

function rowForLevel(level: PlayerOfficeLevel, title: string): VisibilityRow {
  if (level === "town")
    return /mayor|executive/i.test(title)
      ? ECONOMY_VISIBILITY.mayor!
      : ECONOMY_VISIBILITY.town!;
  if (level === "county")
    return /executive|county executive/i.test(title)
      ? ECONOMY_VISIBILITY["county-executive"]!
      : ECONOMY_VISIBILITY.county!;
  if (level === "state-legislature") return ECONOMY_VISIBILITY[level]!;
  if (level === "state-executive")
    return /governor/i.test(title)
      ? ECONOMY_VISIBILITY.governor!
      : ECONOMY_VISIBILITY[level]!;
  if (level === "congress") return ECONOMY_VISIBILITY.congress!;
  if (level === "federal-executive") return ECONOMY_VISIBILITY[level]!;
  return ECONOMY_VISIBILITY.judicial!;
}

function mostOpen(a: LookItUp | undefined, b: LookItUp): LookItUp {
  const rank: Record<LookItUp, number> = { none: 0, summary: 1, full: 2 };
  return !a || rank[b] > rank[a] ? b : a;
}
