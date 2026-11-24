// @vitest-environment node
/** Passed desks and equal pay are fixtures; the bill writer and both payroll readers run. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { groupWithholding, peopleInGroup } from "./counted-money";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { ModuleRow } from "./module-data";
import { withholdPay, withholdingOf } from "./modules/budgets";
import {
  draftBill,
  executiveDecision,
  FEDERAL_HOUSE,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
} from "./modules/legislature";
import { lawChain, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { outsideGovernment } from "./outside-governments";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "income-rate-zero-restoration");
it(`an income-tax rate returns after zero: ${place.name}, replay ${replay}`, () => {
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
    // Use an operative real graduated schedule, including a territory's own
    // schedule when the resolver sets the federal income tax aside.
    const originalLevel = lawInForce(api, "income-tax").levels.find(
      (l) =>
        !l.setAside &&
        (l.level === "federal" || l.level === "state") &&
        Number(l.row?.value) > 0 &&
        l.row?.terms?.schedules,
    )!;
    expect(originalLevel).toBeDefined();
    const original = originalLevel.row!;
    const current = () =>
      lawInForce(api, "income-tax").levels.find(
        (l) => l.level === originalLevel.level,
      )!.row!;
    const chamber =
      originalLevel.level === "federal"
        ? FEDERAL_HOUSE
        : townSeats(api).find(
            (s) => s.office.kind.startsWith("legislature-") && s.holder,
          )!.office.id;
    const sponsor = members(api, chamber)[0]!;
    expect(sponsor).toBeDefined();
    const town = lawChain(api).townPlaceId;
    const person = [...world.core.people.values()].find(
      (p) => p.alive && p.placeId === town,
    )!;
    expect(person).toBeDefined();
    world.core.focusPersonIds.add(person.id);
    const rt = residentsRuntime(world.core)!;
    const group = rt.store.groups.find(
      (g) => g.placeId === town && peopleInGroup(rt, g.index) > 0,
    )!;
    expect(group).toBeDefined();
    const workers = peopleInGroup(rt, group.index);
    const records: string[] = [];
    let payNo = 0;
    const pay = () => {
      const id = `income-rate-pay-fixture-${++payNo}`;
      // Equal $100,000 annual gross isolates the changed law. These calls
      // prove payroll consumers, not naturally earned salaries or votes.
      api.accounts().transfer({
        id: `salary:${id}`,
        from: api.accounts().main(outsideGovernment(api, "US")),
        to: api.accounts().main(person.id),
        amountMinor: 10_000_000,
        reasonKey: "official.salary",
        partial: false,
        source: person.source,
      });
      withholdPay(api, {
        id,
        personId: person.id,
        paidMinor: 10_000_000,
        fromAt: addDays(makeIsoDate(api.state.date), -364),
        throughAt: api.state.date,
      });
      const named = withholdingOf(api, person.id).find(
        (r) => r.payrollReceiptId === id,
      )!;
      expect(named).toBeDefined();
      records.push(named.id);
      const counted = groupWithholding(
        api,
        rt,
        group.index,
        10_000_000 * workers,
        workers,
        365,
      );
      return {
        named: named.lines
          .filter((l) => l.tax === "income")
          .map((l) => ({ jurisdiction: l.jurisdiction, minor: l.minor }))
          .sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction)),
        counted: counted
          .filter((l) => l.tax === "income")
          .map((l) => ({ jurisdiction: l.jurisdiction, minor: l.minor }))
          .sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction)),
      };
    };
    const before = pay();
    const amount = (rows: typeof before.named) =>
      rows
        .filter((l) => l.jurisdiction === originalLevel.jurisdiction)
        .reduce((n, l) => n + l.minor, 0);
    expect(amount(before.named)).toBeGreaterThan(0);
    expect(amount(before.counted)).toBeGreaterThan(0);
    const other = (rows: typeof before.named) =>
      rows.filter((l) => l.jurisdiction !== originalLevel.jurisdiction);
    const sign = (value: number) => {
      const date = addDays(makeIsoDate(api.state.date), 1);
      const bill = draftBill(api, {
        bodyOfficeId: chamber,
        sponsorId: memberKey(sponsor),
        provisions: [
          provisionFor({
            policyId: "law:income-tax",
            operation: value === 0 ? "lower" : "raise",
            amount: value,
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
      expect(current().value).toBe(value);
      records.push(bill.id, current().id);
    };
    for (const value of [0, original.value!, 0, original.value!]) {
      sign(value);
      const after = pay();
      expect(amount(after.named)).toBe(value === 0 ? 0 : amount(before.named));
      expect(amount(after.counted)).toBe(
        value === 0 ? 0 : amount(before.counted),
      );
      expect(other(after.named)).toEqual(other(before.named));
      expect(other(after.counted)).toEqual(other(before.counted));
      expect(current().terms?.schedules).toEqual(original.terms?.schedules);
      expect(current().terms?.replacesFederal).toBe(
        original.terms?.replacesFederal,
      );
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        level: originalLevel.level,
        jurisdiction: originalLevel.jurisdiction,
        original: original.id,
        originalRate: original.value,
        personId: person.id,
        countedGroup: group.id,
        workers,
        namedMinor: amount(before.named),
        countedMinor: amount(before.counted),
        records,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
