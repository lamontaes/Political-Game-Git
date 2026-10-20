import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { CORRUPTION_MODULE_ID } from "./modules/corruption";
import { newsKey } from "./modules/news";
import { scandalTerm, voterLean } from "./modules/voting";
import { coreAPI } from "./state";

// The scandal term in a voter's appeal reads that voter's own knowledge of the
// story (never a flag): negative, weighed by trust in the press, for exactly
// the voters a story reached, and zero for the rest.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("is negative for the voters a scandal story reached and zero for the rest", () => {
  setBookkeeping(true);
  const draw = drawPlace(seed, "scandal-term");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const today = makeIsoDate(core.date);
  const adults = [...core.people.values()].filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      ageOnDate(makeIsoDate(p.birthDate), today) >= 18,
  );
  expect(adults.length, where).toBeGreaterThan(10);
  const [candidate, ...voters] = adults;
  // A taken bribe reported to the press about the candidate, and the story
  // reaching every other voter by turn.
  const storyId = `story:scandal-term:${candidate!.id}`;
  api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("reported")
    .put({
      id: storyId,
      officialId: candidate!.id,
      date: core.date,
    } as never);
  const heard = new Set<string>();
  for (const [i, voter] of voters.entries())
    if (i % 2 === 0) {
      api.observe(voter.id, {
        key: newsKey(storyId),
        value: "printed",
        learnedAt: core.date,
        sourceId: storyId,
        access: "public",
      });
      heard.add(voter.id);
    }
  expect(heard.size, where).toBeGreaterThan(3);
  for (const voter of voters) {
    const term = scandalTerm(
      api,
      voter.id,
      candidate!.id,
      voterLean(api, voter),
    );
    if (heard.has(voter.id))
      expect(term, `${where} ${voter.id}`).toBeLessThan(0);
    else expect(term, `${where} ${voter.id}`).toBe(0);
  }
  // Another candidate with no story is untouched for everyone.
  const other = voters.find((v) => !heard.has(v.id))!;
  expect(
    scandalTerm(api, voters[0]!.id, other.id, voterLean(api, voters[0]!)),
    where,
  ).toBe(0);
});
