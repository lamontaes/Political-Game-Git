import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  FEDERAL_HOUSE,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

// Done-when item 5: the executive's desk and the override vote. A bill both chambers of Congress
// pass is vetoed by the president and Congress overrides it: the stage view names the veto, the
// override tallies by chamber and the status. A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.FEDERAL_OVERRIDE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a federal veto is overridden (seed ${seed})`, () => {
  it("the president vetoes, both chambers override, and the stage view says so", () => {
    const tried: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "federal-override");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const president = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [
            "seat:US:president",
            "serving",
          ]) as unknown as TermRow[]
      )[0]?.personId;
      expect(president, where).toBeTruthy();
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const sponsor = memberKey(members(api, FEDERAL_HOUSE)[0]!);
      const filed = dev.introduce({
        bodyOfficeId: FEDERAL_HOUSE,
        sponsorId: sponsor,
        series: "minimum-wage",
        value: 1500,
      }).bill;
      if (filed.status === "blocked") {
        tried.push(`${where}: blocked`);
        continue;
      }
      // Both chambers pass it (the Senate's committee chair hears it), the president vetoes it
      // and both chambers vote to override.
      const result = dev.decideAt(filed.id, 100, {
        sign: false,
        overrideMargin: 150,
        chairHears: true,
      });
      if (result.bill.status !== "overridden") {
        tried.push(`${where}: ${result.bill.status}`);
        continue;
      }
      const stage = billStage(world.core, filed.id, president!);
      expect(stage.desk.decided.length, where).toBe(1);
      expect(stage.desk.decided[0]!.vote, where).toBe("veto");
      expect(stage.override.length, `${where}: both chambers voted`).toBe(2);
      for (const chamber of stage.override)
        expect(
          chamber.yes.length,
          `${where}: ${chamber.chamber}`,
        ).toBeGreaterThan(chamber.no.length);
      console.log(
        `federal override: ${where} ${filed.id} overridden; override ${stage.override.map((c) => `${c.chamber} ${c.yes.length}-${c.no.length}`).join(", ")}`,
      );
      return;
    }
    throw new Error(
      `no drawn place overrode a federal veto (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
