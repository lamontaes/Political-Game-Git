import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { PLATFORM_QUESTIONS, personLean, personStance } from "./campaign-views";
import { townSeats } from "./modules/offices";
import { hireStaff, staffCandidates, workQuality } from "./modules/staff";
import { VIEWS_MODULE_ID } from "./modules/views";
import { coreAPI } from "./state";

// An aide's passion for a question is how strongly they feel about it now:
// what they have heard since the opening moves it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "staff-passion-views");

it(`an aide who has heard a case feels differently about the question in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const seat = townSeats(api).find((s) => s.holder?.personId);
  expect(seat, where).toBeTruthy();
  const official = seat!.holder!.personId!;
  const candidate = staffCandidates(api, official)[0];
  expect(candidate, `${where}: someone the official could hire`).toBeTruthy();
  const aide = hireStaff(api, {
    officialId: official,
    personId: candidate!.personId,
    role: "aide",
  });
  const person = core.people.get(aide.personId)!;
  const lean = personLean(core.people, person, 0);
  // A question the aide's lean puts at less than full strength, so a case can move it.
  const question = PLATFORM_QUESTIONS.find(
    (q) =>
      Math.abs(personStance(lean, q)) > 0.05 &&
      Math.abs(personStance(lean, q)) < 0.6,
  );
  expect(question, where).toBeTruthy();
  const before = workQuality(api, aide, question!).parts.passion;
  const own = personStance(lean, question!);
  api
    .moduleState(VIEWS_MODULE_ID)
    .table("stances")
    .put({
      id: `${aide.personId}:${question}`,
      personId: aide.personId,
      topic: question,
      desiredChange: own > 0 ? "enact" : "repeal",
      strength: 0.2,
      causes: [],
    } as never);
  const after = workQuality(api, aide, question!).parts.passion;
  expect(
    after,
    `${where}: a case heard in their own direction`,
  ).toBeGreaterThan(before);
}, 600_000);
