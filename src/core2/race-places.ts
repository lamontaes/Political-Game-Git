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
 * House district or the legislative district; empty for a local race.
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
    const places = statePlaces(usps);
    return {
      places,
      home: places.some((p) => p.id === county) ? county : null,
    };
  }
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    const place = housePlaceByGeoid(usps, district?.geoid ?? null);
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
      ? (statePlaces(usps).find((p) => p.id === county)?.rightShare ?? null)
      : null;
    const place = legislativePlace(
      usps,
      contest.seatId,
      districts,
      partySide(holder?.party ?? null),
      own,
    );
    return place
      ? { places: [place], home: place.id }
      : { places: [], home: null };
  }
  return { places: [], home: null };
}
