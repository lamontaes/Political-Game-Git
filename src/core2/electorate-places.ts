/**
 * The places outside the town that vote in its races, and in the races it
 * only sees from afar, at a coarser level (owner, Oct 14, 2026): a county, a
 * U.S. House district, a state legislative district's share of its state.
 * Each is sized and placed on the lean scale from its real 2024 vote; it
 * votes on the counted residents' engine (`electorate.ts`), never a model of
 * its own. The figures here are inputs: how many eligible voters a place
 * holds (its 2024 two-party votes over its state's CPS citizen turnout) and
 * where it leans (its 2024 Republican two-party share, net of the holder's
 * incumbency where a holder carried the seat then).
 */
import COUNTY_PRESIDENTIAL from "./data/county-presidential-2024.json" with { type: "json" };
import PLACE_CITIZENSHIP from "./data/place-citizenship-2024.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import delegates from "../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import { partySide } from "./appointments";
import { campaignParameter } from "./campaign-views";
import {
  LEGISLATIVE_RESULTS_CITATION,
  legislativeDistrictResult,
  legislativeSeatParts,
} from "./legislative-district-results";
import { parameter } from "./parameters";
import { corePlaceStateIdentities } from "./place-lookup";
import { lazyValue, readJsonData } from "./reference/lazy-data";

/** A place counted coarsely: how many may vote there and where it leans. */
export interface ElectoratePlace {
  readonly id: string;
  readonly name: string;
  /** Eligible voters (adult citizens). */
  readonly eligible: number;
  /** The Republican two-party share its people stand at on the lean order. */
  readonly rightShare: number;
  /** Its 2024 two-party votes. */
  readonly votes2024: number;
  readonly source: string;
}

interface CpsRow {
  dimension: string;
  geographyName: string;
  group: string;
  recordId: string;
  metrics: Record<string, { value: { value?: number } }>;
}
// Read on first use; only the age and total rows this reads are kept, each
// with the three measures it uses (the full corpus carries evidence for every cell).
const CPS = lazyValue(() =>
  (
    readJsonData(
      new URL(
        "../../data/source/census-voting-registration/corpus.json",
        import.meta.url,
      ),
    ) as readonly CpsRow[]
  )
    .filter((row) => row.dimension === "age" || row.dimension === "total")
    .map((row): CpsRow => ({
      dimension: row.dimension,
      geographyName: row.geographyName,
      group: row.group,
      recordId: row.recordId,
      metrics: Object.fromEntries(
        ["votedCitizenPercent", "adultPopulation", "citizenAdultPopulation"]
          .filter((key) => row.metrics[key] !== undefined)
          .map((key) => [key, { value: { ...row.metrics[key]!.value } }]),
      ),
    })),
);
const CPS_CITATION =
  "U.S. Census Bureau, Current Population Survey, November 2024 Voting and Registration Supplement, table 4c";

export const CPS_AGE_BANDS: readonly [number, number, string][] = [
  [18, 25, "18 to 24 years"],
  [25, 35, "25 to 34 years"],
  [35, 45, "35 to 44 years"],
  [45, 65, "45 to 64 years"],
  [65, 200, "65 years and over"],
];

/** The CPS age band an age falls in. */
export function cpsAgeBand(age: number): string | undefined {
  return CPS_AGE_BANDS.find(([min, max]) => age >= min && age < max)?.[2];
}

const stateNames = new Map<string, string>();
function stateName(usps: string): string | undefined {
  if (!stateNames.size)
    for (const row of corePlaceStateIdentities())
      stateNames.set(row.usps, row.name);
  return stateNames.get(usps);
}

/**
 * A state's November 2024 CPS citizen turnout and citizen share of adults,
 * for one age band or all ages (the national row where the survey has no
 * state row, as for the island areas).
 */
export function cpsTurnout(
  usps: string,
  band?: string,
): {
  readonly turnout: number;
  readonly citizenShare: number;
  readonly recordId: string;
  readonly national: boolean;
} | null {
  const name = stateName(usps)?.toUpperCase();
  const find = (geography: string) =>
    CPS().find(
      (row) =>
        row.geographyName === geography &&
        (band
          ? row.dimension === "age" && row.group === band
          : row.dimension === "total"),
    );
  const row = (name ? find(name) : undefined) ?? find("UNITED STATES");
  const voted = row?.metrics.votedCitizenPercent?.value.value;
  if (!row || voted === undefined) return null;
  const adults = row.metrics.adultPopulation?.value.value,
    citizens = row.metrics.citizenAdultPopulation?.value.value;
  return {
    turnout: voted / 100,
    citizenShare:
      adults && citizens !== undefined ? Math.min(1, citizens / adults) : 1,
    recordId: row.recordId,
    national: row.geographyName !== name,
  };
}

/**
 * The town's citizen share of adults: its ACS 2020-2024 count, blended with
 * its state's CPS share so a small place's noisy sample leans on its state.
 */
export function citizenShareOf(
  placeKey: string | undefined,
  usps: string,
): number {
  const state = cpsTurnout(usps)?.citizenShare ?? 1;
  const own = placeKey
    ? (
        PLACE_CITIZENSHIP.byPlace as unknown as Record<string, [number, number]>
      )[placeKey]
    : undefined;
  if (!own) return state;
  const prior = parameter("citizenShareStatePriorAdults");
  return (own[0] + prior * state) / (own[1] + prior);
}

/** Eligible voters behind a place's 2024 votes, at its state's citizen turnout. */
function eligibleFor(usps: string, votes: number): number {
  const turnout = cpsTurnout(usps)?.turnout;
  return Math.round(turnout ? votes / turnout : votes);
}

function makePlace(
  id: string,
  name: string,
  usps: string,
  dem: number,
  rep: number,
  source: string,
  holderSide = 0,
): ElectoratePlace | null {
  if (dem + rep <= 0) return null;
  const target = rep / (dem + rep);
  return {
    id,
    name,
    eligible: eligibleFor(usps, dem + rep),
    // The holder's incumbency carried part of the 2024 vote; the place's
    // people stand where the rest of it puts them.
    rightShare: Math.max(
      0,
      Math.min(1, target - holderSide * campaignParameter("incumbencyShare")),
    ),
    votes2024: dem + rep,
    source: `${source}; ${CPS_CITATION}`,
  };
}

const COUNTY_ROWS = COUNTY_PRESIDENTIAL.byStateCounty as unknown as Record<
  string,
  [number, number]
>;
const COUNTY_CITATION = COUNTY_PRESIDENTIAL.citation;
const COUNTIES_BY_STATE = (() => {
  const byState = new Map<string, [string, [number, number]][]>();
  for (const [name, row] of Object.entries(COUNTY_ROWS)) {
    const usps = name.slice(0, name.indexOf("|"));
    byState.set(usps, [...(byState.get(usps) ?? []), [name, row]]);
  }
  return byState;
})();
const CAL = calibration as unknown as {
  presidentialByState: {
    stateUsps: string;
    totalsByParty: Record<string, number>;
  }[];
  house: {
    stateUsps: string;
    districtCode: string;
    districtGeoid: string;
    certifiedWinnerParty: string | null;
    candidateTotalsByParty: Record<string, number>;
  }[];
};
const CLERK =
  "Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024";
const DELEGATES = (
  delegates as unknown as {
    places: Record<
      string,
      { democraticPercent: number; republicanPercent: number }
    >;
  }
).places;

/** Whether a state's voters choose the President: the 50 states and the District do; the territories do not. */
export function choosesPresident(stateKey: string): boolean {
  const usps = stateKey.replace(/^US-/, "");
  return CAL.presidentialByState.some((s) => s.stateUsps === usps);
}

const statePlaceCache = new Map<string, readonly ElectoratePlace[]>();
/**
 * A state's places: its counties' 2024 presidential vote, or the state's
 * whole vote where no county is recorded; a territory with no presidential
 * vote is one place at its 2024 delegate race's lean, sized by the caller
 * (its eligible voters).
 */
export function statePlaces(
  usps: string,
  territoryEligible?: number,
): readonly ElectoratePlace[] {
  const key = `${usps}|${territoryEligible ?? ""}`;
  const hit = statePlaceCache.get(key);
  if (hit) return hit;
  const places: ElectoratePlace[] = [];
  for (const [name, [dem, rep]] of COUNTIES_BY_STATE.get(usps) ?? []) {
    const place = makePlace(
      `county:${name}`,
      name.slice(usps.length + 1),
      usps,
      dem,
      rep,
      COUNTY_CITATION,
    );
    if (place) places.push(place);
  }
  if (!places.length) {
    const state = CAL.presidentialByState.find((s) => s.stateUsps === usps);
    const delegate = DELEGATES[usps];
    const place = state
      ? makePlace(
          `state:${usps}`,
          usps,
          usps,
          state.totalsByParty.democratic ?? 0,
          state.totalsByParty.republican ?? 0,
          CLERK,
        )
      : delegate && territoryEligible
        ? {
            id: `state:${usps}`,
            name: usps,
            eligible: territoryEligible,
            rightShare:
              delegate.republicanPercent /
              (delegate.democraticPercent + delegate.republicanPercent),
            votes2024: 0,
            source:
              "2024 delegate race (data/research/elections/house-delegates-2024.json), sized from the place's own eligible voters",
          }
        : null;
    if (place) places.push(place);
  }
  statePlaceCache.set(key, places);
  return places;
}

/** A state's two-party presidential votes in 2024. */
export function stateTwoPartyVotes(usps: string): number {
  let votes = stateVotesCache.get(usps);
  if (votes === undefined) {
    votes = statePlaces(usps).reduce((sum, b) => sum + b.votes2024, 0);
    stateVotesCache.set(usps, votes);
  }
  return votes;
}
const stateVotesCache = new Map<string, number>();

/** A state's whole Republican two-party share in 2024. */
export function stateRightShare(usps: string): number | null {
  const places = statePlaces(usps);
  const votes = places.reduce((s, b) => s + b.votes2024, 0);
  return votes
    ? places.reduce((s, b) => s + b.votes2024 * b.rightShare, 0) / votes
    : null;
}

/**
 * A U.S. House district: its 2024 House vote, net of the incumbency the 2024
 * winner carried, so that the same holder standing again with the opening's
 * inputs lands on 2024. A seat no one contested in 2024 leans like its
 * state's typical district toward the winner by the typical margin, sized as
 * the state's average district.
 */
export function housePlace(usps: string, code: string): ElectoratePlace | null {
  const key = `${usps}-${code}`;
  if (!houseCache.has(key)) houseCache.set(key, readHousePlace(usps, code));
  return houseCache.get(key)!;
}
const houseCache = new Map<string, ElectoratePlace | null>();
function readHousePlace(usps: string, code: string): ElectoratePlace | null {
  const row = CAL.house.find(
    (h) => h.stateUsps === usps && h.districtCode === code,
  );
  const winner = row?.certifiedWinnerParty;
  // The one place the game decides a party's side: the party-sides data.
  const side = partySide(winner);
  const dem = row?.candidateTotalsByParty.democratic ?? 0;
  const rep = row?.candidateTotalsByParty.republican ?? 0;
  if (row && dem > 0 && rep > 0)
    return makePlace(
      `district:${row.districtGeoid}`,
      `${usps}-${code}`,
      usps,
      dem,
      rep,
      CLERK,
      side,
    );
  const districts = CAL.house.filter((h) => h.stateUsps === usps).length || 1;
  const votes = stateTwoPartyVotes(usps) / districts;
  if (!votes) return null;
  const share = 0.5 + side * campaignParameter("legislativeSeatMargin");
  return makePlace(
    `district:${row?.districtGeoid ?? `${usps}${code}`}`,
    `${usps}-${code}`,
    usps,
    votes * (1 - share),
    votes * share,
    `${CLERK} (uncontested in 2024: the holder's party at the typical margin)`,
    side,
  );
}

/** A U.S. House district by its district identity (GEOID). */
export function housePlaceByGeoid(
  usps: string,
  geoid: string | null,
): ElectoratePlace | null {
  const row = geoid
    ? CAL.house.find((h) => h.districtGeoid === geoid)
    : undefined;
  if (row) return housePlace(row.stateUsps, row.districtCode);
  // An at-large seat: the state's one district.
  const only = CAL.house.filter((h) => h.stateUsps === usps);
  return only.length === 1 ? housePlace(usps, only[0]!.districtCode) : null;
}

/**
 * A state legislative district: its own 2024 vote where the source has one
 * with both parties contesting it, else the state's two-party vote over its
 * districts leaning like the town's own county where the town votes in it,
 * else toward its holder's party at the typical margin; net of the holder's
 * incumbency.
 */
export function legislativePlace(
  usps: string,
  seatKey: string,
  districts: number,
  holderSide: number,
  ownRightShare: number | null,
): ElectoratePlace | null {
  const votes = stateTwoPartyVotes(usps) / Math.max(1, districts);
  if (!votes) return null;
  const parts = legislativeSeatParts(seatKey);
  const own = parts
    ? legislativeDistrictResult(usps, parts.chamber, parts.district)
    : null;
  const share = own
    ? own.republican / (own.democratic + own.republican)
    : (ownRightShare ??
      0.5 + holderSide * campaignParameter("legislativeSeatMargin"));
  const place = makePlace(
    `legislative:${seatKey}`,
    seatKey,
    usps,
    votes * (1 - share),
    votes * share,
    own
      ? `${LEGISLATIVE_RESULTS_CITATION} (the district's own 2024 vote)`
      : ownRightShare === null
        ? `${CLERK} (state two-party vote over its districts; the holder's party at the typical margin)`
        : `${CLERK} (state two-party vote over its districts; the town's county's 2024 lean)`,
    holderSide,
  );
  return place;
}

/** The county place a town's counties fall in, from its recorded county names. */
export function countyPlaceIdOf(
  countyNames: string | undefined,
  usps: string,
): string | null {
  if (!countyNames) return null;
  const stateName = countyNames.split(", ").at(-1)!;
  for (const name of countyNames
    .slice(0, countyNames.length - stateName.length)
    .split(/;\s*|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean))
    if (COUNTY_ROWS[`${usps}|${name}`]) return `county:${usps}|${name}`;
  return null;
}
