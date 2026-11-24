import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { contestPositions } from "./contest-positions";
import { members } from "./modules/legislature";
import { townHallDrives } from "./modules/meetings";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A resident stands up at a town hall with a question the host's seat can
// decide (owner rule 99, the debate's own chooser), not the one they feel
// most strongly of every question in the game: at a town board the rooms asked
// about right-to-work rules, which no board decides. Who comes is unchanged.
// Roy, Montana, seed meet-a1:1, a three-seat board.
it("Roy, Montana (meet-a1:1): every resident's question is one the host's seat decides", () => {
  setBookkeeping(false);
  const place = drawPlace("meet-a1:1", "meetings-floor");
  expect(place.name).toBe("Roy, Montana");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)?.placeId;
  const term = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byStatus", ["serving"]) as unknown as TermRow[]
  )
    .filter((row) => {
      const person = core.people.get(row.personId as PersonId);
      return (
        person?.alive === true &&
        person.placeId === town &&
        members(api, row.officeId).length > 1
      );
    })
    .sort(
      (a, b) =>
        a.officeId.localeCompare(b.officeId) || a.id.localeCompare(b.id),
    )[0]!;
  const decides = new Set(contestPositions(api, { officeId: term.officeId }));
  expect(decides.size, "the seat decides some questions").toBeGreaterThan(0);
  const host = townHallDrives(api, term.personId!);
  expect(host.length, "a room").toBeGreaterThan(0);
  for (const row of host)
    expect(decides.has(row.question!), `${row.p.id}: ${row.question}`).toBe(
      true,
    );
  // The same town's room with no seat behind the host asks past what a board decides.
  const anyone = townHallDrives(api, "nobody");
  expect(
    anyone.some((row) => !decides.has(row.question!)),
    "without a seat the room asks questions this board cannot decide",
  ).toBe(true);
  // Who comes is the same either way: the seat shapes the question, not the room.
  const roomOf = (rows: typeof host) =>
    rows.map((row) => row.p.id).filter((id) => id !== term.personId);
  expect(roomOf(host).sort()).toEqual(roomOf(anyone).sort());
}, 120_000);
