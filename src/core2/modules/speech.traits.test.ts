/**
 * Personality in the speech engine (civic family): who retells a speech at
 * home, and who in the household takes the retelling in. A drawn place's
 * population (a place drawn from all 56 from a fresh seed) hears one speech, once
 * with the retelling decision's trait weight as it stands and once with it at
 * zero, in two cores built from the same input.
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { createLifeCore } from "../life";
import { buildPopulation } from "../population";
import { coreAPI } from "../state";
import { believesClaim } from "../heard-claims";
import { decisionLean } from "../trait-decisions";
import { thirdsLogOdds, withTraitWeight, RUN_SEED } from "../trait-test-kit";
import { drawPlace } from "../../../tests/golden-path/place";
import { deliverSpeech, speechModule, type Retelling } from "./speech";
import { viewsModule } from "./views";

const SEED = `${RUN_SEED}:speech`;
const place = drawPlace(SEED, "trait-wiring");
const input = buildPopulation({
  seed: SEED,
  placeKey: place.key,
  startedAt: "2025-01-20",
  minimumPeople: 900,
});

/** One speech to every adult in the place, with the retelling weight at `weight` (null: as it stands). */
function hear(weight: number | null) {
  const core = createLifeCore(input, { modules: [viewsModule, speechModule] });
  const api = coreAPI(core);
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(input.startedAt)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const speaker = adults[0]!;
  const run = () =>
    deliverSpeech(api, {
      id: "speech:trait-test",
      speakerId: speaker.id,
      placeId: speaker.placeId,
      topic: "fixture:park",
      desiredChange: "build-park",
      audienceIds: adults.slice(1).map((p) => p.id),
    });
  const retellings: Retelling[] =
    weight === null
      ? run()
      : withTraitWeight(core, "speech.retell", weight, run);
  return { core, api, retellings };
}

describe(`a speech heard in ${place.name} (seed ${SEED})`, () => {
  const played = hear(null);
  const flat = hear(0);

  it("is retold at a higher rate by the third leaning most toward retelling than by the third leaning least, and not when personality is flat", () => {
    const gap = (world: ReturnType<typeof hear>) =>
      thirdsLogOdds(
        world.retellings.map((row) => ({
          lean: decisionLean(
            world.core,
            world.core.people.get(row.listenerId)!,
            "speech.retell",
            "speech-retell",
            "speech-keep",
          ),
          p: row.retold ? 1 : 0,
        })),
      );
    const net = gap(played) - gap(flat);
    console.log(
      `retell: ${played.retellings.length} listeners, ${played.retellings.filter((r) => r.retold).length} retold; net log odds ${net.toFixed(3)} (flat arm retold ${flat.retellings.filter((r) => r.retold).length})`,
    );
    expect(net).toBeGreaterThan(0.2);
  });

  it("reaches only the household members who take a claim in, by their own lean", () => {
    const told = played.retellings.filter((row) => row.toIds.length > 0);
    expect(told.length).toBeGreaterThan(0);
    for (const row of told)
      for (const id of row.toIds)
        expect(
          believesClaim(played.core, played.core.people.get(id)!),
          `${row.id} -> ${id}`,
        ).toBe(true);
  });
});
