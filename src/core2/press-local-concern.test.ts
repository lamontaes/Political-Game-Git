/** Controlled stance edge cases on the same ordinary, two-tier New Game. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { lawChain } from "./modules/laws";
import {
  interviewQuestions,
  officeholderSpeaker,
  townConcernReader,
} from "./modules/press";
import { residentsRuntime } from "./modules/residents";
import { VIEWS_MODULE_ID } from "./modules/views";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("interview concern excludes children and outsiders, and weighs the local counted audience", () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "press-local-concern");
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  }).core as CoreState;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const where = `${place.name} (${place.key}), replay ${seed}`;
  console.log(`press-local-concern: ${where}`);
  const grown = (born: string) =>
    ageOnDate(makeIsoDate(born), core.date) >= api.parameter("votingAge");
  const local = [...core.people.values()].filter(
    (p) => p.alive && p.placeId === town && grown(p.birthDate),
  );
  const child = [...core.people.values()].find(
    (p) => p.alive && p.placeId === town && !grown(p.birthDate),
  )!;
  const outside = [...core.people.values()].find(
    (p) => p.alive && p.placeId !== town && grown(p.birthDate),
  )!;
  const holder = local
    .map((p) => officeholderSpeaker(api, p.id))
    .find(Boolean)!;
  expect(child, where).toBeDefined();
  expect(outside, where).toBeDefined();
  expect(holder, where).toBeDefined();
  const store = residentsRuntime(core)!.store;
  let countedAdults = 0;
  let countedId: string | undefined;
  let countedWeight = 0;
  for (const household of store.liveHouseholds()) {
    if (household.placeId !== town) continue;
    for (const member of store.countedMembers(household)) {
      if (!grown(store.born[member]!)) continue;
      const id = store.ids[member]!;
      // No demotion has happened in this opening fixture.
      if (core.people.has(id)) continue;
      const weight = store.weightOf(household);
      countedAdults += weight;
      countedId ??= id;
      if (id === countedId) countedWeight = weight;
    }
  }
  expect(countedAdults, where).toBeGreaterThan(0);
  const total = local.length + countedAdults;
  const table = api.moduleState(VIEWS_MODULE_ID).table("stances");
  const question = interviewQuestions(api, holder)[0]!;
  expect(question, where).toBeTruthy();
  // Test-only stance fixtures; these are not the separately attached played
  // story witness. Clear only this question, then give one resident a view.
  for (const row of table.query("byTopic", [question])) table.remove(row.id);
  const put = (id: string, strength: number) =>
    table.put({
      id: `${id}:${question}`,
      personId: id,
      topic: question,
      desiredChange: "enact",
      strength,
      causes: [],
    });
  put(local[0]!.id, 0.75);
  const concern = townConcernReader(api);
  expect(concern(question), where).toBeCloseTo(0.75 / total, 12);
  const before = interviewQuestions(api, holder);
  put(child.id, 1);
  put(outside.id, 1);
  expect(concern(question), where).toBeCloseTo(0.75 / total, 12);
  expect(interviewQuestions(api, holder), where).toEqual(before);
  // The question reader sees a changed stance on the same day, including
  // the household weight of a recorded counted stance, without a saved cache.
  put(countedId!, 0.5);
  put(local[0]!.id, 0.25);
  expect(concern(question), where).toBeCloseTo(
    (0.25 + 0.5 * countedWeight) / total,
    12,
  );
  console.log(
    JSON.stringify({
      town: place.name,
      replay: seed,
      question,
      namedAdult: local[0]!.id,
      child: child.id,
      outside: outside.id,
      countedId,
      countedWeight,
      namedAdults: local.length,
      countedAdults,
      concern: concern(question),
      interviewQuestions: interviewQuestions(api, holder),
    }),
  );
}, 120_000);
