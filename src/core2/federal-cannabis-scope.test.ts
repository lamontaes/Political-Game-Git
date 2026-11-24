// @vitest-environment node
/** Passed desks are controlled fixtures; signatures and effective-date consumers run. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { openReach } from "./law-reach/group-a-records";
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
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-cannabis-scope");
const question =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
it(`Congress changes its cannabis prohibition independently of state licenses: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const level = (name: string) =>
      lawInForce(api, question).levels.find((l) => l.level === name)!;
    const original = level("state").row!;
    expect(level("federal").row?.value).toBe(0);
    expect(level("federal").row?.terms?.cite).toContain("21 U.S.C.");
    const menu = billCatalog(api, "federal", "US").flatMap((s) =>
      s.topics.flatMap((t) => t.policies),
    );
    expect(
      menu.find((p) => p.id === `question:${question}`)?.authority.allowed,
    ).toBe(true);
    const records: string[] = [];
    const sign = (operation: "enact" | "repeal") => {
      const date = addDays(makeIsoDate(api.state.date), 1);
      const bill = draftBill(api, {
        bodyOfficeId: FEDERAL_HOUSE,
        sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
        provisions: [
          provisionFor({
            policyId: `question:${question}`,
            operation,
            effectiveDate: date,
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
      advanceCore(world.core, date);
      expect(level("federal").row?.value).toBe(operation === "enact" ? 1 : 0);
      records.push(bill.id, level("federal").row!.id);
    };
    sign("enact");
    expect(level("state").row?.id).toBe(original.id);
    sign("repeal");
    expect(level("state").row?.id).toBe(original.id);
    // Exercise both state answers in every draw. These are reader fixtures,
    // not claims that these changes were voted on by the drawn state.
    const state = (value: number) => {
      const date = addDays(makeIsoDate(api.state.date), 1);
      const row = enactLaw(api, {
        jurisdiction: lawChain(api).stateKey,
        level: "state",
        series: question,
        value,
        effectiveDate: date,
        measureId: `state-license-fixture-${date}`,
        citation:
          "Controlled state licensing fixture; 21 USC 903 preserves independent state law",
      });
      advanceCore(world.core, date);
      expect(level("state").row?.id).toBe(row.id);
      expect(level("state").setAside).toBeUndefined();
      return row;
    };
    state(0);
    expect(openReach(api, question)).toHaveLength(0);
    sign("enact");
    expect(lawInForce(api, question).value).toBe(0);
    expect(openReach(api, question)).toHaveLength(0);
    const permission = state(1);
    expect(openReach(api, question).length).toBeGreaterThan(0);
    sign("repeal");
    expect(lawInForce(api, question).value).toBe(1);
    expect(level("state").row?.id).toBe(permission.id);
    expect(openReach(api, question).length).toBeGreaterThan(0);
    sign("enact");
    state(0);
    expect(openReach(api, question)).toHaveLength(0);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        openingState: original.id,
        openingStateValue: original.value,
        body: FEDERAL_HOUSE,
        records,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
