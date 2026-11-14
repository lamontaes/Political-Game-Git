import { describe, expect, it, vi } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { bodyOf, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, type CoreState } from "../core2/state";
import { officeView } from "./office";
import { buildBenchWorld } from "./world";

// A member of a body that meets keeps the meetings switch whether or not the body's calendar holds
// a meeting just now (the switch follows the seat, not the date). The calendar is emptied here
// by a stand-in for the one lookup that reads it, so the only thing left to show the switch is
// the seat's body. Heber Springs, Arkansas, the council the switch test plays.
vi.mock("../core2/modules/office-day", async (original) => ({
  ...(await original()),
  nextMeetingDate: () => null,
}));

const PLACE = {
  key: "0531090",
  name: "Heber Springs, Arkansas",
  seed: "fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d",
};

describe(`meetings switch with an empty calendar (${PLACE.name}, seed ${PLACE.seed})`, () => {
  it("a council member keeps the switch, on", () => {
    const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const core = world.core as CoreState;
    const api = coreAPI(core);
    const body = [
      ...new Set(
        townSeats(api)
          .filter(
            (s) =>
              ["city", "township", "county"].includes(s.office.level) &&
              bodyOf(api, s.office.id),
          )
          .map((s) => s.office.id),
      ),
    ].find((id) => members(api, id).length > 1)!;
    const member = members(api, body).find((t) => t.personId)!.personId!;
    expect(officeView(core, member).stops).toEqual([
      { key: "meetings", on: true },
    ]);
  }, 290_000);
});
