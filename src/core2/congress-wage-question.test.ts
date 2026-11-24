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
// One label per rule at a level (Laws and effects, Nov 17, on issue 9747; item
// laws-congress-holds-two-questions-for-one-federal-wage-rule): Congress drafts the
// wage rule under its own federal label only, and the states' label is not Congress's.
it(`Congress drafts the one wage rule under its own label: ${place.name}, replay ${replay}`, () => {
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
    const legacy = () => menu().find((p) => p.id === `question:${canonical}`)!;
    // The menu offers the rule once, under Congress's label.
    expect(menu().some((p) => p.id === `question:${shared}`)).toBe(false);
    expect(legacy()).toBeDefined();
    expect(legacy().authority.allowed).toBe(true);
    // A federal bill under the states' label is refused: Congress decides the
    // rule under its own label.
    const statesLabel = draftBill(api, {
      bodyOfficeId: FEDERAL_HOUSE,
      sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
      provisions: [
        provisionFor({ policyId: `question:${shared}`, operation: "enact" }),
      ],
    });
    expect(statesLabel.authority.some((a) => !a.allowed)).toBe(true);
    let before = lawInForce(api, "minimum-wage").levels.find(
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
    // A world whose history already has Congress saying yes to the rule opens
    // with the question standing and the raised floor in force on the opening
    // day (the century's session passed it before day one). An enactment then
    // restates what is in force and changes nothing, so that world starts by
    // repealing it: the floor must fall back below the raised one, and that
    // lower floor is what the enactments after it must raise.
    const standsAtOpening = legacy().inForce === 1;
    const sequence = [
      ...(standsAtOpening ? [[canonical, "repeal"] as const] : []),
      [canonical, "enact"],
      [canonical, "repeal"],
      [canonical, "enact"],
      [canonical, "repeal"],
    ] as const;
    for (const [index, [question, operation]] of sequence.entries()) {
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
      expect(legacy().inForce).toBe(operation === "enact" ? 1 : 0);
      expect(legacy().inForceRecordId).toBeTruthy();
      const answer = lawInForce(api, "minimum-wage");
      const federal = answer.levels.find((l) => l.level === "federal")!.row!;
      if (operation === "enact")
        expect(federal.value).toBeGreaterThan(before.value!);
      else if (standsAtOpening && index === 0) {
        expect(federal.value).toBeLessThan(before.value!);
        before = federal;
      } else expect(federal.value).toBe(before.value);
      expect(answer.value).toBe(5000);
      expect(
        answer.levels.find((l) => l.row?.id === stronger.id)?.setAside,
      ).toBeUndefined();
      records.push(legacy().inForceRecordId!, federal.id);
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
        questionStoodAtOpening: standsAtOpening,
        records,
        higherStateFixture: stronger.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
