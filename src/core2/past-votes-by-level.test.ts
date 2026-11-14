import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import provisionQuestions from "../../data/research/legislature/provision-questions.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { RECORD_MODULE_ID } from "./modules/record";
import { coreAPI } from "./state";

// The opening's prior term records roll calls of every chamber covering the
// town. A county commissioner's "Votes you cast" listed "Raise federal minimum
// wage" and "Admit more immigrants" (Playtester P2, Nov 13, French Island,
// Wisconsin): a member's campaign questions were voted in their own chamber
// whatever its level. A past vote is on a question its chamber's level decides.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

/** Each catalog question and the levels that can decide it, as past-laws.ts reads the catalog. */
const series = (
  provisionQuestions as unknown as {
    series: Record<string, { question: string }>;
  }
).series;
const levelsOf = (() => {
  const out = new Map<string, Set<string>>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const row = node as {
      question?: string;
      series?: string;
      levels?: string[];
    };
    const question =
      row.question ?? (row.series ? series[row.series]?.question : undefined);
    if (question && row.levels)
      for (const level of row.levels)
        out.set(question, (out.get(question) ?? new Set()).add(level));
    Object.values(node).forEach(walk);
  };
  walk(catalog);
  return out;
})();

it(`a local or state chamber's past roll calls are on questions its level decides, seed ${seed}`, () => {
  setBookkeeping(false);
  // Draw until two places have local or state past votes; a place with none
  // (an island area's opening keeps no prior term) is passed over and named.
  const passedOver: string[] = [];
  let placesChecked = 0;
  for (let draw = 0; draw < 8 && placesChecked < 2; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "past-votes-by-level");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
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
      const levels = levelsOf.get(vote.question);
      if (!levels) continue;
      // The opening's chambers below the state ask the city's questions.
      const level = office.level === "state" ? "state" : "city";
      checked += 1;
      expect(
        levels.has(level),
        `${where}: ${vote.id} (${office.level} body ${vote.body}) voted on ${vote.question}, decided only at ${[...levels].join(", ")}`,
      ).toBe(true);
    }
    if (checked) placesChecked += 1;
    else passedOver.push(where);
  }
  expect(
    placesChecked,
    `two places with past votes; passed over: ${passedOver.join("; ")}`,
  ).toBe(2);
}, 600_000);
