import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import powers from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { RECORD_MODULE_ID } from "./modules/record";
import { coreAPI } from "./state";

// The opening's prior term must not have a body vote on a question the
// powers catalog gives only another level (Playtest Nov 23, C6: a borough
// council "passed a graduated income tax", a question of the state's own
// income tax; the bill catalog's amount policy for the income-tax rate lists
// the town, and its series speaks to that question). The oracle here is the
// research file, not the bill catalog the engine reads.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const questions = powers.questions as unknown as Record<
  string,
  { levels: readonly string[] }
>;

it(`a past roll call is on a question its body's level holds the power for, seed ${seed}`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let placesChecked = 0;
  for (let draw = 0; draw < 8 && placesChecked < 2; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "past-votes-by-power");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    // The District's one government holds the state, county and city powers
    // together, so a body there is read against any of them.
    const district = place.state === "US-DC";
    let built: ReturnType<typeof buildBenchWorld>;
    try {
      built = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passedOver.push(`${where}: ${error.message}`);
      continue;
    }
    const api = coreAPI(built.core);
    const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
    const votes = api
      .moduleState(RECORD_MODULE_ID)
      .table("votes")
      .rows() as unknown as {
      id: string;
      body: string;
      question: string;
      billId: string;
    }[];
    let checked = 0;
    for (const vote of votes) {
      if (!String(vote.billId).startsWith("past-bill:")) continue;
      const office = offices.get(vote.body) as { level?: string } | undefined;
      if (!office?.level || office.level === "federal") continue;
      const row = questions[vote.question];
      if (!row) continue;
      const level = office.level === "township" ? "city" : office.level;
      checked += 1;
      const holds = district
        ? row.levels.some((l) => ["state", "county", "city"].includes(l))
        : row.levels.includes(level);
      expect(
        holds,
        `${where}: ${vote.id} (${office.level} body ${vote.body}) voted on ${vote.question}, a power held only at ${row.levels.join(", ")}`,
      ).toBe(true);
    }
    if (checked) placesChecked += 1;
    else passedOver.push(where);
  }
  expect(
    placesChecked,
    `two places with past votes; passed over: ${passedOver.join("; ")}`,
  ).toBe(2);
  expect(
    passedOver.length,
    `passed over more places than checked: ${passedOver.join("; ")}`,
  ).toBeLessThanOrEqual(placesChecked);
}, 150_000);
