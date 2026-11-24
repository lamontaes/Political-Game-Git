/**
 * Medicaid expansion covers the households the coverage engine bills in the town's state, not
 * only the town's own (law-medicaid-record-keeps-only-the-towns-own-jurisdiction), and dev mode
 * opens a person outside the town and shows the law that moved them. Pinned: West Union, Ohio
 * (3984294), world seed "ilt-west-union", where the stores and health traces measured the
 * expansion; the outside person is the first full one on Medicaid in a place that is not the town.
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { appliedOn } from "../core2/law-reach/applied";
import { advanceCore } from "../core2/life";
import type { MedicalBillRow } from "../core2/medical-bills";
import { COVERAGE_MODULE_ID } from "../core2/modules/coverage";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import { DevMode } from "./dev-mode";
import { buildBenchWorld } from "./world";

const EXPAND =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";

it("Medicaid reaches billed households outside the town, and dev mode shows the law on one (West Union OH)", () => {
  setBookkeeping(false);
  const world = buildBenchWorld("ilt-west-union", gameStartDate(), {
    placeKey: "3984294",
    twoLevel: true,
  });
  const core = world.core;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const bills = () =>
    api
      .moduleState(COVERAGE_MODULE_ID)
      .table("medicalBills")
      .rows() as unknown as MedicalBillRow[];
  advanceCore(core, addDays(makeIsoDate(core.date), 40));

  // Households billed outside the town: their adults are on Medicaid, kept as one group a place.
  const outside = bills().filter((b) => b.placeId !== town);
  const onMedicaid = outside.flatMap((b) =>
    b.members.filter((m) => m.plan === "medicaid"),
  );
  expect(
    onMedicaid.length,
    "no one outside the town is on Medicaid",
  ).toBeGreaterThan(100);
  const groups = appliedOn(api, EXPAND).filter((r) => r.target === "group");
  expect(
    groups.some((g) => g.targetId === `${town}:medicaid-covered-adults`),
  ).toBe(true);
  expect(
    groups.filter((g) => !g.targetId.startsWith(`${town}:`)).length,
    "no counted group outside the town",
  ).toBeGreaterThan(0);

  // A full person outside the town on Medicaid, opened in dev mode: the expansion is on their card.
  const bill = outside.find(
    (b) => !b.counted && b.members.some((m) => m.plan === "medicaid"),
  );
  expect(bill, "no full household outside the town on Medicaid").toBeDefined();
  const personId = bill!.members.find((m) => m.plan === "medicaid")!.personId;
  expect(core.people.get(personId)?.placeId).not.toBe(town);
  const mode = new DevMode(core, world.director, undefined, world.placeId);
  const before = mode.person(personId).laws;
  const reached = before.reached.find((r) => r.key === EXPAND);
  expect(reached, `${personId}: dev mode shows no Medicaid law`).toBeDefined();
  expect(reached!.endedOn).toBeNull();
  expect(reached!.law?.jurisdiction).toBe("US-OH");
  expect(before.medicalBill?.plan).toBe("medicaid");
  expect(before.medicalBill!.medicaidMinor ?? 0).toBeGreaterThan(0);

  // Ended in dev mode: the same card shows the law ended on them and the bill off Medicaid.
  mode.setLaw({ level: "state", series: EXPAND, repeal: true });
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const after = mode.person(personId).laws;
  const ended = after.reached.find((r) => r.id === reached!.id);
  expect(
    ended?.endedOn,
    `${personId}: the law did not end on them`,
  ).not.toBeNull();
  expect(after.medicalBill?.plan).not.toBe("medicaid");
  // This month's bills outside the town: no one on Medicaid. (A row is a household's latest bill,
  // so a household that left keeps the older one it was last billed on.)
  const latest = bills().reduce((d, b) => (b.date > d ? b.date : d), "");
  expect(latest > ended!.endedOn!, "no bill since the law ended").toBe(true);
  expect(
    bills()
      .filter((b) => b.placeId !== town && b.date === latest)
      .flatMap((b) => b.members)
      .filter((m) => m.plan === "medicaid").length,
  ).toBe(0);
}, 120_000);
