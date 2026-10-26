/**
 * Press people live in real households (pool item
 * gov-stopgap-press-staff-missing-record): in a random place from all 56, the
 * town's own outlet staff are drawn from its wider population and filled in
 * with the household the records give them, not seated alone with no home.
 * Seed and place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { outletsHere, pressParameter } from "./modules/press";
import { STAFF_ROLES, townResident } from "./press-staff";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// Play runs with bookkeeping off; hand the switch back as this file found it
// so a later file in the same worker does not inherit the change.
const bookkeepingBefore = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(bookkeepingBefore);
});

it("a town outlet's reporters have a household with a home, kin and costs", () => {
  const draw = drawPlace(seed, "press-staff-households");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core, placeId } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const staff = outletsHere(api)
    .filter((o) => o.tier !== "national")
    .flatMap((o) =>
      o.kind === "newspaper"
        ? [o.headId, ...o.reporterIds]
        : [...o.reporterIds],
    )
    .filter((id): id is string => !!id)
    .filter((id) => core.people.get(id)?.placeId === placeId);
  if (!staff.length) {
    console.log(`press-staff-households: no local staff in ${where}`);
    return;
  }
  let filled = 0;
  let withKin = 0;
  let withCosts = 0;
  for (const id of staff) {
    const person = core.people.get(id)!;
    // Not the lone household the identity fill-in makes, unless the town had
    // no jobless adult of the role's age left to fill in (a small town whose
    // wider population is used up: the registered fallback, stopgap
    // SG-PEOPLE-press-staff-households).
    if (/^household:person:press:/.test(person.householdId)) {
      const role = STAFF_ROLES.find((r) => id.includes(`:${r.id}:`))!;
      expect(
        townResident(
          core,
          placeId,
          pressParameter(role.ageMinParameter),
          pressParameter(role.ageMaxParameter),
        ),
        `${where} ${id}: seated alone though the town had a ${role.id}-age jobless resident`,
      ).toBeUndefined();
      continue;
    }
    filled += 1;
    const household = core.households.get(person.householdId);
    expect(household, `${where} ${id}`).toBeTruthy();
    if (household!.memberIds.length > 1 || person.familyIds.size > 0)
      withKin += 1;
    const costs = [...rt.flows.values()].some(
      (flow) =>
        flow.id === `rent:${household!.id}` || flow.id.includes(household!.id),
    );
    if (costs) withCosts += 1;
  }
  if (filled) {
    expect(withKin, `${where}: reporters with kin`).toBeGreaterThan(0);
    expect(
      withCosts,
      `${where}: households with a home's costs`,
    ).toBeGreaterThan(0);
  }
  const before = new Map(
    staff.map((id) => [id, core.people.get(id)!.liquidMinor]),
  );
  const pays = new Map(
    staff.map((id) => [
      id,
      core.jobs.get(core.people.get(id)!.jobId ?? "")?.hourlyMinor ?? 0,
    ]),
  );
  expect(
    [...pays.values()].some((pay) => pay > 0),
    `${where}: staff on the payroll`,
  ).toBe(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  for (const id of staff) {
    const person = core.people.get(id);
    if (!person?.alive) continue;
    // Pay piled up as cash without bound before: now costs draw it down.
    const pay = pays.get(id)!;
    expect(
      person.liquidMinor - before.get(id)!,
      `${where} ${id}: cash grew by more than a year's whole pay`,
    ).toBeLessThan(pay * 2080);
  }
}, 600_000);
