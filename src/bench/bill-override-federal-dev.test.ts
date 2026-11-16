import { buildBenchWorld } from "./world";
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
// override tallies by chamber and the status.
// Pinned (Nov 16). Before, the seed came at run time from FEDERAL_OVERRIDE_SEED, GOLDEN_PATH_SEED or
// randomBytes, and the case drew up to six places. The fixed seed draws Pikeville, Kentucky (2160852)
// first for "federal-override".
// Limit: the case took 60 s (Nov 16, Train ff41d81e); its limit is about twice that, 120 s.
const seed = "pin-bill-override-federal-dev";
const PLACE = {
  key: "2160852",
  name: "Pikeville, Kentucky",
  seed: "8b5ec53b0860a6f497fec2f1fde6a557f67910b202e2e6c447e7e81e2e0eb9b3",
};

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0`, "federal-override")).toMatchObject(PLACE);
});

describe(`a federal veto is overridden (seed ${seed})`, () => {
  it("the president vetoes, both chambers override, and the stage view says so", () => {
    {
      const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE.key,
      });
      const api = coreAPI(world.core);
      const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;
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
      expect(filed.status, `${where}: the bill is filed`).not.toBe("blocked");
      // Both chambers pass it (the Senate's committee chair hears it), the president vetoes it
      // and both chambers vote to override.
      const result = dev.decideAt(filed.id, 100, {
        sign: false,
        overrideMargin: 150,
        chairHears: true,
      });
      expect(
        result.bill.status,
        `${where}: ${JSON.stringify(result.ending ?? result.bill.status)}`,
      ).toBe("overridden");
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
    }
  }, 120_000);
});
