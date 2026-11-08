// @vitest-environment node
/** A passed desk is a fixture; the production signature, tax writer and withholding reader run. */
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
  LEGISLATURE_MODULE_ID,
  memberKey,
} from "./modules/legislature";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import { withholdingFor } from "./tax-withholding";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "opening-income-tax-reversal");
const question = "us-policy-positions:fiscal.adopt-income-tax";
it(`the opening income tax can be repealed and restored: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const current = () =>
      lawInForce(api, "income-tax").levels.find((l) => l.level === "state")!
        .row!;
    const original = current();
    expect(original).toBeDefined();
    expect(typeof original.value).toBe("number");
    const withholding = () =>
      withholdingFor({
        paidMinor: 10_000_000,
        periodDays: 365,
        yearToDateMinor: 0,
        incomeTax: lawInForce(api, "income-tax"),
        socialSecurity: lawInForce(api, "social-security-tax"),
        medicare: lawInForce(api, "medicare-tax"),
      }).filter((l) => l.tax === "income");
    const amount = (level: string) =>
      withholding()
        .filter((l) => l.level === level)
        .reduce((s, l) => s + l.minor, 0);
    const before = amount("state");
    const federalBefore = amount("federal");
    const chamber = townSeats(api).find(
      (s) => s.office.kind.startsWith("legislature-") && s.holder,
    )!;
    expect(chamber).toBeDefined();
    const draft = (operation: "enact" | "repeal") =>
      draftBill(api, {
        bodyOfficeId: chamber.office.id,
        sponsorId: memberKey(chamber.holder!),
        provisions: [
          provisionFor({
            policyId: `question:${question}`,
            operation,
            effectiveDate: addDays(makeIsoDate(api.state.date), 1),
          }),
        ],
      });
    const review = (enacting: boolean) =>
      incomeTaxAct(api, {
        key: question,
        level: "state",
        lawId: lawInForce(api, question).levels.find(
          (l) => l.level === "state",
        )!.row!.id,
        enacting,
        graduated: false,
      });
    const records: string[] = [];
    if (original.value === 0) {
      expect(before).toBe(0);
      review(false);
      expect(current().id).toBe(original.id);
      console.log(
        JSON.stringify({
          place: place.name,
          placeKey: place.key,
          replay,
          worldSeed: place.seed,
          openingTax: false,
          original: original.id,
          body: chamber.office.id,
        }),
      );
      return;
    }
    expect(before).toBeGreaterThan(0);
    const sign = (operation: "enact" | "repeal") => {
      const bill = draft(operation);
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
    };
    for (const operation of ["repeal", "enact", "repeal", "enact"] as const) {
      sign(operation);
      const on = operation === "enact";
      expect(current().value).toBe(on ? original.value : 0);
      expect(amount("state")).toBe(on ? before : 0);
      expect(amount("federal")).toBe(federalBefore);
      if (on) {
        expect(current().terms?.schedules).toEqual(original.terms?.schedules);
        expect(current().terms?.replacesFederal).toBe(
          original.terms?.replacesFederal,
        );
      }
      const kept = current().id;
      for (let i = 0; i < 3; i++) {
        review(on);
        expect(current().id).toBe(kept);
      }
    }
    sign("repeal");
    const independent = enactLaw(api, {
      jurisdiction: lawChain(api).stateKey,
      level: "state",
      series: "income-tax",
      value: 2.75,
      unit: "percent-flat",
      effectiveDate: api.state.date,
      measureId: "independent-tax-fixture",
      citation: "Controlled later tax act, not a played vote",
      terms: original.terms?.replacesFederal
        ? { replacesFederal: true }
        : undefined,
    });
    review(false);
    expect(current().id).toBe(independent.id);
    sign("enact");
    expect(current().id).toBe(independent.id);
    review(true);
    expect(current().id).toBe(independent.id);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        openingTax: true,
        original: original.id,
        body: chamber.office.id,
        withheldBefore: before,
        records,
        independent: independent.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
