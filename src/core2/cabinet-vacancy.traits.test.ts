import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import { setTraitProbe } from "./trait-probe";

// A governor's cabinet post that falls vacant (its holder dies) is filled at
// the executive's next review by the same appointment as the rest of the
// cabinet, so the governor's own traits weigh loyalty against merit
// (appointments.weigh). Before, only a new governor refilled the cabinet, and
// the world's governors filled it without weighing at all.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a vacant cabinet post is refilled by the governor's weighing, seed ${seed}`, () => {
  setBookkeeping(false);
  // The first place drawn from the seed whose governor appoints a cabinet.
  let found:
    | { where: string; core: ReturnType<typeof buildBenchWorld>["core"] }
    | undefined;
  for (let n = 0; n < 12 && !found; n++) {
    const place = drawPlace(seed, `cabinet-vacancy:${n}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    if (appointmentsIn(coreAPI(core), lawChain(coreAPI(core)).stateKey).length)
      found = {
        where: `${place.name} [${place.key}], seed ${place.seed}`,
        core,
      };
  }
  expect(
    found,
    `no place of 12 draws from ${seed} has a cabinet`,
  ).toBeDefined();
  const { core, where } = found!;
  const api = coreAPI(core);
  const state = lawChain(api).stateKey;
  const before = appointmentsIn(api, state);
  const vacated = before[0]!;
  api.updatePerson(vacated.holderId, { alive: false });

  let weighed = 0;
  setTraitProbe({
    formula: (row) => {
      if (row.decisionId === "appointments.weigh") weighed++;
    },
  });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
  } finally {
    setTraitProbe(undefined);
  }
  const after = appointmentsIn(api, state).find(
    (row) => row.post === vacated.post,
  )!;
  expect(after.holderId, where).not.toBe(vacated.holderId);
  expect(core.people.get(after.holderId)?.alive, where).toBe(true);
  expect(after.since > vacated.since, `${where}: ${after.id}`).toBe(true);
  // The refill went through the governor's weighing: the reasons keep its weights.
  expect(
    after.reasons[0]?.loyaltyWeight,
    `${where}: ${after.id}`,
  ).toBeDefined();
  expect(weighed, `${where}: appointments.weigh ran`).toBeGreaterThan(0);
  // The other posts keep their holders while those holders still serve; a
  // holder who died or left in the window (the world's own health and moves
  // engines) is refilled the same way.
  for (const row of before.slice(1)) {
    const holder = core.people.get(row.holderId);
    const now = appointmentsIn(api, state).find((a) => a.post === row.post)!;
    if (holder?.alive && holder.placeId === state)
      expect(now.holderId, `${where}: ${row.post}`).toBe(row.holderId);
    else
      expect(
        now.holderId,
        `${where}: ${row.post} lost its holder in the window`,
      ).not.toBe(row.holderId);
  }
}, 900_000);
