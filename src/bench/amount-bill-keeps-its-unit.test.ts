// @vitest-environment node
/**
 * A bill sets a law's amount, never its unit. Dev mode files a bill in the
 * U.S. House raising SSI's federal benefit rate, a law in dollars a month,
 * with no unit on its section; both chambers pass it and the president
 * signs it. The law it enacts is in the
 * unit of the law it amends, so the bill card reads dollars a month, not a
 * percent. A place drawn from all 56 on a seed nobody chose; a draw where
 * the bill does not become law is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  FEDERAL_HOUSE,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { LawRowInput } from "../core2/laws-starting";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const SERIES = "ssi-federal-benefit-rate";
const TRIES = 4;

it(`a bill with no unit enacts the law in the unit of the law it amends (replay ${replay})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let i = 0; i < TRIES; i += 1) {
      const place = drawPlace(replay, `amount-bill-unit:${i}`);
      const where = `${place.name} (${place.key}), replay ${replay} draw amount-bill-unit:${i}, world seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const laws = () =>
        api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .query("bySeriesOnly", [SERIES]) as unknown as LawRowInput[];
      const amended = laws().find((row) => row.level === "federal");
      expect(amended?.unit, `${where}: the law in force`).toBe("USD/month");
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const filed = dev.introduce({
        bodyOfficeId: FEDERAL_HOUSE,
        sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
        series: SERIES,
        value: Math.round(amended!.value * 1.2),
      }).bill;
      dev.decideAt(filed.id, 100, { sign: true, chairHears: true });
      const enacted = laws().find(
        (row) =>
          (row.terms as { enactedByBill?: string } | undefined)
            ?.enactedByBill === filed.id,
      );
      if (!enacted) {
        passed.push(`${where}: the bill did not become law`);
        continue;
      }
      expect(enacted.unit, `${where}: ${enacted.id}`).toBe(amended!.unit);
      process.stdout.write(
        `UNIT ${where}: ${enacted.id} enacted ${enacted.value} ${enacted.unit}. Passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`No draw enacted the bill: ${passed.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
