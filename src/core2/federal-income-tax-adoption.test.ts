// @vitest-environment node
/** Passed desks and equal gross pay are fixtures; production bills and withholding run. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { incomeTaxAct } from "./law-reach/group-b-money";
import type { ModuleRow } from "./module-data";
import {
  draftBill,
  executiveDecision,
  FEDERAL_HOUSE,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
} from "./modules/legislature";
import { lawInForce } from "./modules/laws";
import { coreAPI } from "./state";
import { withholdingFor } from "./tax-withholding";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-income-tax-adoption");
const question = "us-policy-positions:fiscal.adopt-income-tax";
it(`Congress repeals and restores its income tax: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    console.log(
      JSON.stringify({
        stage: "opening",
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
      }),
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const currentLevel = () =>
      lawInForce(api, "income-tax").levels.find((l) => l.level === "federal")!;
    const current = () => currentLevel().row!;
    const original = current();
    expect(original.value).toBeGreaterThan(0);
    expect(original.terms?.schedules).toBeDefined();
    const excluded = !!currentLevel().setAside;
    expect(
      lawInForce(api, question).levels.find((l) => l.level === "federal")?.row
        ?.value,
    ).toBe(1);
    const sponsor = members(api, FEDERAL_HOUSE)[0]!;
    expect(sponsor).toBeDefined();
    const withholding = () =>
      withholdingFor({
        paidMinor: 10_000_000,
        periodDays: 365,
        yearToDateMinor: 0,
        incomeTax: lawInForce(api, "income-tax"),
        socialSecurity: lawInForce(api, "social-security-tax"),
        medicare: lawInForce(api, "medicare-tax"),
      }).filter((l) => l.tax === "income");
    const federalPay = () =>
      withholding()
        .filter((l) => l.level === "federal")
        .reduce((sum, l) => sum + l.minor, 0);
    const otherPay = () => withholding().filter((l) => l.level !== "federal");
    const before = federalPay();
    const others = otherPay();
    if (excluded) expect(before).toBe(0);
    else expect(before).toBeGreaterThan(0);
    const records: string[] = [];
    const sign = (kind: "enact" | "repeal" | "zero") => {
      const bill = draftBill(api, {
        bodyOfficeId: FEDERAL_HOUSE,
        sponsorId: memberKey(sponsor),
        provisions: [
          provisionFor({
            policyId:
              kind === "zero" ? "law:income-tax" : `question:${question}`,
            operation: kind === "zero" ? "lower" : kind,
            ...(kind === "zero" ? { amount: 0 } : {}),
            effectiveDate: addDays(makeIsoDate(api.state.date), 1),
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
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 1));
      records.push(bill.id, current().id);
      expect(otherPay()).toEqual(others);
      expect(!!currentLevel().setAside).toBe(excluded);
    };
    const review = (enacting: boolean) =>
      incomeTaxAct(api, {
        key: question,
        level: "federal",
        lawId: lawInForce(api, question).levels.find(
          (l) => l.level === "federal",
        )!.row!.id,
        enacting,
        graduated: false,
      });
    const restored = () => {
      expect(current().value).toBe(original.value);
      expect(current().unit).toBe(original.unit);
      expect(current().terms?.schedules).toEqual(original.terms?.schedules);
      expect(current().terms?.base).toEqual(original.terms?.base);
      expect(federalPay()).toBe(before);
    };
    for (const operation of ["repeal", "enact", "repeal", "enact"] as const) {
      sign(operation);
      if (operation === "enact") restored();
      else {
        expect(current().value).toBe(0);
        expect(federalPay()).toBe(0);
      }
      const id = current().id;
      review(operation === "enact");
      expect(current().id).toBe(id);
    }
    sign("zero");
    expect(current().value).toBe(0);
    expect(federalPay()).toBe(0);
    const zero = current().id;
    review(true);
    expect(current().id).toBe(zero);
    // A zero rate does not repeal the adoption statute. Repeating its yes
    // answer is settled business and must not secretly override the rate act.
    sign("enact");
    expect(current().id).toBe(zero);
    sign("repeal");
    expect(current().value).toBe(0);
    sign("enact");
    restored();
    const restoredId = current().id;
    review(true);
    expect(current().id).toBe(restoredId);
    sign("repeal");
    expect(current().value).toBe(0);
    expect(federalPay()).toBe(0);
    sign("enact");
    restored();
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        body: FEDERAL_HOUSE,
        excluded,
        original: original.id,
        originalValue: original.value,
        federalWithholdingRestored: before,
        records,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
