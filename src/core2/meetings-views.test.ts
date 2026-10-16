import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { personLean, personStance } from "./campaign-views";
import { holdTownHall } from "./modules/meetings";
import { townSeats } from "./modules/offices";
import { VIEWS_MODULE_ID, viewOn } from "./modules/views";
import { coreAPI } from "./state";

// A town hall's host answers from their current views, not from their opening
// lean alone: what the host has heard since moves the answer.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "town-hall-views");

it(`a host who has heard a case answers from it in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const host = townSeats(api).find((seat) => seat.holder?.personId)?.holder
    ?.personId;
  expect(host, where).toBeTruthy();
  const hostPerson = core.people.get(host!)!;
  const lean = personLean(core.people, hostPerson, 0);
  const hall = holdTownHall(api, { hostId: host! });
  expect(hall.questions.length, where).toBeGreaterThan(0);
  // Before hearing anything the host answers from their lean along the axis.
  for (const answer of hall.answers)
    if (answer.position !== null)
      expect(answer.position, where).toBe(
        Math.sign(viewOn(api, host!, answer.question, lean)),
      );
  // A case against their lean on each asked question, heard before the next hall.
  const table = api.moduleState(VIEWS_MODULE_ID).table("stances");
  for (const { question } of hall.questions) {
    const own = personStance(lean, question);
    table.put({
      id: `${host}:${question}`,
      personId: host,
      topic: question,
      desiredChange: own > 0 ? "repeal" : "enact",
      strength: 0.6,
      causes: [],
    } as never);
  }
  const heard = holdTownHall(api, { hostId: host! });
  let flipped = 0;
  for (const answer of heard.answers) {
    if (answer.position === null) continue;
    const view = viewOn(api, host!, answer.question, lean);
    expect(answer.position, where).toBe(Math.sign(view));
    if (answer.position !== Math.sign(personStance(lean, answer.question)))
      flipped += 1;
  }
  expect(flipped, `${where}: a heard case changed an answer`).toBeGreaterThan(
    0,
  );
}, 600_000);
