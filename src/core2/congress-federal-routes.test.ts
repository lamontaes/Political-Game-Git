// @vitest-environment node
/** Eight more federal questions start as sourced law in force and Congress can enact and repeal each from the bill paper. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "congress-federal-routes");
const QUESTIONS = [
  "us-federal-positions:budget.pay-for-a-higher-debt-limit",
  "us-federal-positions:immigration.admit-more-immigrants",
  "us-federal-positions:education.forgive-student-loans",
  "us-federal-positions:emergencies.states-share-disaster-costs",
  "us-federal-positions:science-communications.national-data-privacy",
  "us-federal-positions:territories-culture.statehood-for-dc",
  "us-federal-positions:justice-rights.reduce-mandatory-minimums",
  "us-federal-positions:government.ban-congressional-stock-trading",
] as const;

it(
  `Congress can enact and repeal each of eight more federal questions: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
      const menu = billCatalog(api, "federal", "US").flatMap((s) =>
        s.topics.flatMap((t) => t.policies),
      );
      const trace: string[] = [];
      for (const question of QUESTIONS) {
        expect(
          menu.some((p) => p.id === `question:${question}`),
          `${question} is on the federal bill paper`,
        ).toBe(true);
        const start = lawInForce(api, question);
        expect(start.value, question).toBe(0);
        const row = start.levels.find((l) => l.level === "federal")?.row;
        expect(
          row?.terms?.cite,
          `${question} carries its citation`,
        ).toBeTruthy();
        const enact = (value: number, tag: string) =>
          enactLaw(api, {
            jurisdiction: federal.jurisdiction,
            level: "federal",
            series: question,
            value,
            effectiveDate: addDays(makeIsoDate(api.state.date), 1),
            measureId: `federal-route-${tag}-${question.split(".")[1]}`,
            citation: "Test: Congress acts on the question",
          });
        enact(1, "enact");
        advanceCore(world.core, addDays(makeIsoDate(api.state.date), 2));
        expect(lawInForce(api, question).value, `${question} enacted`).toBe(1);
        enact(0, "repeal");
        advanceCore(world.core, addDays(makeIsoDate(api.state.date), 2));
        expect(lawInForce(api, question).value, `${question} repealed`).toBe(0);
        trace.push(`${question.split(":")[1]} (${String(row?.terms?.cite)})`);
      }
      process.stdout.write(
        `FEDERAL-ROUTES ${place.name} (${place.key}, seed ${place.seed}): enacted and repealed ${trace.join("; ")}\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
