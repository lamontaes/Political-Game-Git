/**
 * Personality in the views engine (civic family): how far an argument or a
 * story moves a hearer (outcome.persuasion, outcome.news-reaction: a printed
 * story reaches readers as an event through the same path) and how far they
 * trust a speaker (outcome.trust-generalized). A drawn place's population
 * (a place drawn from all 56 from a fresh seed) hears one speech in two cores built
 * from the same input, one with the persuasion weight as it stands and one
 * with it at zero. No study gives a one-occasion size, so both run at the
 * general weight (SG-TRAITS-persuasion-size).
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { createLifeCore } from "../life";
import { buildPopulation } from "../population";
import { coreAPI } from "../state";
import { decisionLean } from "../trait-decisions";
import { weightOf, withTraitWeight, RUN_SEED } from "../trait-test-kit";
import { drawPlace } from "../../../tests/golden-path/place";
import { deliverSpeech, speechModule, type Retelling } from "./speech";
import { standingWith, viewOf, viewsModule } from "./views";

const SEED = `${RUN_SEED}:views`;
const place = drawPlace(SEED, "trait-wiring");
const input = buildPopulation({
  seed: SEED,
  placeKey: place.key,
  startedAt: "2025-01-20",
  minimumPeople: 900,
});

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
  const run = (): Retelling[] =>
    deliverSpeech(api, {
      id: "speech:trait-test",
      speakerId: speaker.id,
      placeId: speaker.placeId,
      topic: "fixture:park",
      desiredChange: "build-park",
      audienceIds: adults.slice(1).map((p) => p.id),
    });
  const retellings =
    weight === null
      ? run()
      : withTraitWeight(core, "views.persuasion", weight, run);
  return { core, api, speaker, adults, retellings };
}

describe(`a speech heard in ${place.name} (seed ${SEED})`, () => {
  const played = hear(null);
  const flat = hear(0);

  it("moves each hearer by the speech's size times e to the weight times their lean toward yielding, and by the plain size when personality is flat", () => {
    const w = weightOf(played.core, "views.persuasion");
    const flatMoved = new Map(
      flat.retellings.map((r) => [r.listenerId, r.moved]),
    );
    const rows = played.retellings
      .filter((r) => (flatMoved.get(r.listenerId) ?? 0) > 0)
      .map((r) => ({
        id: r.listenerId,
        ratio: r.moved / flatMoved.get(r.listenerId)!,
        lean: decisionLean(
          played.core,
          played.core.people.get(r.listenerId)!,
          "views.persuasion",
          "yield",
          "resist",
        ),
      }))
      .sort((a, b) => a.lean - b.lean);
    expect(rows.length).toBeGreaterThan(100);
    for (const row of rows)
      expect(row.ratio, row.id).toBeCloseTo(Math.exp(w * row.lean), 6);
    const third = Math.floor(rows.length / 3);
    const mean = (part: typeof rows) =>
      part.reduce((sum, r) => sum + r.ratio, 0) / part.length;
    const top = mean(rows.slice(-third));
    const bottom = mean(rows.slice(0, third));
    console.log(
      `persuasion: ${rows.length} hearers, weight ${w}, the third leaning most toward yielding moved ${top.toFixed(3)} times the flat size, the third leaning least ${bottom.toFixed(3)}`,
    );
    expect(top - bottom).toBeGreaterThan(0.2);
  });

  it("a speaker stands higher with a hearer whose traits lean toward trust than with one whose traits lean away, other things equal", () => {
    const { core, api, speaker, adults } = played;
    const ranked = adults
      .slice(1)
      .map((p) => ({
        p,
        lean: decisionLean(core, p, "views.trust", "trust", "distrust"),
      }))
      .filter((row) => viewOf(api, row.p.id) !== null)
      .sort((a, b) => a.lean - b.lean);
    const standing = (id: string) =>
      standingWith(
        api,
        viewOf(api, id)!,
        speaker.id,
        "fixture:park",
        "build-park",
      );
    const trusting = ranked[ranked.length - 1]!;
    const wary = ranked[0]!;
    const withTraits = standing(trusting.p.id) - standing(wary.p.id);
    const without = withTraitWeight(
      core,
      "views.trust",
      0,
      () => standing(trusting.p.id) - standing(wary.p.id),
    );
    console.log(
      `trust: ${trusting.p.id} (lean ${trusting.lean.toFixed(2)}) against ${wary.p.id} (lean ${wary.lean.toFixed(2)}): standing gap ${withTraits.toFixed(3)} with traits, ${without.toFixed(3)} without`,
    );
    expect(withTraits - without).toBeGreaterThan(0.02);
  });
});
