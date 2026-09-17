/**
 * Political map read model. Pure: World in, display facts out.
 *
 * Geometry says where a district is. Everything this module adds — who holds
 * a seat, which party, which contest, how the player relates to a place —
 * is read from the live World on the selected date. Missing facts stay
 * missing and say why; nothing is colored as zero, vacant, or a default
 * party because a record is absent.
 */

import { districtIdentityCatalog } from "../districts/catalog";
import { placeDistrictJoin } from "../districts/place-membership";
import { districtRecordId } from "../districts/query";
import type { DistrictChamber } from "../districts/types";
import { makeIsoDate } from "../simulation/dates";
import { electionContestResult } from "../simulation/election-contests";
import { activeLegislativeTermEvidence } from "../simulation/legislative-office-terms";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import {
  congressSeatTitle,
  livingWorldEstablished,
  projectCongress,
  type CongressView,
  type SeatOccupant,
  type SeatView,
} from "../simulation/living-world";
import { US_STATE_NAMES } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { currentStateExecutiveHolders } from "../simulation/nationwide-world/state-executives";
import { PLACE_COUNTY_RELATIONS_ROWS } from "../simulation/place-county-relations.generated";
import { desiredDistrictBinding } from "../simulation/district-residence";
import { personName } from "../simulation/people";
import type { EntityId, IsoDate, World } from "../simulation/types";
import type { MapLayerId } from "./geometry-types";
import candidates from "./data/membership-candidates.generated.json" with { type: "json" };
import { proseDate } from "../presentation/prose-dates";
import { partyNameAt, partySlots, type PartySlot } from "./party-palette";

/* ------------------------------------------------------------------ */
/* Modes                                                               */
/* ------------------------------------------------------------------ */

/** What the map is colored by. Each mode names exactly one drawn layer. */
export type MapMode =
  "house" | "senate" | "state-upper" | "state-lower" | "county" | "place";

export const MAP_MODE_LAYER: Readonly<Record<MapMode, MapLayerId>> = {
  house: "congressional",
  senate: "state",
  "state-upper": "state-upper",
  "state-lower": "state-lower",
  county: "county",
  place: "place",
};

export const MAP_MODE_LABEL: Readonly<Record<MapMode, string>> = {
  house: "U.S. House districts",
  senate: "U.S. Senate delegations",
  "state-upper": "State senate districts",
  "state-lower": "State house districts",
  county: "Counties",
  place: "Cities and towns",
};

/** Modes that need a focused state because their detail lives in its pack. */
export const STATE_ONLY_MODES: ReadonlySet<MapMode> = new Set([
  "state-upper",
  "state-lower",
  "county",
  "place",
]);

const CHAMBER_FOR_MODE: Partial<Record<MapMode, DistrictChamber>> = {
  house: "congressional",
  "state-upper": "state-upper",
  "state-lower": "state-lower",
};

/* ------------------------------------------------------------------ */
/* Fills                                                               */
/* ------------------------------------------------------------------ */

export type RegionFill =
  /** Every recorded holder shares this public party affiliation. */
  | { readonly kind: "party"; readonly organizationId: EntityId }
  /** A seated holder with no public party affiliation on record. */
  | { readonly kind: "no-party" }
  /** Holders differ (a split delegation, or a seat plus a vacancy). */
  | { readonly kind: "mixed"; readonly parts: readonly RegionFill[] }
  | { readonly kind: "vacant" }
  /** A term ended and the save records no successor either way. */
  | { readonly kind: "no-current-record" }
  /** The save keeps no roster for this office at all. */
  | { readonly kind: "not-recorded" }
  /** The area elects no voting member of this body (D.C. in Congress). */
  | { readonly kind: "no-voting-seat" }
  /** A geography layer (county, place) that carries no political fill. */
  | { readonly kind: "geography" };

export type LegendKey =
  | { readonly kind: "party"; readonly organizationId: EntityId }
  | { readonly kind: Exclude<RegionFill["kind"], "party" | "mixed"> }
  | { readonly kind: "mixed" };

export interface LegendEntry {
  readonly key: string;
  readonly fill: LegendKey;
  readonly label: string;
  readonly description: string;
  readonly count: number;
  readonly slot?: PartySlot;
}

export function fillKey(fill: RegionFill): string {
  if (fill.kind === "party") return `party:${fill.organizationId}`;
  if (fill.kind === "mixed") return "mixed";
  return fill.kind;
}

/* ------------------------------------------------------------------ */
/* Office lines                                                        */
/* ------------------------------------------------------------------ */

export interface HolderFacts {
  readonly personId: EntityId;
  readonly name: string;
  readonly partyOrganizationId: EntityId | null;
  readonly partyName: string | null;
  readonly caucusOrganizationId: EntityId | null;
  readonly termStartedAt: IsoDate | null;
  readonly termEndsBefore: IsoDate | null;
  readonly serviceSince: IsoDate | null;
}

export type OfficeStatus =
  | { readonly kind: "held"; readonly holder: HolderFacts }
  | { readonly kind: "vacant"; readonly since: IsoDate }
  | { readonly kind: "no-current-record"; readonly lastTermEnded: IsoDate }
  | { readonly kind: "not-recorded"; readonly reason: string }
  | { readonly kind: "no-voting-seat"; readonly reason: string };

export interface OfficeLine {
  readonly key: string;
  readonly title: string;
  readonly status: OfficeStatus;
  /** Where the fact came from, in words a player can read. */
  readonly basis: string;
}

export interface ContestLine {
  readonly contestId: EntityId;
  readonly title: string;
  readonly electionDate: IsoDate;
  readonly state: "scheduled" | "resolved";
  readonly candidates: readonly {
    readonly personId: EntityId;
    readonly name: string;
    readonly partyOrganizationId: EntityId | null;
    readonly votes: number | null;
    readonly voteShare: number | null;
    readonly won: boolean;
  }[];
  /** Results in a save are simulated, never real certified returns. */
  readonly basis: string;
}

export interface RegionSummary {
  readonly geoid: string;
  readonly fill: RegionFill;
  /** One plain sentence for the list view and the accessible name. */
  readonly summary: string;
  readonly holderPersonIds: readonly EntityId[];
}

/* ------------------------------------------------------------------ */
/* Player geography                                                    */
/* ------------------------------------------------------------------ */

export interface MapPlaceRef {
  readonly layer: "state" | "county" | "place";
  readonly geoid: string;
  readonly stateUsps: string;
  readonly label: string;
}

export type DistrictRelation =
  | {
      readonly kind: "known";
      readonly geoid: string;
      readonly method: string;
    }
  | {
      readonly kind: "candidates";
      readonly geoids: readonly string[];
      readonly method: string;
    }
  | { readonly kind: "unknown"; readonly reason: string };

export interface PlayerGeography {
  readonly home: MapPlaceRef | null;
  readonly homeLabel: string | null;
  readonly here: MapPlaceRef | null;
  readonly hereLabel: string | null;
  readonly homeDistricts: Readonly<Record<DistrictChamber, DistrictRelation>>;
  readonly seats: readonly {
    readonly chamber: DistrictChamber | "senate";
    readonly geoid: string;
    readonly title: string;
  }[];
  readonly seeking: {
    readonly chamber: DistrictChamber;
    readonly geoid: string;
  } | null;
}

/* ------------------------------------------------------------------ */
/* Date                                                                */
/* ------------------------------------------------------------------ */

export interface MapDate {
  readonly asOf: IsoDate;
  readonly isHistorical: boolean;
}

export function resolveMapDate(world: World, asOf?: string | null): MapDate {
  if (!asOf) return { asOf: world.currentDate, isHistorical: false };
  const date = makeIsoDate(asOf);
  const clamped = date > world.currentDate ? world.currentDate : date;
  return { asOf: clamped, isHistorical: clamped < world.currentDate };
}

/** The earliest date the history slider offers: the save's recorded start. */
export function earliestMapDate(world: World): IsoDate {
  const opening = world.history.events.find(
    (event) => event.type === "setup.living-world-opening",
  );
  const candidates = [
    opening?.occurredAt,
    ...world.history.events
      .filter((event) => event.type === "world.legislative-seat-tenure")
      .map((event) => event.occurredAt),
  ].filter((value): value is IsoDate => Boolean(value));
  const earliest = candidates.sort()[0];
  return earliest && earliest < world.currentDate
    ? earliest
    : world.currentDate;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const FIPS_BY_USPS: Readonly<Record<string, string>> = (() => {
  const table: Record<string, string> = {};
  for (const identity of districtIdentityCatalog()) {
    table[identity.stateUsps] = identity.stateFips;
  }
  table.DC = "11";
  return table;
})();

export function stateFipsForUsps(usps: string): string | null {
  return FIPS_BY_USPS[usps] ?? null;
}

export function stateNameForUsps(usps: string): string {
  if (usps === "DC") return "District of Columbia";
  return US_STATE_NAMES[usps as keyof typeof US_STATE_NAMES] ?? usps;
}

function houseSeatGeoid(seat: SeatView): string | null {
  const fips = stateFipsForUsps(seat.stateUsps);
  return fips && seat.district ? `${fips}${seat.district}` : null;
}

function holderFacts(
  world: World,
  occupant: Extract<SeatOccupant, { kind: "member" }>,
  asOf: IsoDate,
): HolderFacts {
  const member = occupant.member;
  return {
    personId: member.personId,
    name: member.personName,
    partyOrganizationId: member.partyOrganizationId,
    partyName: member.partyOrganizationId
      ? partyNameAt(world, member.partyOrganizationId, asOf)
      : null,
    caucusOrganizationId: member.caucusOrganizationId,
    termStartedAt: member.startedAt,
    termEndsBefore: member.endExclusive,
    serviceSince: member.serviceSince,
  };
}

function occupantStatus(
  world: World,
  occupant: SeatOccupant,
  asOf: IsoDate,
): OfficeStatus {
  switch (occupant.kind) {
    case "member":
      return { kind: "held", holder: holderFacts(world, occupant, asOf) };
    case "vacancy":
      return { kind: "vacant", since: occupant.since };
    case "no-current-record":
      return {
        kind: "no-current-record",
        lastTermEnded: occupant.lastTermEnded,
      };
  }
}

function statusFill(status: OfficeStatus): RegionFill {
  switch (status.kind) {
    case "held":
      return status.holder.partyOrganizationId
        ? { kind: "party", organizationId: status.holder.partyOrganizationId }
        : { kind: "no-party" };
    case "vacant":
      return { kind: "vacant" };
    case "no-current-record":
      return { kind: "no-current-record" };
    case "not-recorded":
      return { kind: "not-recorded" };
    case "no-voting-seat":
      return { kind: "no-voting-seat" };
  }
}

function combineFills(fills: readonly RegionFill[]): RegionFill {
  if (fills.length === 0) return { kind: "not-recorded" };
  const keys = new Set(fills.map(fillKey));
  if (keys.size === 1) return fills[0] as RegionFill;
  return { kind: "mixed", parts: fills };
}

/** Compact status for list rows: the holder, not the office title again. */
function statusShort(status: OfficeStatus): string {
  switch (status.kind) {
    case "held":
      return `${status.holder.name} · ${status.holder.partyName ?? "no party affiliation"}`;
    case "vacant":
      return `Vacant since ${proseDate(status.since)}`;
    case "no-current-record":
      return "No current record";
    case "not-recorded":
      return "Not recorded in this save";
    case "no-voting-seat":
      return "No voting seat";
  }
}

const CONGRESS_BASIS =
  "This save's congressional roll. People and parties are fictional; district identity is the Census 119th Congress.";
const NO_ROSTER_REASON =
  "This save keeps no roster for this chamber. Only seats won through a contest the save ran are recorded.";
const DC_HOUSE_REASON =
  "The District of Columbia elects a non-voting Delegate. The save's House roll records voting seats only.";
const DC_SENATE_REASON =
  "The District of Columbia has no seats in the U.S. Senate.";

/* ------------------------------------------------------------------ */
/* Public projection                                                   */
/* ------------------------------------------------------------------ */

export interface PoliticalMapModel {
  readonly date: MapDate;
  readonly mode: MapMode;
  readonly stateUsps: string | null;
  readonly established: boolean;
  readonly regions: ReadonlyMap<string, RegionSummary>;
  readonly legend: readonly LegendEntry[];
  readonly partySlots: ReadonlyMap<EntityId, PartySlot>;
  readonly notes: readonly string[];
}

interface ProjectionContext {
  readonly world: World;
  readonly date: MapDate;
  readonly congress: CongressView | null;
}

const congressCache = new WeakMap<World, Map<string, CongressView | null>>();

function congressAt(world: World, asOf: IsoDate): CongressView | null {
  let perWorld = congressCache.get(world);
  if (!perWorld) {
    perWorld = new Map();
    congressCache.set(world, perWorld);
  }
  if (!perWorld.has(asOf)) {
    perWorld.set(
      asOf,
      asOf === world.currentDate
        ? projectCongress(world)
        : projectCongress(world, { asOf }),
    );
  }
  return perWorld.get(asOf) ?? null;
}

/** House seat lines keyed by congressional GEOID. */
function houseLines(context: ProjectionContext): Map<string, OfficeLine> {
  const lines = new Map<string, OfficeLine>();
  for (const seat of context.congress?.house.seats ?? []) {
    const geoid = houseSeatGeoid(seat);
    if (!geoid) continue;
    lines.set(geoid, {
      key: seat.seatKey,
      title: congressSeatTitle(seat),
      status: occupantStatus(context.world, seat.occupant, context.date.asOf),
      basis: CONGRESS_BASIS,
    });
  }
  return lines;
}

/** Senate lines grouped by state postal code. */
function senateLines(context: ProjectionContext): Map<string, OfficeLine[]> {
  const lines = new Map<string, OfficeLine[]>();
  for (const seat of context.congress?.senate.seats ?? []) {
    const list = lines.get(seat.stateUsps) ?? [];
    list.push({
      key: seat.seatKey,
      title: `${congressSeatTitle(seat)} (Class ${seat.senateClass})`,
      status: occupantStatus(context.world, seat.occupant, context.date.asOf),
      basis: CONGRESS_BASIS,
    });
    lines.set(seat.stateUsps, list);
  }
  return lines;
}

/**
 * State legislative seats this save actually records: a winner of a contest
 * bound to the district, with a term in force today. History before today is
 * not reconstructed for these seats, and the inspector says so.
 */
function stateLegislativeLines(
  world: World,
  chamber: DistrictChamber,
  asOf: IsoDate,
): Map<string, OfficeLine> {
  const lines = new Map<string, OfficeLine>();
  if (asOf !== world.currentDate) return lines;
  for (const relationship of world.history.workRelationships) {
    if (relationship.kind !== "employment:legislative-member") continue;
    const term = activeLegislativeTermEvidence(world, relationship.id);
    const binding = term?.contest.office.districtBinding;
    if (!term || !binding || binding.chamber !== chamber) continue;
    const person = world.people[relationship.personId];
    if (!person) continue;
    lines.set(binding.geoid, {
      key: binding.recordId,
      title: term.contest.office.title,
      status: {
        kind: "held",
        holder: {
          personId: person.id,
          name: personName(person),
          partyOrganizationId: null,
          partyName: null,
          caucusOrganizationId: null,
          termStartedAt: term.startsAt,
          termEndsBefore: term.endsAt,
          serviceSince: null,
        },
      },
      basis:
        "Won in a contest this save ran; the save records the term, not a party label for it.",
    });
  }
  return lines;
}

export function projectPoliticalMap(
  world: World,
  input: {
    readonly mode: MapMode;
    readonly stateUsps?: string | null;
    readonly asOf?: string | null;
    /** GEOIDs drawn in the current layer, from the geometry pack. */
    readonly geoids: readonly string[];
  },
): PoliticalMapModel {
  const date = resolveMapDate(world, input.asOf);
  const established = livingWorldEstablished(world);
  const congress = established ? congressAt(world, date.asOf) : null;
  const context: ProjectionContext = { world, date, congress };
  const stateUsps = input.stateUsps ?? null;
  const regions = new Map<string, RegionSummary>();
  const notes: string[] = [];

  const add = (
    geoid: string,
    lines: readonly OfficeLine[],
    fallback?: OfficeStatus,
  ) => {
    const statuses = lines.length
      ? lines.map((line) => line.status)
      : fallback
        ? [fallback]
        : [];
    const fill = combineFills(statuses.map(statusFill));
    regions.set(geoid, {
      geoid,
      fill,
      summary: lines.length
        ? lines.map((line) => statusShort(line.status)).join("; ")
        : fallback
          ? statusShort(fallback)
          : "Not recorded in this save",
      holderPersonIds: statuses.flatMap((status) =>
        status.kind === "held" ? [status.holder.personId] : [],
      ),
    });
  };

  if (!established) {
    notes.push(
      "This save has no public-world roll yet, so offices are shown as not recorded rather than empty.",
    );
  }

  switch (input.mode) {
    case "house": {
      const lines = houseLines(context);
      for (const geoid of input.geoids) {
        const line = lines.get(geoid);
        if (line) add(geoid, [line]);
        else if (geoid.startsWith("11"))
          add(geoid, [], { kind: "no-voting-seat", reason: DC_HOUSE_REASON });
        else add(geoid, [], { kind: "not-recorded", reason: NO_ROSTER_REASON });
      }
      break;
    }
    case "senate": {
      const lines = senateLines(context);
      const byFips = new Map(
        Object.entries(FIPS_BY_USPS).map(([usps, fips]) => [fips, usps]),
      );
      for (const geoid of input.geoids) {
        const usps = byFips.get(geoid) ?? "";
        if (usps === "DC") {
          add(geoid, [], { kind: "no-voting-seat", reason: DC_SENATE_REASON });
          continue;
        }
        const stateLines = lines.get(usps) ?? [];
        if (stateLines.length) add(geoid, stateLines);
        else add(geoid, [], { kind: "not-recorded", reason: NO_ROSTER_REASON });
      }
      break;
    }
    case "state-upper":
    case "state-lower": {
      const chamber = CHAMBER_FOR_MODE[input.mode] as DistrictChamber;
      const lines = stateLegislativeLines(world, chamber, date.asOf);
      for (const geoid of input.geoids) {
        const line = lines.get(geoid);
        if (line) add(geoid, [line]);
        else add(geoid, [], { kind: "not-recorded", reason: NO_ROSTER_REASON });
      }
      notes.push(
        date.isHistorical
          ? "State legislative seats are shown for today only; this save does not keep their past rosters."
          : "Only state legislative seats won in this save's contests are recorded; party labels for them are not recorded.",
      );
      break;
    }
    case "county":
    case "place":
      for (const geoid of input.geoids) {
        regions.set(geoid, {
          geoid,
          fill: { kind: "geography" },
          summary: input.mode === "county" ? "County or equivalent" : "Place",
          holderPersonIds: [],
        });
      }
      notes.push(
        "Counties and places are drawn for location only. Their governments are listed in Government, not colored here.",
      );
      break;
  }

  // Legend from what is actually shown; parties by their real ids.
  const partyIds = new Set<EntityId>();
  const counts = new Map<string, { fill: LegendKey; count: number }>();
  const collect = (fill: RegionFill, weight: number) => {
    if (fill.kind === "party") partyIds.add(fill.organizationId);
    if (fill.kind === "mixed") {
      for (const part of fill.parts) collect(part, 0);
    }
    const key = fillKey(fill);
    const entry = counts.get(key) ?? {
      fill:
        fill.kind === "party"
          ? { kind: "party", organizationId: fill.organizationId }
          : ({ kind: fill.kind } as LegendKey),
      count: 0,
    };
    entry.count += weight;
    counts.set(key, entry);
  };
  for (const region of regions.values()) collect(region.fill, 1);
  const slots = partySlots(world, partyIds);
  const legend: LegendEntry[] = [...counts.entries()]
    .map(([key, { fill, count }]): LegendEntry => {
      if (fill.kind === "party") {
        const name = partyNameAt(world, fill.organizationId, date.asOf);
        const slot = slots.get(fill.organizationId);
        return {
          key,
          fill,
          label: name,
          description: `Seat held by a member publicly affiliated with the ${name} on ${proseDate(date.asOf)}.`,
          count,
          ...(slot ? { slot } : {}),
        };
      }
      return { key, fill, count, ...LEGEND_TEXT[fill.kind] };
    })
    .sort(
      (a, b) =>
        legendRank(a) - legendRank(b) ||
        (a.slot?.slot ?? 0) - (b.slot?.slot ?? 0),
    );

  return {
    date,
    mode: input.mode,
    stateUsps,
    established,
    regions,
    legend,
    partySlots: slots,
    notes,
  };
}

const LEGEND_TEXT: Readonly<
  Record<
    Exclude<LegendKey["kind"], "party">,
    { label: string; description: string }
  >
> = {
  "no-party": {
    label: "No party affiliation",
    description:
      "Held by a member with no public party affiliation on record (for example, an independent).",
  },
  mixed: {
    label: "Split or mixed",
    description:
      "The seats here differ: holders of different parties, or a holder and a vacancy.",
  },
  vacant: {
    label: "Vacant",
    description: "The save records the seat as vacant.",
  },
  "no-current-record": {
    label: "No current record",
    description:
      "A recorded term ended and the save records no successor. This is not a vacancy.",
  },
  "not-recorded": {
    label: "Not recorded",
    description:
      "This save keeps no record for this office. Absence is not zero and not a vacancy.",
  },
  "no-voting-seat": {
    label: "No voting seat",
    description: "This area elects no voting member of this body.",
  },
  geography: {
    label: "Geography only",
    description: "Drawn for location; no political value is shown.",
  },
};

function legendRank(entry: LegendEntry): number {
  const order = [
    "party",
    "no-party",
    "mixed",
    "vacant",
    "no-current-record",
    "not-recorded",
    "no-voting-seat",
    "geography",
  ];
  return order.indexOf(entry.fill.kind);
}

/* ------------------------------------------------------------------ */
/* Inspection                                                          */
/* ------------------------------------------------------------------ */

export interface RegionInspection {
  readonly layer: MapLayerId;
  readonly geoid: string;
  readonly stateUsps: string;
  readonly offices: readonly OfficeLine[];
  readonly contests: readonly ContestLine[];
  readonly relations: readonly string[];
  readonly membership: readonly string[];
  readonly notes: readonly string[];
}

function contestsForDistrict(
  world: World,
  chamber: DistrictChamber,
  geoid: string,
  asOf: IsoDate,
): ContestLine[] {
  const recordId = districtRecordId(chamber, geoid);
  return (world.history.electionContests ?? [])
    .filter(
      (contest) =>
        contest.office.districtBinding?.recordId === recordId &&
        contest.scheduledAt <= asOf,
    )
    .sort((a, b) => b.electionDate.localeCompare(a.electionDate))
    .map((contest): ContestLine => {
      const result = electionContestResult(world, contest.id);
      const resolved = result && result.resolvedAt <= asOf ? result : null;
      return {
        contestId: contest.id,
        title: contest.office.title,
        electionDate: contest.electionDate,
        state: resolved ? "resolved" : "scheduled",
        candidates: contest.candidatePersonIds.map((personId) => {
          const tally = resolved?.tallies.find(
            (entry) => entry.candidatePersonId === personId,
          );
          const person = world.people[personId];
          return {
            personId,
            name: person ? personName(person) : "Unrecorded candidate",
            partyOrganizationId: null,
            votes: tally?.votes ?? null,
            voteShare: tally?.voteShare ?? null,
            won: resolved?.winnerPersonId === personId,
          };
        }),
        basis:
          contest.provenance.method === "authored"
            ? "An authored contest in this save; results are the save's own, not certified real returns."
            : "A contest this save simulated; vote counts are the save's own, not real returns.",
      };
    });
}

export function inspectRegion(
  world: World,
  personId: EntityId,
  input: {
    readonly layer: MapLayerId;
    readonly geoid: string;
    readonly stateUsps: string;
    readonly asOf?: string | null;
  },
): RegionInspection {
  const date = resolveMapDate(world, input.asOf);
  const congress = livingWorldEstablished(world)
    ? congressAt(world, date.asOf)
    : null;
  const context: ProjectionContext = { world, date, congress };
  const offices: OfficeLine[] = [];
  let contests: ContestLine[] = [];
  const notes: string[] = [];
  const membership: string[] = [];

  switch (input.layer) {
    case "congressional": {
      const line = houseLines(context).get(input.geoid);
      if (line) offices.push(line);
      else
        offices.push({
          key: `house:${input.geoid}`,
          title: "U.S. House",
          status: input.geoid.startsWith("11")
            ? { kind: "no-voting-seat", reason: DC_HOUSE_REASON }
            : { kind: "not-recorded", reason: NO_ROSTER_REASON },
          basis: CONGRESS_BASIS,
        });
      contests = contestsForDistrict(
        world,
        "congressional",
        input.geoid,
        date.asOf,
      );
      break;
    }
    case "state": {
      if (input.stateUsps === "DC") {
        offices.push({
          key: "senate:DC",
          title: "U.S. Senate",
          status: { kind: "no-voting-seat", reason: DC_SENATE_REASON },
          basis: "Constitutional fact.",
        });
      } else {
        offices.push(...(senateLines(context).get(input.stateUsps) ?? []));
      }
      const governor = currentStateExecutiveHolders(world).find(
        (record) => record.stateUsps === input.stateUsps,
      );
      if (governor && !date.isHistorical) {
        offices.push({
          key: governor.officeKey,
          title: governor.title,
          status: {
            kind: "held",
            holder: {
              personId: governor.personId,
              name: governor.personName,
              partyOrganizationId: null,
              partyName: null,
              caucusOrganizationId: null,
              termStartedAt: governor.startedAt,
              termEndsBefore: governor.endExclusive,
              serviceSince: null,
            },
          },
          basis: "This save's state executive record (fictional officeholder).",
        });
      } else {
        offices.push({
          key: `governor:${input.stateUsps}`,
          title:
            input.stateUsps === "DC"
              ? "Mayor of the District of Columbia"
              : "Governor",
          status: {
            kind: "not-recorded",
            reason: date.isHistorical
              ? "Past governors are not reconstructed on the map."
              : "This save records a governor only for the player's home state.",
          },
          basis: "This save's state executive record.",
        });
      }
      const house = houseLines(context);
      const delegation = [...house.entries()].filter(([geoid]) =>
        geoid.startsWith(stateFipsForUsps(input.stateUsps) ?? "--"),
      );
      if (delegation.length) {
        const byParty = new Map<string, number>();
        for (const [, line] of delegation) {
          const label =
            line.status.kind === "held"
              ? (line.status.holder.partyName ?? "No party affiliation")
              : line.status.kind === "vacant"
                ? "Vacant"
                : "No current record";
          byParty.set(label, (byParty.get(label) ?? 0) + 1);
        }
        notes.push(
          `House delegation on ${proseDate(date.asOf)}: ${[...byParty.entries()]
            .map(([label, count]) => `${label} ${count}`)
            .join(", ")} (${delegation.length} seats).`,
        );
      }
      break;
    }
    case "state-upper":
    case "state-lower": {
      const chamber = input.layer;
      const line = stateLegislativeLines(world, chamber, date.asOf).get(
        input.geoid,
      );
      offices.push(
        line ?? {
          key: `${chamber}:${input.geoid}`,
          title:
            chamber === "state-upper"
              ? "State senate seat"
              : "State house seat",
          status: { kind: "not-recorded", reason: NO_ROSTER_REASON },
          basis: "This save's contest and term records.",
        },
      );
      contests = contestsForDistrict(world, chamber, input.geoid, date.asOf);
      break;
    }
    case "county": {
      const relation = countyCongressional([input.geoid]);
      membership.push(
        relation.kind === "known"
          ? `Entirely within congressional district ${districtLabel(relation.geoid)}.`
          : relation.kind === "candidates"
            ? `Touches congressional districts ${relation.geoids.map(districtLabel).join(", ")}.`
            : relation.reason,
      );
      break;
    }
    case "place": {
      for (const chamber of ["state-upper", "state-lower"] as const) {
        const join = placeDistrictJoin(input.geoid, chamber);
        const label =
          chamber === "state-upper" ? "state senate" : "state house";
        if (join.kind === "whole-place") {
          membership.push(
            `Entirely within ${label} district ${districtLabel(join.districtGeoid)}.`,
          );
        } else if (join.kind === "split") {
          const list = splitCandidates(input.geoid, chamber);
          membership.push(
            `Split across ${label} districts ${list.map(districtLabel).join(", ")}; an address decides which.`,
          );
        } else {
          membership.push(`No published ${label} relationship for this place.`);
        }
      }
      const house = placeCongressional(input.geoid);
      membership.push(describeRelation("congressional district", house));
      break;
    }
  }

  const player = playerGeography(world, personId);
  const relations: string[] = [];
  if (
    player.home &&
    player.home.layer === input.layer &&
    player.home.geoid === input.geoid
  )
    relations.push("Your home is here.");
  if (
    player.here &&
    player.here.layer === input.layer &&
    player.here.geoid === input.geoid
  )
    relations.push("You are here now.");
  const chamber =
    input.layer === "congressional" ||
    input.layer === "state-upper" ||
    input.layer === "state-lower"
      ? input.layer
      : null;
  if (chamber) {
    const home = player.homeDistricts[chamber];
    if (home.kind === "known" && home.geoid === input.geoid)
      relations.push("Your home is in this district.");
    if (home.kind === "candidates" && home.geoids.includes(input.geoid))
      relations.push(
        `Your home may be in this district. ${home.geoids.length} districts are possible and the save does not record which one.`,
      );
    if (
      player.seats.some(
        (seat) => seat.chamber === chamber && seat.geoid === input.geoid,
      )
    )
      relations.push("You represent this district.");
    if (
      player.seeking?.chamber === chamber &&
      player.seeking.geoid === input.geoid
    )
      relations.push(
        "You have chosen to seek this seat. Choosing it is not proof of residence.",
      );
  }
  if (input.layer === "state" && player.home?.stateUsps === input.stateUsps)
    relations.push("Your home state.");

  if (date.isHistorical) {
    notes.push(
      `Shown as recorded on ${proseDate(date.asOf)}. Nothing here changes the current day.`,
    );
  }
  return {
    layer: input.layer,
    geoid: input.geoid,
    stateUsps: input.stateUsps,
    offices,
    contests,
    relations,
    membership,
    notes,
  };
}

/** The name a player reads for a drawn region. Never a raw Census label alone. */
export function regionLabel(
  layer: MapLayerId,
  feature: {
    readonly geoid: string;
    readonly name: string;
    readonly stateUsps: string;
  },
): string {
  const state = stateNameForUsps(feature.stateUsps);
  switch (layer) {
    case "state":
      return state;
    case "congressional": {
      const code = feature.geoid.slice(2);
      if (code === "98") return `${state} (non-voting Delegate district)`;
      if (/^0+$/.test(code)) return `${state} at-large district`;
      return `${state} district ${Number(code)}`;
    }
    case "state-upper":
    case "state-lower":
      return feature.name || `${state} district ${feature.geoid.slice(2)}`;
    default:
      return feature.name;
  }
}

function districtLabel(geoid: string): string {
  const code = geoid.slice(2);
  if (/^0+$/.test(code)) return "at-large";
  return /^\d+$/.test(code) ? String(Number(code)) : code;
}

type PackedTable = Readonly<
  Record<string, Readonly<Record<string, string | readonly string[]>>>
>;

function packedLookup(
  table: PackedTable,
  geoid: string,
): readonly string[] | string | null {
  const state = geoid.slice(0, 2);
  const value = table[state]?.[geoid.slice(2)];
  if (value === undefined) return null;
  return typeof value === "string"
    ? `${state}${value}`
    : value.map((code) => `${state}${code}`);
}

function splitCandidates(
  placeGeoid: string,
  chamber: DistrictChamber,
): string[] {
  const state = placeGeoid.slice(0, 2);
  const table = candidates.splitPlaceStateLegislative.byState as Readonly<
    Record<
      string,
      Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>
    >
  >;
  const codes =
    table[state]?.[placeGeoid.slice(2)]?.[
      chamber === "state-upper" ? "u" : "l"
    ] ?? [];
  return codes.map((code) => `${state}${code}`);
}

let placeCountyIndex: Map<string, string[]> | null = null;
function countiesForPlace(placeGeoid: string): string[] {
  if (!placeCountyIndex) {
    placeCountyIndex = new Map();
    for (const [place, county] of JSON.parse(PLACE_COUNTY_RELATIONS_ROWS) as [
      string,
      string,
      number,
    ][]) {
      placeCountyIndex.set(place, [
        ...(placeCountyIndex.get(place) ?? []),
        county,
      ]);
    }
  }
  return placeCountyIndex.get(placeGeoid) ?? [];
}

const COUNTY_METHOD =
  "Every county this place touches lies wholly inside one congressional district (Census county-within-district file).";
const COUNTY_CANDIDATE_METHOD =
  "Candidates from the Census county-within-district file for the counties this place touches; an address would decide.";

function countyCongressional(
  countyGeoids: readonly string[],
): DistrictRelation {
  const table = candidates.countyCongressional.byState as PackedTable;
  const entries = countyGeoids.map((county) => packedLookup(table, county));
  if (!entries.length || entries.some((entry) => entry === null)) {
    return {
      kind: "unknown",
      reason: "No published county-to-district relationship covers this place.",
    };
  }
  const districts = [
    ...new Set(
      entries.flatMap((entry) =>
        entry === null ? [] : typeof entry === "string" ? [entry] : entry,
      ),
    ),
  ].sort();
  if (
    districts.length === 1 &&
    entries.every((entry) => typeof entry === "string")
  ) {
    return {
      kind: "known",
      geoid: districts[0] as string,
      method: COUNTY_METHOD,
    };
  }
  return {
    kind: "candidates",
    geoids: districts,
    method: COUNTY_CANDIDATE_METHOD,
  };
}

const PLACE_METHOD =
  "All of this place's land lies in one district (Census 119th Congress district–2020 place relationship).";
const PLACE_CANDIDATE_METHOD =
  "The place's land spans these districts (Census 119th Congress district–2020 place relationship); an address would decide.";

function placeCongressional(placeGeoid: string): DistrictRelation {
  const direct = packedLookup(
    candidates.placeCongressional.byState as PackedTable,
    placeGeoid,
  );
  if (typeof direct === "string")
    return { kind: "known", geoid: direct, method: PLACE_METHOD };
  if (direct)
    return {
      kind: "candidates",
      geoids: [...direct],
      method: PLACE_CANDIDATE_METHOD,
    };
  // A place newer than the 2020 relationship file falls back to its counties.
  return countyCongressional(countiesForPlace(placeGeoid));
}

function describeRelation(label: string, relation: DistrictRelation): string {
  if (relation.kind === "known")
    return `Entirely within ${label} ${districtLabel(relation.geoid)}.`;
  if (relation.kind === "candidates")
    return `Possible ${label}s: ${relation.geoids.map(districtLabel).join(", ")}; the save does not pick one.`;
  return relation.reason;
}

function placeRefForJurisdiction(jurisdictionId: EntityId | null | undefined): {
  ref: MapPlaceRef | null;
  label: string | null;
} {
  if (!jurisdictionId) return { ref: null, label: null };
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (!place) return { ref: null, label: null };
  const usps =
    place.stateJurisdictionKey?.match(/^US-([A-Z]{2})$/)?.[1] ?? null;
  if (!usps) return { ref: null, label: place.displayName };
  if (place.scope === "state") {
    return {
      ref: {
        layer: "state",
        geoid: stateFipsForUsps(usps) ?? "",
        stateUsps: usps,
        label: place.displayName,
      },
      label: place.displayName,
    };
  }
  const countyGeoid = place.key.startsWith("county:")
    ? place.key.slice(7)
    : null;
  if (place.scope === "county" && countyGeoid) {
    return {
      ref: {
        layer: "county",
        geoid: countyGeoid,
        stateUsps: usps,
        label: place.displayName,
      },
      label: place.displayName,
    };
  }
  const placeGeoid =
    place.sourceGeoid ?? (/^\d{7}$/.test(place.key) ? place.key : null);
  return {
    ref: placeGeoid
      ? {
          layer: "place",
          geoid: placeGeoid,
          stateUsps: usps,
          label: place.displayName,
        }
      : null,
    label: place.displayName,
  };
}

const HOME_UNKNOWN =
  "The save records a home place, not an address, so district membership is not known.";

export function playerGeography(
  world: World,
  personId: EntityId,
): PlayerGeography {
  const person = world.people[personId];
  const home = placeRefForJurisdiction(person?.homeJurisdictionId);
  const location = [...world.history.events]
    .reverse()
    .find(
      (event) =>
        (event.type === "life.scene.opened" ||
          event.type === "life.scene.arrived") &&
        event.involvedEntityIds.includes(personId),
    )?.context.location;
  const here = placeRefForJurisdiction(location?.jurisdictionId);

  const homeDistricts: Record<DistrictChamber, DistrictRelation> = {
    congressional: { kind: "unknown", reason: HOME_UNKNOWN },
    "state-upper": { kind: "unknown", reason: HOME_UNKNOWN },
    "state-lower": { kind: "unknown", reason: HOME_UNKNOWN },
  };
  const homeRef = home.ref;
  if (homeRef?.layer === "place") {
    homeDistricts.congressional = placeCongressional(homeRef.geoid);
    for (const chamber of ["state-upper", "state-lower"] as const) {
      const join = placeDistrictJoin(homeRef.geoid, chamber);
      homeDistricts[chamber] =
        join.kind === "whole-place"
          ? {
              kind: "known",
              geoid: join.districtGeoid,
              method:
                "The whole place lies in one district (Census 2024 district–place relationship).",
            }
          : join.kind === "split"
            ? {
                kind: "candidates",
                geoids: splitCandidates(homeRef.geoid, chamber),
                method:
                  "The place is split between districts (Census 2024 district–place relationship).",
              }
            : { kind: "unknown", reason: HOME_UNKNOWN };
    }
  } else if (homeRef?.layer === "county") {
    homeDistricts.congressional = countyCongressional([homeRef.geoid]);
  }
  // At-large states have exactly one district: that is a fact, not a guess.
  if (homeRef && homeDistricts.congressional.kind !== "known") {
    const fips = stateFipsForUsps(homeRef.stateUsps);
    const statewide = districtIdentityCatalog().filter(
      (identity) =>
        identity.chamber === "congressional" &&
        identity.stateFips === fips &&
        !identity.isUnassignedResidual,
    );
    if (statewide.length === 1) {
      homeDistricts.congressional = {
        kind: "known",
        geoid: (statewide[0] as { geoid: string }).geoid,
        method: "The state elects its House member at large.",
      };
    }
  }

  const seats: PlayerGeography["seats"][number][] = [];
  const congress = livingWorldEstablished(world)
    ? congressAt(world, world.currentDate)
    : null;
  for (const seat of congress?.house.seats ?? []) {
    if (
      seat.occupant.kind === "member" &&
      seat.occupant.member.personId === personId
    ) {
      const geoid = houseSeatGeoid(seat);
      if (geoid)
        seats.push({
          chamber: "congressional",
          geoid,
          title: congressSeatTitle(seat),
        });
    }
  }
  for (const seat of congress?.senate.seats ?? []) {
    if (
      seat.occupant.kind === "member" &&
      seat.occupant.member.personId === personId
    ) {
      seats.push({
        chamber: "senate",
        geoid: stateFipsForUsps(seat.stateUsps) ?? "",
        title: congressSeatTitle(seat),
      });
    }
  }
  for (const chamber of ["state-upper", "state-lower"] as const) {
    for (const [geoid, line] of stateLegislativeLines(
      world,
      chamber,
      world.currentDate,
    )) {
      if (
        line.status.kind === "held" &&
        line.status.holder.personId === personId
      ) {
        seats.push({ chamber, geoid, title: line.title });
      }
    }
  }
  const intent = desiredDistrictBinding(world, personId);
  return {
    home: home.ref,
    homeLabel: home.label,
    here: here.ref,
    hereLabel: here.label ?? location?.label ?? null,
    homeDistricts,
    seats,
    seeking: intent ? { chamber: intent.chamber, geoid: intent.geoid } : null,
  };
}

/** Districts a focused person holds today, for highlighting on the map. */
export function districtsHeldBy(
  world: World,
  personIds: readonly EntityId[],
  asOf?: string | null,
): {
  readonly layer: MapLayerId;
  readonly geoid: string;
  readonly personId: EntityId;
}[] {
  const wanted = new Set(personIds);
  if (!wanted.size || !livingWorldEstablished(world)) return [];
  const date = resolveMapDate(world, asOf);
  const congress = congressAt(world, date.asOf);
  const out: { layer: MapLayerId; geoid: string; personId: EntityId }[] = [];
  for (const seat of congress?.house.seats ?? []) {
    if (
      seat.occupant.kind === "member" &&
      wanted.has(seat.occupant.member.personId)
    ) {
      const geoid = houseSeatGeoid(seat);
      if (geoid)
        out.push({
          layer: "congressional",
          geoid,
          personId: seat.occupant.member.personId,
        });
    }
  }
  for (const seat of congress?.senate.seats ?? []) {
    if (
      seat.occupant.kind === "member" &&
      wanted.has(seat.occupant.member.personId)
    ) {
      out.push({
        layer: "state",
        geoid: stateFipsForUsps(seat.stateUsps) ?? "",
        personId: seat.occupant.member.personId,
      });
    }
  }
  return out;
}

/** A bill's sponsor, resolved to the people the map can highlight. */
export function measureSponsorIds(
  world: World,
  measureId: EntityId,
): EntityId[] {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === measureId,
  );
  return measure?.sponsorPersonId ? [measure.sponsorPersonId] : [];
}
