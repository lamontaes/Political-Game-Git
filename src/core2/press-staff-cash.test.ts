/**
 * Press staff open with savings: every reporter and editor the press engine
 * seats on the opening day holds what the survey rule gives a family at their
 * pay, the same rule the town's generated residents follow. A place is drawn
 * from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { outletsHere, pressParameter } from "./modules/press";
import { STAFF_ROLES } from "./press-staff";
import { medianTransactionBalance } from "./starting-cash";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("every paid press employee opens with the survey balance for their pay", () => {
  const draw = drawPlace(seed, "press-staff-cash");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const ids = outletsHere(api).flatMap((o) => [
    o.ownerId,
    o.headId,
    ...o.reporterIds,
  ]);
  let checked = 0;
  for (const id of ids) {
    if (!id) continue;
    // Staff drawn from the town's residents hold what the census gave them.
    if (!id.startsWith("person:press:")) {
      expect(
        core.people.get(id)?.liquidMinor,
        `${where} ${id}`,
      ).toBeGreaterThan(0);
      continue;
    }
    const role = STAFF_ROLES.find((r) => id.split(":").at(-2) === r.id)!;
    if (!role.payParameter) continue;
    const expected = Math.round(
      medianTransactionBalance(pressParameter(role.payParameter) / 100) * 100,
    );
    expect(core.people.get(id)?.liquidMinor, `${where} ${id}`).toBe(expected);
    checked += 1;
  }
  expect(checked, `${where}: press people checked`).toBeGreaterThan(0);
});
