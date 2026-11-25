// @vitest-environment node
/**
 * Eight more federal questions start as law in force with its source (the
 * research's citation, or the session of the history from 1925 that set it),
 * and Congress can change each from the bill paper and change it back.
 */
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
        const row = start.levels.find((l) => l.level === "federal")?.row;
        // Its source: the research's citation, or what the history from 1925
        // did with it ("The century's sessions: no session enacted it").
        const cite = row?.terms?.cite ?? row?.source;
        expect(cite, `${question} carries its source`).toBeTruthy();
        // The history from 1925 may leave either side in force.
        const other = start.value ? 0 : 1;
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
        enact(other, "enact");
        advanceCore(world.core, addDays(makeIsoDate(api.state.date), 2));
        expect(lawInForce(api, question).value, `${question} enacted`).toBe(
          other,
        );
        enact(start.value, "repeal");
        advanceCore(world.core, addDays(makeIsoDate(api.state.date), 2));
        expect(lawInForce(api, question).value, `${question} repealed`).toBe(
          start.value,
        );
        trace.push(
          `${question.split(":")[1]} ${start.value} to ${other} and back (${String(cite)})`,
        );
      }
      process.stdout.write(
        `FEDERAL-ROUTES ${place.name} (${place.key}, seed ${place.seed}): enacted and repealed ${trace.join("; ")}\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
