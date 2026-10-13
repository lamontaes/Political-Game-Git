/**
 * The federal and state offices that cover a place: president and vice
 * president; the state's U.S. senators and the House seat (or delegate) that
 * covers the town; the governor and every statewide elected office; both
 * chambers of the legislature with the town's own districts.
 *
 * Structures come from `data/research/offices/state-offices.json` (constitutions,
 * statutes, legislature and secretary of state pages); district geography from
 * the Census Gazetteer relationship files (`src/districts`); which party holds
 * each seat from the public-domain rosters in
 * `data/research/offices/legislature-party-counts-2026.json`.
 */
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import federalExecutiveResearch from "../../data/research/offices/federal-executive-2026.json" with { type: "json" };
import partyCounts from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import filingResearch from "../../data/research/elections/filing-requirements.json" with { type: "json" };
import statewideParties from "../../data/research/offices/statewide-executive-parties-2026.json" with { type: "json" };
import senateClasses from "../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import { districtIdentityCatalog } from "../districts/catalog";
import { placeDistrictJoin } from "../districts/place-membership";
import { largestPopulationShareDistrict } from "../districts/place-population-share";
import type { DistrictChamber, DistrictIdentity } from "../districts/types";
import type { OfficeInput } from "./offices-local";
import { stopgap } from "./stopgaps";

export interface VacancyRule {
  readonly method:
    | "special-election"
    | "appointment"
    | "appointment-then-special"
    | "successor"
    | "remains-vacant";
  readonly appointedBy?: string;
  readonly successor?: string;
  readonly citation?: string;
  readonly source?: string;
  readonly estimate: boolean;
}

/** A seat of an office: one person's place in it. */
export interface SeatInput {
  readonly id: string;
  readonly officeId: string;
  /** The district the seat represents, or null for an at-large or single seat. */
  readonly district: string | null;
  readonly index: number;
  readonly coversTown: boolean;
  /** The seat's next regular election year, where it differs from the office's. */
  readonly electionYear?: number;
  /** The party holding the seat in the real roster at the start, where read. */
  readonly party: string | null;
}

export interface OfficeWithSeats {
  readonly office: OfficeInput & { readonly vacancyRule: VacancyRule };
  readonly seats: readonly SeatInput[];
}

interface ResearchVacancy extends Omit<Partial<VacancyRule>, "method"> {
  readonly method?: string;
  readonly sourceRetrieved?: boolean;
}
interface ResearchChamber {
  readonly chamber: "upper" | "lower" | "unicameral";
  readonly staggered?: boolean;
  readonly name?: string;
  readonly seats?: number;
  readonly termYears?: number;
  readonly vacancyRule?: ResearchVacancy;
  readonly source?: string;
  readonly citation?: string;
  readonly estimate?: boolean;
  readonly sourceRetrieved?: boolean;
}
interface ResearchExecutive {
  readonly key: string;
  readonly title: string;
  readonly termYears?: number;
  readonly nextRegularElectionYear?: number;
  readonly vacancyRule?: ResearchVacancy;
  readonly source?: string;
  readonly citation?: string;
  readonly estimate?: boolean;
  readonly sourceRetrieved?: boolean;
}
interface ResearchPlace {
  readonly legislature?: {
    readonly name?: string;
    readonly chambers?: readonly ResearchChamber[];
  };
  readonly executives?: readonly ResearchExecutive[];
  readonly usSenateVacancy?: ResearchVacancy;
}

const research = (
  stateOfficeResearch as unknown as { places: Record<string, ResearchPlace> }
).places;
const parties = partyCounts as unknown as {
  places: Record<
    string,
    Record<string, { seatParties: Record<string, string[]> }>
  >;
  congress: Record<string, Record<string, string[]>>;
};
/** The party holding each governorship at the start (National Governors Association). */
const governorParty = new Map(
  (
    calibration as unknown as {
      governors: { stateUsps: string; party: string | null }[];
    }
  ).governors.map((g) => [
    `US-${g.stateUsps}`,
    g.party ? g.party[0]!.toUpperCase() + g.party.slice(1) : null,
  ]),
);
const federalExecutive = federalExecutiveResearch as unknown as Record<
  "president" | "vicePresident",
  { party: string }
>;
const TERRITORIES = new Set(["US-PR", "US-GU", "US-VI", "US-AS", "US-MP"]);

const METHODS: Readonly<Record<string, VacancyRule["method"]>> = {
  "special-election": "special-election",
  appointment: "appointment",
  "appointment-then-special": "appointment-then-special",
  succession: "successor",
  successor: "successor",
  "remains-vacant": "remains-vacant",
};

/**
 * A researched vacancy rule. A rule whose citation wasn't checked against a
 * page fetched when it was read counts as an estimate.
 */
function rule(
  read: ResearchVacancy | undefined,
  fallback: VacancyRule,
): VacancyRule {
  const method = read?.method ? METHODS[read.method] : undefined;
  if (!read || !method) return fallback;
  return {
    method,
    ...(read.appointedBy ? { appointedBy: read.appointedBy } : {}),
    ...(read.successor ? { successor: read.successor } : {}),
    ...(read.citation ? { citation: read.citation } : {}),
    ...(read.source ? { source: read.source } : {}),
    estimate: (read.estimate ?? false) || read.sourceRetrieved === false,
  };
}

let catalog: readonly DistrictIdentity[] | null = null;
function districts(stateUsps: string, chamber: DistrictChamber) {
  catalog ??= districtIdentityCatalog();
  return catalog.filter(
    (d) =>
      d.stateUsps === stateUsps &&
      d.chamber === chamber &&
      !d.isUnassignedResidual,
  );
}

/** The district of one chamber covering most of the town's residents. */
export function townDistrict(
  placeGeoid: string,
  stateUsps: string,
  chamber: DistrictChamber,
  date: string,
): DistrictIdentity | null {
  const all = districts(stateUsps, chamber);
  const join = placeDistrictJoin(placeGeoid, chamber, date);
  if (join.kind === "whole-place")
    return all.find((d) => d.geoid === join.districtGeoid) ?? null;
  if (join.kind === "split") {
    const candidates = all.filter((d) =>
      (join.candidateDistrictGeoids ?? []).includes(d.geoid),
    );
    return (
      largestPopulationShareDistrict(placeGeoid, chamber, candidates)
        ?.identity ??
      candidates[0] ??
      null
    );
  }
  return null;
}

/** A district's name or code reduced to comparable words. */
function districtKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(
      /\b(state|house|senate|senatorial|assembly|legislative|district|of|the)\b/g,
      " ",
    )
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/^\d+$/.test(word) ? String(Number(word)) : word))
    .sort()
    .join(" ");
}

type Roster = Readonly<Record<string, readonly string[]>>;

function roster(
  stateKey: string,
  chamber: "upper" | "lower" | "legislature",
): Roster {
  return parties.places[stateKey]?.[chamber]?.seatParties ?? {};
}

/** The roster district a Census district is, by code or by name. */
function rosterDistrict(rows: Roster, d: DistrictIdentity): string | null {
  const keys = new Set([
    districtKey(d.districtCode),
    districtKey(d.sourceName ?? ""),
  ]);
  for (const name of Object.keys(rows))
    if (keys.has(districtKey(name))) return name;
  return null;
}

/** Whether the place holds this family's regular election in the start year, and if not, when next. */
function offered(stateKey: string, family: string, year: number): number {
  const row = (
    filingResearch as unknown as {
      places: Record<
        string,
        Record<
          string,
          { offeredIn2026?: boolean; nextRegularElection?: string | null }
        >
      >;
    }
  ).places[stateKey]?.[family];
  if (row?.offeredIn2026 === false && row.nextRegularElection)
    return Number(row.nextRegularElection);
  return year;
}

/**
 * A legislative seat's next regular election year: a chamber with no 2026
 * election goes in its next regular year; two-year chambers every two years
 * from there; a four-year chamber elected all at once goes with the
 * governor's cycle; a staggered four-year chamber splits its seats across the
 * two cycles by district number (estimated: SG-GOV-term-end-estimate).
 */
function seatElectionYear(
  stateKey: string,
  chamber: ResearchChamber | undefined,
  district: string,
  year: number,
): number {
  const first = offered(stateKey, "stateLegislative", year);
  const termYears = chamber?.termYears ?? 2;
  if (termYears <= 2) return first;
  if (chamber?.staggered)
    return (
      first + ((Number(district.replace(/\D/g, "")) || 0) % 2 === 0 ? 0 : 2)
    );
  if (first !== year) return first;
  return offered(stateKey, "statewideExecutive", year) === year
    ? year
    : year + 2;
}

/** Federal offices covering the town. */
export function federalOffices(
  stateKey: string,
  placeGeoid: string,
  date: string,
): readonly OfficeWithSeats[] {
  const usps = stateKey.slice(3);
  const offices: OfficeWithSeats[] = [];
  const executive = (kind: string, title: string): OfficeWithSeats => ({
    office: {
      id: `office:US:${kind}`,
      level: "federal",
      jurisdiction: "US",
      governmentName: "United States",
      kind,
      title,
      seats: 1,
      termYears: 4,
      nextElectionYear: 2028,
      termStarts: "01-20",
      elected: true,
      districted: false,
      coversTown: !TERRITORIES.has(stateKey),
      source: "U.S. Const. art. II, § 1; amend. XXII; amend. XXV",
      estimate: false,
      vacancyRule: {
        method: "successor",
        successor:
          kind === "president"
            ? "vice-president"
            : "nominated by the president, confirmed by both houses",
        citation: "U.S. Const. amend. XXV",
        estimate: false,
      },
    },
    seats: [
      {
        id: `seat:US:${kind}`,
        officeId: `office:US:${kind}`,
        district: null,
        index: 0,
        coversTown: !TERRITORIES.has(stateKey),
        party:
          federalExecutive[kind === "president" ? "president" : "vicePresident"]
            .party,
      },
    ],
  });
  offices.push(
    executive("president", "President"),
    executive("vice-president", "Vice President"),
  );
  const congress = parties.congress[stateKey] ?? {};
  if (!TERRITORIES.has(stateKey) && stateKey !== "US-DC") {
    const id = `office:${stateKey}:us-senate`;
    offices.push({
      office: {
        id,
        level: "federal",
        jurisdiction: stateKey,
        governmentName: "United States Senate",
        kind: "us-senate",
        title: "U.S. Senator",
        seats: 2,
        termYears: 6,
        termStarts: "01-03",
        elected: true,
        districted: false,
        coversTown: true,
        source: "U.S. Const. art. I, § 3; amend. XVII",
        estimate: false,
        vacancyRule: rule(research[stateKey]?.usSenateVacancy, {
          method: "appointment-then-special",
          appointedBy: "governor",
          citation: "U.S. Const. amend. XVII",
          estimate: true,
        }),
      },
      seats: senateSeats(stateKey, congress.senate ?? []).map(
        ({ index, electionYear }) => ({
          id: `seat:${stateKey}:us-senate:${index}`,
          officeId: id,
          district: null,
          index,
          coversTown: true,
          party: congress.senate?.[index] ?? null,
          ...(electionYear !== undefined ? { electionYear } : {}),
        }),
      ),
    });
  }
  const house = districts(usps, "congressional");
  const mine = townDistrict(placeGeoid, usps, "congressional", date);
  const id = `office:${stateKey}:us-house`;
  const delegate = TERRITORIES.has(stateKey) || stateKey === "US-DC";
  offices.push({
    office: {
      id,
      level: "federal",
      jurisdiction: stateKey,
      governmentName: "United States House of Representatives",
      kind: delegate ? "us-house-delegate" : "us-house",
      title:
        stateKey === "US-PR"
          ? "Resident Commissioner"
          : delegate
            ? "Delegate"
            : "U.S. Representative",
      seats: Math.max(house.length, 1),
      termYears: stateKey === "US-PR" ? 4 : 2,
      // Every seat is up together: terms end at noon on January 3 of an odd
      // year (U.S. Const. amend. XX, § 1); Puerto Rico's commissioner is
      // elected with the presidency.
      nextElectionYear: congressionalElectionYear(
        date,
        stateKey === "US-PR" ? 4 : 2,
      ),
      termStarts: "01-03",
      elected: true,
      districted: !delegate,
      coversTown: true,
      source:
        "U.S. Const. art. I, § 2; 48 U.S.C. §§ 1711, 1751, 1731; 2 U.S.C. § 25a; 48 U.S.C. § 891",
      estimate: false,
      vacancyRule: {
        method: "special-election",
        citation: "U.S. Const. art. I, § 2, cl. 4",
        estimate: false,
      },
    },
    seats: (house.length ? house : [null]).map((d, index) => ({
      id: `seat:${stateKey}:us-house:${d?.districtCode ?? "at-large"}`,
      officeId: id,
      district: d?.districtCode ?? null,
      index,
      coversTown: d === null || d.geoid === mine?.geoid,
      party:
        congress[String(Number(d?.districtCode ?? 0))]?.[0] ??
        congress["0"]?.[0] ??
        null,
    })),
  });
  return offices;
}

const STATEWIDE = statewideParties as unknown as {
  places: Record<
    string,
    Record<string, { party: string | null; partisanElection: boolean }>
  >;
};
/**
 * The party holding a statewide executive office at the start, where its
 * election carries party labels (null for a nonpartisan office). The research
 * was compiled without live sources: SG-GOV-statewide-parties-unverified.
 */
function statewidePartyOf(stateKey: string, key: string): string | null {
  const row = STATEWIDE.places[stateKey]?.[key];
  if (!row?.partisanElection) return null;
  stopgap("SG-GOV-statewide-parties-unverified");
  return row.party;
}

/** The governor, every statewide elected office, and both legislative chambers. */
export function stateOffices(
  stateKey: string,
  placeGeoid: string,
  date: string,
): readonly OfficeWithSeats[] {
  const usps = stateKey.slice(3);
  const place = research[stateKey] ?? {};
  const offices: OfficeWithSeats[] = [];
  for (const executive of place.executives ?? []) {
    const id = `office:${stateKey}:${executive.key}`;
    offices.push({
      office: {
        id,
        level: "state",
        jurisdiction: stateKey,
        governmentName: stateKey,
        kind: executive.key,
        title: executive.title,
        seats: 1,
        termYears: executive.termYears ?? null,
        ...(executive.nextRegularElectionYear
          ? { nextElectionYear: executive.nextRegularElectionYear }
          : {}),
        elected: true,
        districted: false,
        coversTown: true,
        source: [executive.citation, executive.source]
          .filter(Boolean)
          .join(" "),
        estimate:
          (executive.estimate ?? false) || executive.sourceRetrieved === false,
        vacancyRule: rule(executive.vacancyRule, {
          method: "appointment",
          appointedBy: "governor",
          estimate: true,
        }),
      },
      seats: [
        {
          id: `seat:${stateKey}:${executive.key}`,
          officeId: id,
          district: null,
          index: 0,
          coversTown: true,
          party:
            executive.key === "governor"
              ? (governorParty.get(stateKey) ?? null)
              : statewidePartyOf(stateKey, executive.key),
        },
      ],
    });
  }
  const read = (chamber: string) =>
    place.legislature?.chambers?.find((c) => c.chamber === chamber);
  const unicameral =
    read("unicameral") !== undefined ||
    parties.places[stateKey]?.legislature !== undefined;
  const chambers: [
    string,
    DistrictChamber | null,
    "upper" | "lower" | "legislature",
  ][] = unicameral
    ? [["unicameral", "state-upper", "legislature"]]
    : [
        ["upper", "state-upper", "upper"],
        ["lower", "state-lower", "lower"],
      ];
  for (const [key, chamber, rosterChamber] of chambers) {
    const chamberRead = read(key);
    const geography = chamber ? districts(usps, chamber) : [];
    if (!chamberRead && geography.length === 0) continue;
    const mine = chamber ? townDistrict(placeGeoid, usps, chamber, date) : null;
    const id = `office:${stateKey}:legislature-${key}`;
    // One seat per member each district elects: the members the real roster
    // seats there (a multi-member district holds several), at least one.
    // Roster seats with no district geography (Puerto Rico's at-large
    // members) are elected by the whole state, the town included.
    const rows = roster(stateKey, rosterChamber);
    const matched = new Set<string>();
    const seats: SeatInput[] = [];
    const add = (
      district: string,
      members: readonly (string | null)[],
      covers: boolean,
    ) =>
      members.forEach((party, member) =>
        seats.push({
          id: `seat:${stateKey}:${key}:${district}:${member}`,
          officeId: id,
          district,
          index: seats.length,
          coversTown: covers,
          electionYear: seatElectionYear(
            stateKey,
            chamberRead,
            district,
            Number(date.slice(0, 4)),
          ),
          party,
        }),
      );
    for (const d of geography) {
      const name = rosterDistrict(rows, d);
      if (name !== null) matched.add(name);
      const members = name !== null ? rows[name]! : [];
      add(
        d.districtCode,
        members.length ? members : [null],
        d.geoid === mine?.geoid,
      );
    }
    for (const [name, members] of Object.entries(rows))
      if (!matched.has(name) && /large/i.test(name)) add(name, members, true);
    offices.push({
      office: {
        id,
        level: "state",
        jurisdiction: stateKey,
        governmentName: chamberRead?.name ?? stateKey,
        kind: `legislature-${key}`,
        title:
          key === "lower"
            ? "State Representative"
            : key === "unicameral"
              ? "Legislator"
              : "State Senator",
        seats: seats.length,
        termYears: chamberRead?.termYears ?? null,
        elected: true,
        districted: true,
        coversTown: seats.some((s) => s.coversTown),
        source: [
          chamberRead?.citation,
          chamberRead?.source,
          "Census Gazetteer 2025 legislative districts",
        ]
          .filter(Boolean)
          .join(" "),
        estimate:
          (chamberRead?.estimate ?? chamberRead === undefined) ||
          chamberRead?.sourceRetrieved === false,
        vacancyRule: rule(chamberRead?.vacancyRule, {
          method: "special-election",
          estimate: true,
        }),
      },
      seats,
    });
  }
  return offices;
}

const senateClassRows = (
  senateClasses as unknown as {
    states: Record<string, { party: string; nextElection: number }[]>;
  }
).states;

/**
 * A state's two Senate seats with each one's next regular (or special)
 * election from its real class, matched to the seat by its holder's party
 * as the world's races are (`world-races.ts`).
 */
function senateSeats(
  stateKey: string,
  parties: readonly string[],
): { index: number; electionYear?: number }[] {
  const used = new Set<number>();
  const years = new Map<number, number>();
  for (const cls of senateClassRows[stateKey] ?? []) {
    const index = [0, 1].find((i) => parties[i] === cls.party && !used.has(i));
    if (index === undefined) continue;
    used.add(index);
    years.set(index, cls.nextElection);
  }
  return [0, 1].map((index) =>
    years.has(index) ? { index, electionYear: years.get(index)! } : { index },
  );
}

/**
 * The next November a federal seat elected every `cycle` years is up: an
 * even year (every four from 2024 for a four-year cycle), this year until
 * November, else the next one.
 */
function congressionalElectionYear(date: string, cycle: number): number {
  let year = Number(date.slice(0, 4));
  // Election day falls November 2 to 8.
  if (date.slice(5) > "11-08") year += 1;
  while (year % 2 !== 0 || (cycle === 4 && (year - 2024) % 4 !== 0)) year += 1;
  return year;
}
