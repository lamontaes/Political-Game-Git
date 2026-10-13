/**
 * The town's local groups at the opening (BOARD, Oct 12: group kinds as data
 * with each town's counts from real sources). Which groups residents can
 * belong to comes from the IRS Exempt Organizations Business Master File: the
 * groups listed under the town's own name where the IRS lists any; else its
 * county's, placed at the county (people in a small place belong to groups in
 * the county); else its island area's. The count is scaled to the people the
 * model holds, keeping at least one of each kind the area has. Each group is
 * a public organization residents can know of, join and meet in.
 */
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { countyPopulationSharesForPlace } from "../simulation/government-units";
import countsJson from "./data/groups/counts.json" with { type: "json" };
import groupsJson from "./data/groups/groups.json" with { type: "json" };
import { COLLEGE_FACT_KIND, COLLEGE_STAGE } from "./opening-college";
import { parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, PublicOrganization } from "./types";
import type { EntityId } from "../simulation/types";

type Counts = Readonly<Record<string, number>>;
const COUNTS = countsJson as unknown as {
  source: { citation: string };
  kinds: readonly string[];
  byState: Readonly<Record<string, Counts>>;
  byCounty: Readonly<Record<string, Counts>>;
  byCity: Readonly<Record<string, Counts>>;
  countyPopulation2010: Readonly<Record<string, number>>;
};
export const GROUPS = groupsJson as {
  version: string;
  stopgapId: string;
  affordances: readonly string[];
  kinds: Readonly<Record<string, { name: string }>>;
  numberPattern: string;
  islandAreaPopulation2020: Readonly<Record<string, number | string>>;
};
export const GROUP_KIND_PREFIX = "group:";
/** A college's student organizations: not an IRS-listed kind. */
const STUDENT_KIND = "student-organization";

const p = (key: string) => parameter(key);

export interface AreaGroupCounts {
  /** Groups the area has, by kind, from the IRS listing. */
  counts: Record<string, number>;
  basis: "city" | "county" | "island-area" | "none";
  /** The area's residents, to scale its groups to the people the model holds. */
  population: number;
  /** Where the groups sit: the town itself, or its county. */
  placeId: string;
}

/**
 * The groups the town's residents can belong to: those the IRS lists under
 * the town's own name, else those of its county (residents of a small place
 * belong to groups in the county), else of its island area.
 */
export function areaGroupCounts(
  townId: string,
  countyId: string | undefined,
  modeled: number,
  skipCity = false,
): AreaGroupCounts {
  const place = lifePlaceByJurisdictionId(townId as EntityId);
  const usps = place?.stateJurisdictionKey?.split("-").at(-p("one")) ?? "";
  const geoid = place?.sourceGeoid;
  const townPopulation = geoid
    ? (placeReferencePopulation(geoid)?.value ?? p("zero"))
    : p("zero");
  const city =
    COUNTS.byCity[`${usps}|${(place?.formalName ?? "").toUpperCase()}`];
  if (city && !skipCity)
    return {
      counts: { ...city },
      basis: "city",
      population: townPopulation || modeled,
      placeId: townId,
    };
  const county = countyId
    ? lifePlaceByJurisdictionId(countyId as EntityId)
    : undefined;
  const countyGeoid =
    county?.sourceGeoid ??
    (geoid
      ? countyPopulationSharesForPlace(geoid)[p("zero")]?.[p("zero")]
      : undefined);
  const countyGroups = countyGeoid ? COUNTS.byCounty[countyGeoid] : undefined;
  if (countyGroups && countyId)
    return {
      counts: { ...countyGroups },
      basis: "county",
      population: COUNTS.countyPopulation2010[countyGeoid!] ?? modeled,
      placeId: countyId,
    };
  const island = GROUPS.islandAreaPopulation2020[usps];
  const state = COUNTS.byState[usps];
  if (state && typeof island === "number")
    return {
      counts: { ...state },
      basis: "island-area",
      population: island,
      placeId: townId,
    };
  return { counts: {}, basis: "none", population: modeled, placeId: townId };
}

/** Adds the groups the town's residents can know of and join, as public organizations. */
export function addOpeningGroups(input: CoreInput): CoreInput {
  const marker = stopgap(GROUPS.stopgapId);
  const residents = input.people.filter((row) => row.tier !== "husk");
  const town = residents[p("zero")]?.placeId;
  if (!town) return input;
  const counties = new Map<string, number>();
  for (const row of residents)
    if (row.placeId === town && row.countyId)
      counties.set(
        row.countyId,
        (counties.get(row.countyId) ?? p("zero")) + p("one"),
      );
  // The county most of the town's residents' records name.
  const countyId = [...counties]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
    .at(p("zero"));
  const modeled =
    residents.filter((row) => row.placeId === town).length +
    (input.residents?.households ?? []).reduce(
      (sum, row) => sum + row.people.length,
      p("zero"),
    );
  const primary = areaGroupCounts(town, countyId, modeled);
  // A kind the town's own listing lacks (churches need not register) is
  // reached in the county, as in a small place.
  const areas = [primary];
  if (primary.basis === "city") {
    const county = areaGroupCounts(town, countyId, modeled, true);
    if (county.basis === "county")
      areas.push({
        ...county,
        counts: Object.fromEntries(
          Object.entries(county.counts).filter(
            ([kind]) => !((primary.counts[kind] ?? p("zero")) > p("zero")),
          ),
        ),
      });
  }
  const existing = new Set((input.publicOrganizations ?? []).map((r) => r.id));
  const groups: PublicOrganization[] = [];
  for (const area of areas) {
    // The area's groups scaled to the people the model holds, keeping at
    // least one of each kind the area has, so a small place still has its church.
    const scale =
      area.population > modeled && area.population > p("zero")
        ? modeled / area.population
        : p("one");
    const areaName =
      area.placeId === town
        ? (input.placeMetadata?.placeName?.split(",")[p("zero")] ??
          lifePlaceByJurisdictionId(town as EntityId)?.formalName ??
          town)
        : (lifePlaceByJurisdictionId(area.placeId as EntityId)?.formalName ??
          area.placeId);
    const sourced = area.basis === "city" && scale === p("one");
    for (const kind of Object.keys(GROUPS.kinds).sort()) {
      const listed = area.counts[kind] ?? p("zero");
      if (!(listed > p("zero"))) continue;
      const n = Math.max(p("one"), Math.round(listed * scale));
      const base = GROUPS.kinds[kind]!.name.replace("{place}", areaName);
      for (let index = p("one"); index <= n; index += p("one")) {
        const id = `${GROUP_KIND_PREFIX}${area.placeId}:${kind}:${index}`;
        if (existing.has(id)) continue;
        existing.add(id);
        groups.push({
          id,
          placeId: area.placeId,
          name:
            index === p("one")
              ? base
              : GROUPS.numberPattern
                  .replace("{name}", base)
                  .replace("{n}", String(index)),
          kind,
          affordances: GROUPS.affordances,
          facts: {
            groupKind: kind,
            countBasis: area.basis,
            listed: String(listed),
            ...(scale < p("one") ? { scaledToModeled: String(scale) } : {}),
          },
          source: {
            tag: sourced ? "SOURCED" : "ESTIMATED",
            asOf: input.startedAt,
            citation: `${COUNTS.source.citation} Count basis: ${area.basis}.`,
            ...(sourced ? {} : { estimatedFrom: marker.id }),
          },
        });
      }
    }
  }
  // Each college the town's students attend has its student organizations,
  // standing for its clubs and associations (one group per college).
  const colleges = new Map<string, { name: string; placeId: string }>();
  for (const person of input.people) {
    const fact = person.pastFacts?.find(
      (row) =>
        row.kind === COLLEGE_FACT_KIND &&
        row.facts?.stage === COLLEGE_STAGE &&
        row.facts?.enrollment === "current",
    );
    if (
      fact?.facts?.institutionSourceId &&
      !colleges.has(fact.facts.institutionSourceId)
    )
      colleges.set(fact.facts.institutionSourceId, {
        name: fact.facts.institutionName ?? fact.facts.schoolName ?? "",
        placeId: person.placeId,
      });
  }
  for (const [collegeId, college] of [...colleges].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const kind = STUDENT_KIND;
    const id = `${GROUP_KIND_PREFIX}${collegeId}:${kind}:${p("one")}`;
    if (existing.has(id)) continue;
    existing.add(id);
    groups.push({
      id,
      placeId: college.placeId,
      name: GROUPS.kinds[kind]!.name.replace("{place}", college.name),
      kind,
      affordances: GROUPS.affordances,
      facts: {
        groupKind: kind,
        countBasis: "college",
        institutionSourceId: collegeId,
      },
      source: {
        tag: "ESTIMATED",
        asOf: input.startedAt,
        citation: `One student organization per college the town's students attend (IPEDS ${collegeId}).`,
        estimatedFrom: marker.id,
      },
    });
  }
  return {
    ...input,
    publicOrganizations: [...(input.publicOrganizations ?? []), ...groups],
  };
}
