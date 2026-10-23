import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import { stateOfCountedPlace } from "./modules/counted-moves";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `moves-places:${Date.now()}:${Math.random().toString(16).slice(2)}`;
const place = drawPlace(seed, "moves-places");

// Every place that holds counted households, the state-level one included,
// names its state, so its people weigh the same moves as the town's.
it(`names the state of every counted place in ${place.name} (seed ${seed})`, () => {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const town = lawChain(coreAPI(core)).townPlaceId;
  const states = new Set<string | undefined>();
  const places = new Set<string>();
  for (const h of residentsRuntime(core)!.store.liveHouseholds())
    places.add(h.placeId);
  for (const placeId of places) states.add(stateOfCountedPlace(placeId));
  expect(places.has(town), "the town holds counted households").toBe(true);
  expect([...states], `states of ${[...places].join(", ")}`).toHaveLength(1);
  expect(states.has(undefined)).toBe(false);
  expect(stateOfCountedPlace(town)).toBe(
    core.placeMetadata.housingState as string,
  );
}, 600_000);
