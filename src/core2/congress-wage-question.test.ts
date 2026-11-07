// @vitest-environment node
/** Canonical federal wage route in a generated world; staged passage is a test fixture. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { ModuleRow } from "./module-data";
import {
  draftBill,
  executiveDecision,
  FEDERAL_HOUSE,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
} from "./modules/legislature";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "congress-wage-question");
const shared = "us-policy-positions:labor-workforce.raise-minimum-wage";
const canonical =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
it(`Congress uses one wage rule through either catalog name: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const menu = () =>
      billCatalog(api, "federal", "US").flatMap((s) =>
        s.topics.flatMap((t) => t.policies),
      );
    const common = () => menu().find((p) => p.id === `question:${shared}`)!;
    const legacy = () => menu().find((p) => p.id === `question:${canonical}`)!;
    expect(common()).toBeDefined();
    expect(common().authority.allowed).toBe(true);
    expect(common().inForceRecordId).toBe(legacy().inForceRecordId);
    const before = lawInForce(api, "minimum-wage").levels.find(
      (l) => l.level === "federal",
    )!.row!;
    // Controlled stronger state floor proves the 29 USC 218(a) savings rule.
    // This is not a claim that the drawn state actually pays this rate.
    const stronger = enactLaw(api, {
      jurisdiction: lawChain(api).stateKey,
      level: "state",
      series: "minimum-wage",
      value: 5000,
      unit: "minor/hour",
      effectiveDate: api.state.date,
      measureId: "higher-state-floor-fixture",
      citation: "29 USC 218(a) reader fixture, not a vote",
    });
    const records: string[] = [];
    for (const [question, operation] of [
      [shared, "enact"],
      [shared, "repeal"],
      [canonical, "enact"],
      [shared, "repeal"],
    ] as const) {
      const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
      const bill = draftBill(api, {
        bodyOfficeId: FEDERAL_HOUSE,
        sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
        provisions: [
          provisionFor({
            policyId: `question:${question}`,
            operation,
            effectiveDate,
          }),
        ],
      });
      expect(bill.authority.every((a) => a.allowed)).toBe(true);
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .put({
          ...bill,
          status: "awaiting-signature",
          passedOn: api.state.date,
        } as unknown as ModuleRow);
      expect(executiveDecision(api, bill.id, true).status).toBe("enacted");
      advanceCore(world.core, addDays(makeIsoDate(effectiveDate), 1));
      expect(common().inForce).toBe(operation === "enact" ? 1 : 0);
      expect(common().inForceRecordId).toBe(legacy().inForceRecordId);
      const answer = lawInForce(api, "minimum-wage");
      const federal = answer.levels.find((l) => l.level === "federal")!.row!;
      if (operation === "enact")
        expect(federal.value).toBeGreaterThan(before.value!);
      else expect(federal.value).toBe(before.value);
      expect(answer.value).toBe(5000);
      expect(
        answer.levels.find((l) => l.row?.id === stronger.id)?.setAside,
      ).toBeUndefined();
      records.push(common().inForceRecordId!, federal.id);
    }
    const duplicate = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [shared])
      .filter((r) => r.level === "federal");
    expect(duplicate).toEqual([]);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        body: FEDERAL_HOUSE,
        priorFederal: before.id,
        records,
        higherStateFixture: stronger.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
