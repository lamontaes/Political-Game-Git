/**
 * The town's bank takes loan applications only from the town's households
 * (pool item world-bank-takes-applications-from-outside-its-town). Pinned to
 * Matagorda, Texas (place 4847016, the seed path-check draws from "pt1:0"),
 * through the bank's first two reviews: before this, 176 of the 181
 * applications to the town's bank by March 1 came from officials and aides
 * living at the capital or in Washington. Every application now names a household of the bank's place, and
 * the officials elsewhere, short of a month's costs as they are, ask nothing.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = "4847016";

it("every personal-loan application to the town's bank comes from a household of its town", () => {
  setBookkeeping(false);
  const drawn = drawPlace("pt1:0", "path-check");
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  advanceCore(core, makeIsoDate(`${core.date.slice(0, 4)}-02-02`));
  const bank = [...core.organizations.values()].find((row) =>
    row.id.startsWith("organization:bank:"),
  )!;
  const detail = `Matagorda TX (${PLACE}), world ${core.seed}, ${core.date}, bank ${bank.id}`;
  const rt = residentsRuntime(core)!;
  const placeOf = (id: string) =>
    core.households.get(id)?.placeId ?? rt.store.liveHousehold(id)?.placeId;
  const applications = (
    api.moduleState("credit").table("applications").rows() as unknown as {
      id: string;
      householdId?: string;
    }[]
  ).filter((row) => row.householdId);
  expect(applications.length, `${detail}: applications`).toBeGreaterThan(0);
  for (const row of applications)
    expect(placeOf(row.householdId!), `${detail}: ${row.id}`).toBe(
      bank.placeId,
    );
  // Households living elsewhere, with less cash than a month of their costs, did not apply here.
  const elsewhere = [...core.households.values()].filter((h) => {
    if (h.placeId === bank.placeId) return false;
    const members = h.memberIds
      .map((id) => core.people.get(id))
      .filter((p) => p?.alive);
    const cash = members.reduce((n, p) => n + p!.liquidMinor, 0);
    const costs = members.reduce((n, p) => n + p!.livingCostDailyMinor, 0);
    return members.length > 0 && cash < costs * 30;
  });
  expect(
    elsewhere.length,
    `${detail}: short households elsewhere`,
  ).toBeGreaterThan(0);
}, 120_000);
