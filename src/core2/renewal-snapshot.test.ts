import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createRenewalCore } from "./births-setup";
import { setBookkeeping } from "./bookkeeping";
import { RENEWAL_MODULE, RENEWAL_MODULE_ID } from "./modules/renewal";
import { restoreWorld, snapshotWorld, uncoveredModules } from "./snapshot";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const initialize = (core: CoreState) =>
  RENEWAL_MODULE.onDay!(
    coreAPI(core),
    () => {
      throw new Error("Initialization must not request a discretionary act");
    },
    () => undefined,
  );
const couples = (core: CoreState) =>
  coreAPI(core).moduleState(RENEWAL_MODULE_ID).table("couples");

// A place drawn from all 56 whose opening has a couple to retain: the tiny
// ones (a few dozen people) open with none, so the draw goes on to the next.
function drawWithCouple() {
  setBookkeeping(false);
  for (let i = 0; i < 12; i += 1) {
    const candidate = drawPlace(i ? `${seed}:${i}` : seed, "renewal-snapshot");
    const input = generatedOpening(candidate, {
      twoLevel: false,
      settings: { population: 1500 },
    });
    const core = createRenewalCore(input);
    initialize(core);
    if (couples(core).rows().length) return { place: candidate, input };
  }
  throw new Error(`No drawn place had a couple in its opening: seed ${seed}`);
}
const { place, input: drawnInput } = drawWithCouple();

describe(`renewal restore in ${place.name}, seed ${seed}`, () => {
  it("retains a saved inactive couple and can restore before initialization", () => {
    setBookkeeping(false);
    const input = drawnInput;
    const original = createRenewalCore(input);
    const cold = snapshotWorld(original);
    initialize(original);
    const first = couples(original).rows()[0];
    expect(
      first,
      "the drawn population must provide an existing couple",
    ).toBeDefined();
    // A couple can become inactive after moving or separating. Restore must
    // retain that state instead of reconstructing the opening partnership.
    const inactive = { ...first!, status: "inactive" };
    couples(original).put(inactive);
    const saved = snapshotWorld(original);
    const loaded = createRenewalCore(input);
    restoreWorld(loaded, saved);
    initialize(loaded);
    expect(couples(loaded).get(inactive.id)).toEqual(inactive);
    expect(uncoveredModules(loaded)).not.toContain(RENEWAL_MODULE_ID);

    // restoreWorld's contract requires a freshly rebuilt world. A snapshot
    // from before initialization must still build its plans on the first day.
    const early = createRenewalCore(input);
    restoreWorld(early, cold);
    expect(couples(early).rows()).toHaveLength(0);
    initialize(early);
    expect(couples(early).rows().length).toBeGreaterThan(0);
    expect(couples(early).get(inactive.id)?.status).toBe("active");
  }, 600_000);
});
