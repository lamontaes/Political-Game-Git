/**
 * The places a race's electorate lives in (the state's counties, a House
 * district, a legislative district), read by the voting engine to count the
 * wider electorate and by the campaign engine to size the donors outside the
 * town. Moved out of voting.ts so campaigns can read it without importing the
 * voting engine, which imports campaigns.
 */
import {
  countyPlaceIdOf,
  housePlaceByGeoid,
  legislativePlace,
  statePlaces,
  type ElectoratePlace,
} from "./electorate-places";
import { partySide } from "./appointments";
import { townDistrict, type SeatInput } from "./offices-state";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import territoryPlaces from "./data/places/territory-places.json" with { type: "json" };
import { shareValue } from "./shares";
import type { CoreAPI } from "./types";

function raceTown(api: CoreAPI) {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
}

/**
 * The places a race's electorate lives in, before the town's own voters are
 * set apart: the state's counties (a statewide office, the presidency), the
 * House district, the legislative district or the town's county (a county
 * office); empty for a town race.
 * `home` is the place the town lies in, where one is recorded.
 */
export function basePlaces(
  api: CoreAPI,
  contest: ContestRow,
): { places: readonly ElectoratePlace[]; home: string | null } {
  const { stateKey, geoid } = raceTown(api);
  const usps = stateKey.slice(3);
  if (contest.family === "statewideExecutive") {
    const county = countyPlaceIdOf(
      api.state.placeMetadata.countyNames as string | undefined,
      usps,
    );
    const places = statePlaces(usps, api.state.seed);
    return {
      places,
      home: places.some((p) => p.id === county) ? county : null,
    };
  }
  if (contest.family === "countyOffice") {
    // The town's own county: its people outside the town vote on the same
    // engine as the town's counted residents, coarser (racePlaces sets the
    // town's own voters apart from it). A town with no county on record (an
    // island area) votes alone.
    const county = countyPlaceIdOf(
      api.state.placeMetadata.countyNames as string | undefined,
      usps,
    );
    const place = county
      ? statePlaces(usps, api.state.seed).find((p) => p.id === county)
      : undefined;
    return place
      ? { places: [place], home: place.id }
      : { places: [], home: null };
  }
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    const place = housePlaceByGeoid(
      usps,
      district?.geoid ?? null,
      api.state.seed,
    );
    return place
      ? { places: [place], home: place.id }
      : { places: [], home: null };
  }
  if (contest.family === "stateLegislative") {
    const seats = api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .query("byOffice", [contest.officeId]) as unknown as SeatInput[];
    const districts = new Set(seats.map((s) => s.district)).size;
    const holder = contest.incumbentTermId
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(contest.incumbentTermId) as unknown as TermRow | undefined)
      : undefined;
    const county = countyPlaceIdOf(
      api.state.placeMetadata.countyNames as string | undefined,
      usps,
    );
    const own = county
      ? (statePlaces(usps, api.state.seed).find((p) => p.id === county)
          ?.rightShare ?? null)
      : null;
    const place = legislativePlace(
      usps,
      contest.seatId,
      districts,
      partySide(holder?.party ?? null),
      own,
      api.state.seed,
    );
    return place
      ? { places: [place], home: place.id }
      : { places: [], home: null };
  }
  return { places: [], home: null };
}

/** The people of each island area's villages (their 2020 counts), by state code. */
const islandPeople = new Map<string, number>();
for (const row of territoryPlaces.rows as readonly (readonly unknown[])[])
  islandPeople.set(
    String(row[2]),
    (islandPeople.get(String(row[2])) ?? 0) + Number(row[5]),
  );

/** One place of a race's electorate outside the town: its counted voters. */
export interface OutsideVoters {
  readonly id: string;
  /** Eligible voters outside the town. */
  readonly eligible: number;
  /** The Republican two-party share its people stand at on the lean order. */
  readonly rightShare: number;
  /** Its last two-party votes, outside the town. */
  readonly votes: number;
}

/**
 * A race's whole electorate where it reaches past the town, for its petition
 * (owner, Nov 14: a race needs the number its own law sets for its own
 * electorate, never a town's share): its eligible voters, their last
 * two-party votes and lean, and the counted voters outside the town by
 * place, whom a campaign's paid circulators can reach. The places are the
 * race's (`basePlaces`), the town's own voters set apart from its home
 * place. An island area's state or federal race, whose villages' voters are
 * not on record, reads the island's people (shared among the office's
 * districts) at the town's own voters per resident. Null for a town race, or
 * a race the world holds no one outside the town for.
 */
export function wideElectorate(
  api: CoreAPI,
  contest: ContestRow,
  town: { readonly voters: number; readonly population: number },
): {
  readonly eligible: number;
  readonly votes: number;
  readonly rightShare: number;
  readonly outside: readonly OutsideVoters[];
} | null {
  const { places, home } = basePlaces(api, contest);
  if (places.length) {
    const outside = places.map((p) => {
      const kept =
        p.id === home && p.eligible > 0
          ? Math.max(0, p.eligible - town.voters) / p.eligible
          : 1;
      return {
        id: p.id,
        eligible: p.eligible * kept,
        rightShare: p.rightShare,
        votes: p.votes2024 * kept,
      };
    });
    const eligible = places.reduce((n, p) => n + p.eligible, 0);
    if (eligible <= 0) return null;
    return {
      eligible,
      votes: places.reduce((n, p) => n + p.votes2024, 0),
      rightShare:
        places.reduce((n, p) => n + p.rightShare * p.eligible, 0) / eligible,
      outside: outside.filter((p) => p.eligible >= 1),
    };
  }
  if (contest.level !== "state" && contest.level !== "federal") return null;
  const { stateKey } = raceTown(api);
  const people = islandPeople.get(stateKey.slice(3)) ?? 0;
  if (people <= 0 || town.population <= 0) return null;
  const districts =
    contest.family === "stateLegislative"
      ? new Set(
          (
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("seats")
              .query("byOffice", [contest.officeId]) as unknown as SeatInput[]
          ).map((s) => s.district ?? ""),
        ).size || 1
      : 1;
  const eligible = Math.max(
    town.voters,
    ((people / districts) * town.voters) / town.population,
  );
  const even = shareValue("evenSplit");
  return {
    eligible,
    votes: 0,
    rightShare: even,
    outside:
      eligible - town.voters >= 1
        ? [
            {
              id: `island:${stateKey}:${contest.seatId}`,
              eligible: eligible - town.voters,
              rightShare: even,
              votes: 0,
            },
          ]
        : [],
  };
}
