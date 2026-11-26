/**
 * Press staff open with savings: every reporter and editor drawn from the
 * town's people holds what the census gave them, and everyone the press
 * engine seats from a recorded identity (staff who live outside the town)
 * holds the savings officials seated the same way get at their pay
 * (official-living.ts: the survey's median for a family at that pay, spread
 * by person). A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce
 * a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { gameStartDate } from "../../../src/core2/game-start";
import { outletsHere, pressParameter } from "../../../src/core2/modules/press";
import { STAFF_ROLES } from "../../../src/core2/press-staff";
import { officialHousehold } from "../../../src/core2/official-living";
import { lawChain } from "../../../src/core2/modules/laws";
import { coreAPI } from "../../../src/core2/state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("every paid press employee opens with the survey balance for their pay", () => {
  const draw = drawPlace(seed, "press-staff-cash");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const { stateKey } = lawChain(api);
  // Where each person was seated: a local outlet's people in the town's
  // state, a national outlet's where it is based.
  const ids = outletsHere(api).flatMap((o) =>
    [o.ownerId, o.headId, ...o.reporterIds].map(
      (id) => [id, o.tier === "national" ? o.placeId : stateKey] as const,
    ),
  );
  let checked = 0;
  for (const [id, seatedIn] of ids) {
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
    const expected = officialHousehold(
      api,
      seatedIn,
      pressParameter(role.payParameter),
      id,
    ).savingsMinor;
    expect(core.people.get(id)?.liquidMinor, `${where} ${id}`).toBe(expected);
    checked += 1;
  }
  expect(checked, `${where}: press people checked`).toBeGreaterThan(0);
}, 300_000);
