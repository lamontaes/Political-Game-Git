import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { gameStartDate } from "./game-start";
import { unemploymentTerms } from "./jobs-benefits";
import { createLifeCore } from "./life";
import { openLaws } from "./modules/laws";
import { worldCoreData } from "./modules/world";
import { corePlaceStateIdentities } from "./place-lookup";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`reads plausible weekly benefit shares from every jurisdiction's law, replay ${replay}`, () => {
  const states = corePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const observed: unknown[] = [];
  for (const state of states) {
    const seed = createHash("sha256")
      .update(`${replay}:${state.jurisdictionKey}`)
      .digest("hex");
    const places = [...placeLocalities(state.jurisdictionKey)].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    const place = places[parseInt(seed.slice(0, 8), 16) % places.length]!;
    // A laws-reader fixture only; the played-year proof uses buildBenchWorld.
    const core = createLifeCore(
      {
        seed,
        startedAt: gameStartDate(),
        people: [],
        households: [],
        jobs: [],
        organizations: [],
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
        placeMetadata: { placeKey: place.key },
      },
      { data: worldCoreData() },
    );
    openLaws(core);
    const terms = unemploymentTerms(coreAPI(core));
    const where = `${place.displayName} (${place.key}), ${state.jurisdictionKey}, seed ${seed}, ${terms.lawId}`;
    observed.push({
      town: place.displayName,
      key: place.key,
      seed,
      state: state.jurisdictionKey,
      hasProgram: terms.hasProgram,
      weeklyShare: terms.weeklyShare,
      lawId: terms.lawId,
      source: terms.source.citation,
    });
    if (!terms.hasProgram) {
      expect(terms.weeklyShare, where).toBe(0);
      continue;
    }
    expect.soft(terms.weeklyShare, where).toBeGreaterThanOrEqual(0.4);
    expect.soft(terms.weeklyShare, where).toBeLessThanOrEqual(0.7);
    expect(terms.lawId, where).toBeTruthy();
  }
  console.log(JSON.stringify({ replay, jurisdictions: observed }));
}, 300_000);
