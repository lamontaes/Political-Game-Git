import { describe, expect, it } from "vitest";
import { createLifeCore } from "./life";
import { partnershipsModule } from "./modules/partnerships";
import { coreAPI } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { PersonId } from "./types";

// The player's answer to a proposal changes the couple's stage (Lives, Nov 8,
// 2026): yes engages them, turned down sends them back to living together,
// and an ending that is not an answer leaves the proposal open. Records in a
// drawn place: the proposal's own record id names the couple.
const drawn = drawPlace("partnerships-proposal", "lives-town-couples");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;

function proposed(ending?: string) {
  const input = generatedOpening(
    { seed, key },
    { economy: false, settings: { population: 300 } },
  );
  const core = createLifeCore(input, { modules: [partnershipsModule] });
  const api = coreAPI(core);
  const [a, b] = [...core.people.values()]
    .filter((row) => row.tier !== "husk" && row.alive)
    .slice(0, 2);
  const linkId = `partnership:${a!.id}:${b!.id}:${core.date}`;
  api
    .moduleState("partnerships")
    .table("couples")
    .put({
      id: linkId,
      stage: "proposed",
      since: core.date,
      progress: 0,
    } as never);
  const causeId = `family.engaged:${linkId}`;
  api.emit({
    id: `scene-reply:${linkId}:${ending ?? "none"}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [a!.id, b!.id] as PersonId[],
    placeId: a!.placeId,
    source: { tag: "SOURCED", citation: "A reply.", asOf: core.date },
    facts: {
      typeKey: "proposal",
      causeId,
      move: "agree",
      ...(ending ? { ending } : {}),
    },
  });
  return api.moduleState("partnerships").table("couples").get(linkId) as
    { stage: string; progress: number } | undefined;
}

describe(`the player's answer to a proposal in ${drawn.name} (seed ${seed})`, () => {
  it("makes them engaged on a yes", () => {
    expect(proposed("said-yes")?.stage).toBe("engaged");
  });
  it("sends them back to living together, starting over, when turned down", () => {
    const row = proposed("turned-down");
    expect(row?.stage).toBe("living-together");
    expect(row?.progress).toBe(0);
  });
  it("puts it half a stage off when put off", () => {
    const row = proposed("not-yet");
    expect(row?.stage).toBe("living-together");
    expect(row?.progress).toBe(0.5);
  });
  it("leaves the proposal open while the talk goes on", () => {
    expect(proposed()?.stage).toBe("proposed");
  });
});
