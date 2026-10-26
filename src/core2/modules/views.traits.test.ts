/**
 * Personality in the views engine (civic family): how far an argument or a
 * story moves a hearer (outcome.persuasion, outcome.news-reaction: a printed
 * story reaches readers as an event through the same path) and how far they
 * trust a speaker (outcome.trust-generalized). A drawn place's population
 * (a place drawn from all 56 from a fresh seed) hears one speech in two cores built
 * from the same input, one with the persuasion weight as it stands and one
 * with it at zero. Each weight is set so the thirds of lean differ by the
 * study's odds across occasions (SG-TRAITS-persuasion-size: no study gives
 * one occasion's size).
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { createLifeCore } from "../life";
import { buildPopulation } from "../population";
import { coreAPI } from "../state";
import { decisionLean } from "../trait-decisions";
import {
  studyLogOdds,
  weightOf,
  withTraitWeight,
  RUN_SEED,
} from "../trait-test-kit";
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
    const target = studyLogOdds("views.persuasion", "openness")!;
    console.log(
      `persuasion: ${rows.length} hearers, weight ${w}, the third leaning most toward yielding moved ${top.toFixed(3)} times the flat size, the third leaning least ${bottom.toFixed(3)}: log ratio ${Math.log(top / bottom).toFixed(3)} against the study's ${target.toFixed(3)}`,
    );
    // The thirds' ratio is read as the study's odds ratio; one town's lean
    // spread moves it, so within a factor of two on the log scale.
    expect(Math.log(top / bottom)).toBeGreaterThan(target / 2);
    expect(Math.log(top / bottom)).toBeLessThan(target * 2);
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
    // Every hearer's standing with temperament against without it, by thirds
    // of their lean toward trusting, against the study's odds.
    const ratios = ranked.map((row) => {
      const flatStanding = withTraitWeight(core, "views.trust", 0, () =>
        standing(row.p.id),
      );
      return standing(row.p.id) / flatStanding;
    });
    const third = Math.floor(ratios.length / 3);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const logRatio = Math.log(
      mean(ratios.slice(-third)) / mean(ratios.slice(0, third)),
    );
    const target = studyLogOdds("views.trust", "agreeableness")!;
    console.log(
      `trust: ${ratios.length} hearers, log ratio of the thirds' standing ${logRatio.toFixed(3)} against the study's ${target.toFixed(3)}`,
    );
    expect(logRatio).toBeGreaterThan(target / 2);
    expect(logRatio).toBeLessThan(target * 2);
  });
});
