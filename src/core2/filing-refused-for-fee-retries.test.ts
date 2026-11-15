import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { decisionOf, filingWindowOpens } from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  filingRulesFor,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A person who decided to stand and was refused at the counter only for the
// filing fee keeps trying through the window, and files the day they can pay
// (owner, Nov 15). Pinned at Mountain Home, North Carolina, where the House
// member decided to stand again and, in a world played through to April 2026
// in one step, held $1,291 on the filing day against the $1,740 fee and was
// never filed. The same world played to the opening day in one step has the
// member filing (they held $2,143), so the case is staged: the day before the
// window opens the member holds less than the fee, and pay day is the fee put
// in their account a few days later. The filing itself goes through the
// game's own counter both times.
// About two minutes of played days (the opening nine months), so the limit is
// near twice that.
const PLACE = drawPlace("fields-measure2", "b");

it(`a member refused for the fee files the day they can pay (${PLACE.name})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const house = (
    elections.table("contests").rows() as unknown as ContestRow[]
  ).find((row) => row.family === "usHouse")!;
  const memberId = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .get(house.incumbentTermId!) as unknown as { personId: PersonId }
  ).personId;
  const opens = filingWindowOpens(api, house);
  const fee = filingRulesFor(api, house, "party").feeMinor;
  advanceCore(core, addDays(makeIsoDate(opens), -1));
  core.people.get(memberId)!.liquidMinor = fee - 100;
  advanceCore(core, makeIsoDate(opens));
  const refused = decisionOf(api, house.id, memberId)!;
  expect(refused.run, PLACE.name).toBe(true);
  expect(refused.filing?.unmet, PLACE.name).toEqual(["filing-fee"]);
  const filings = () =>
    (
      elections
        .table("filings")
        .query("byContest", [house.id]) as unknown as FilingRow[]
    ).filter((row) => row.personId === memberId);
  expect(filings(), "no filing while refused").toEqual([]);
  // A few days with the fee still out of reach: still no filing, still trying.
  advanceCore(core, addDays(makeIsoDate(opens), 3));
  expect(filings(), "no filing before they can pay").toEqual([]);
  // Pay day.
  core.people.get(memberId)!.liquidMinor = fee * 2;
  advanceCore(core, addDays(makeIsoDate(opens), 4));
  expect(
    filings().map((row) => row.status),
    PLACE.name,
  ).toEqual(["on-ballot"]);
  expect(decisionOf(api, house.id, memberId)!.filing?.status).toBe("on-ballot");
}, 300_000);
