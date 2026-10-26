import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { LEGISLATURE_MODULE_ID } from "./modules/legislature";
import { coreAPI } from "./state";

// Bills come from members' reasons against the law in force, on every topic
// the policy questions cover and on the budget lines of every service, not
// only a few (gov-bills-cover-every-topic). In a played year in a drawn place,
// the bills filed touch every topic family of the question catalog and the
// budget lines for schools, health, roads and public safety.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "bills-every-topic");
const topicOf = (question: string) => question.split(":")[1]!.split(".")[0]!;

it(`a year of bills touches every topic and the main services in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const bills = coreAPI(core)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .rows() as unknown as {
    id: string;
    provisions?: { kind: string; question?: string; line?: string }[];
  }[];
  const topics = new Set<string>();
  const lines = new Set<string>();
  for (const bill of bills)
    for (const provision of bill.provisions ?? []) {
      if (provision.question) topics.add(topicOf(provision.question));
      if (provision.line) lines.add(provision.line);
    }
  const where = `${place.name} [${place.key}], seed ${seed}, ${bills.length} bills`;
  const wanted = new Set(PLATFORM_QUESTIONS.map(topicOf));
  expect(wanted.size, where).toBeGreaterThan(10);
  expect(
    [...wanted].filter((topic) => !topics.has(topic)),
    `${where}: topics with no bill`,
  ).toEqual([]);
  expect(
    ["schools", "healthAndHospitals", "highways", "police"].filter(
      (line) => !lines.has(line),
    ),
    `${where}: services with no budget bill`,
  ).toEqual([]);
}, 900_000);
