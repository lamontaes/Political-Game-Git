import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { partiesHere, partyTie, tieBeforeFiling } from "./modules/parties";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

// A resident the monthly party meeting has not met yet takes their tie by the
// meeting's own rule when they file for a partisan seat (owner, Nov 15: House
// seats read as missing a major party because four filers carried no label,
// and were tied days later). Pinned at Las Cruces, New Mexico, where 38 of the
// town's adults have no tie on the opening day and the monthly meetings tie
// them over the next year. The played year that shows the filers' labels is
// read in the pull request (House seats missing a major party at four places,
// 4 of 11 before and 1 of 11 after); this test pins the rule itself on the
// opening day, about a minute.
const PLACE = drawPlace("fields-measure2", "c");

it(
  `an untied resident takes the party their views name, once (${PLACE.name})`,
  { timeout: 90_000 },
  () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const api = coreAPI(core);
    const parties = partiesHere(api);
    const townId = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as { townPlaceId: string }
    ).townPlaceId;
    const untied = [...(core.peopleByPlace.get(townId) ?? [])]
      .map((id) => core.people.get(id)!)
      .filter((p) => p.alive && !partyTie(api, p.id) && core.playerId !== p.id);
    expect(untied.length, PLACE.name).toBeGreaterThan(0);
    let tied = 0;
    for (const person of untied.slice(0, 40)) {
      tieBeforeFiling(api, person.id);
      const tie = partyTie(api, person.id);
      if (!tie) continue; // a child
      tied += 1;
      expect(tie.reason).toBe("newly-tied");
      if (tie.partyId) {
        const party = parties.find((row) => row.id === tie.partyId)!;
        expect(Math.sign(tie.lean), `${person.id} lean ${tie.lean}`).toBe(
          party.side,
        );
      }
      const first = partyTie(api, person.id)!;
      tieBeforeFiling(api, person.id);
      expect(partyTie(api, person.id)).toEqual(first);
    }
    expect(tied, PLACE.name).toBeGreaterThan(0);
  },
);
