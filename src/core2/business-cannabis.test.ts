/** A legal cannabis market in a generated world: retailers apply for licenses, sales come out of the wider population's outside spending, and a repeal ends them. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import { openLawReach } from "./law-reach/host";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "business-cannabis",
);
const LEGAL = "us-policy-positions:business-commerce.legalize-cannabis-sales";

describe(`a legal cannabis market (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("licenses retailers, moves spending from outside the town to them, and a repeal ends it", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    openLaws(core);
    openLawReach(core);
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const retailers = [...core.finance.businesses].filter(
      ([id, book]) =>
        !book.closedAt &&
        book.kindId === "retail" &&
        core.organizations.get(id)?.placeId === town,
    );
    // A town with no retailers has nobody to license.
    if (!retailers.length) return;
    const year = Number(opening.startedAt.slice(0, 4));
    const enact = (value: number, date: string, measureId: string) => {
      // Adult-use sales are a state law: change it there.
      const levels = lawChain(api).levels;
      const level =
        levels.find((row) => /state|territory/.test(String(row.level))) ??
        levels[0]!;
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: LEGAL,
        value,
        effectiveDate: date,
        measureId,
        citation: "Test act",
      });
    };
    enact(1, `${year}-02-10`, "TEST-legal");
    advanceCore(core, `${year}-08-02`);
    const row = api
      .moduleState("business")
      .table("cannabis")
      .get(`cannabis:${town}`) as
      { licensed?: string[]; shiftedMinor?: number } | undefined;
    expect(row).toBeDefined();
    const rt = residentsRuntime(core)!;
    const sales = (row!.licensed ?? []).reduce(
      (n, id) => n + (rt.flows.get(`cannabis:${id}`)?.amountMinor ?? 0),
      0,
    );
    console.log(
      `${drawn.name}: ${row!.licensed?.length ?? 0} of ${retailers.length} retailers licensed, $${Math.round(sales / 100)} a month`,
    );
    // What licensed stores sell is what the wider population no longer sends outside.
    expect(row!.shiftedMinor ?? 0).toBe(sales);
    enact(0, `${year}-08-10`, "TEST-repeal");
    advanceCore(core, `${year}-09-02`);
    for (const id of row!.licensed ?? [])
      expect(rt.flows.get(`cannabis:${id}`)?.amountMinor ?? 0).toBe(0);
  }, 600_000);
});
