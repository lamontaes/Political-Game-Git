/**
 * Which laws reach the town's outcome web (Nation, Nov 9). The web ignores a
 * `law-took-effect` event whose place is `national:<state>`, so that place
 * must belong to another state's law alone: a federal law and the town's own
 * state's law take effect for the town (the event carries the town's place),
 * and only a law of a state outside the town's chain is a national event.
 * Played in a small world with the laws module at a place drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import { corePlaceStateIdentities } from "./place-lookup";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const SERIES = "us-policy-positions:environment-energy.price-carbon";

describe(`a law taking effect is national only for another state (seed ${seed})`, () => {
  it("sends a federal law and the town's own state's law to the town, and another state's to the nation", () => {
    const place = drawPlace(`${seed}:places`, "core2-law-places");
    const core = createLifeCore(
      buildPopulation({
        seed: place.seed,
        placeKey: place.key,
        startedAt: gameStartDate(),
        minimumPeople: 30,
      }),
    );
    openLaws(core);
    const api = coreAPI(core);
    const chain = lawChain(api);
    const other = corePlaceStateIdentities()
      .map((row) => row.jurisdictionKey)
      .filter((key) => key !== chain.stateKey && /^US-[A-Z]{2}$/.test(key))
      .sort()[0]!;
    const seen = new Map<string, string>();
    api.subscribeEvents(
      "law-places-test",
      ["law-took-effect"],
      (_api, event) => {
        if (event.id.startsWith("law-took-effect:law:"))
          seen.set(event.id, String(event.placeId));
      },
    );
    const effective = addDays(makeIsoDate(core.date), 2);
    const enact = (
      jurisdiction: string,
      level: "federal" | "state",
      series: string,
    ) =>
      enactLaw(api, {
        jurisdiction,
        level,
        series,
        value: 1,
        effectiveDate: effective,
        measureId: `law-places-${jurisdiction}`,
        citation: "Law places test",
      });
    const federal = enact(
      "US",
      "federal",
      "us-federal-positions:energy-environment.limit-power-plant-carbon",
    );
    const own = enact(chain.stateKey, "state", SERIES);
    const outside = enact(other, "state", SERIES);
    advanceCore(core, addDays(makeIsoDate(core.date), 4));
    const placeOf = (lawId: string) => seen.get(`law-took-effect:${lawId}`);
    process.stdout.write(
      `law places: ${place.name}, ${place.state} (seed ${seed}:places); federal ${federal.id} -> ${placeOf(federal.id)}; own state ${own.id} -> ${placeOf(own.id)}; other state ${outside.id} -> ${placeOf(outside.id)}\n`,
    );
    // The town's web hears the federal law and its own state's law ...
    expect(placeOf(federal.id), "the federal law's event").toBeDefined();
    expect(placeOf(federal.id)!.startsWith("national:")).toBe(false);
    expect(placeOf(own.id), "the own state's law event").toBeDefined();
    expect(placeOf(own.id)!.startsWith("national:")).toBe(false);
    // ... and another state's law is the nation's alone.
    expect(placeOf(outside.id)).toBe(`national:${other}`);
  }, 300_000);
});
