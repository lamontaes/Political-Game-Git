import { describe, expect, it } from "vitest";
import { stableHash } from "./kernel/ids";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { corePlaceStateIdentities } from "./place-lookup";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import { stancesOf, viewOf, viewsModule, VIEWS_KEYS } from "./modules/views";
import { buildPopulation } from "./population";
import { realLocalities } from "./places";
import { applyCoreEvent, coreAPI } from "./state";

// M1-10, first version: in two places drawn from all 56, each town's views
// sit inside its state's real spread (CES 2024), so conservatives in two
// states differ; a recorded event moves the people it reached and no one else.

/** One locality from a state drawn from all 56 by the seed. */
function drawnPlace(seed: string) {
  const states = [...corePlaceStateIdentities()].sort((a, b) =>
    stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${seed}:${b.jurisdictionKey}`),
    ),
  );
  const localities = realLocalities();
  for (const state of states) {
    const place = localities
      .filter(
        (row) =>
          row.stateJurisdictionKey === state.jurisdictionKey &&
          row.scope === "locality",
      )
      .sort((a, b) =>
        stableHash(`${seed}:${a.key}`).localeCompare(
          stableHash(`${seed}:${b.key}`),
        ),
      )[0];
    if (place) return place;
  }
  throw new Error("No locality drawn.");
}

const seeds = [process.env.GOLDEN_PATH_SEED ?? "views-a", "views-b"];
const towns = seeds.map((seed) => {
  const place =
    seed === process.env.GOLDEN_PATH_SEED && process.env.GOLDEN_PATH_PLACE_KEY
      ? { key: process.env.GOLDEN_PATH_PLACE_KEY }
      : drawnPlace(seed);
  const input = buildDeepPast(
    buildPopulation({
      seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    }),
  );
  const core = createLifeCore(input, { modules: [viewsModule] });
  const api = coreAPI(core);
  const adults = [...core.people.values()].filter(
    (row) =>
      row.tier !== "husk" &&
      ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 18,
  );
  const views = adults.map((row) => viewOf(api, row.id)!);
  return { seed, input, core, api, adults, views };
});

describe("political views", () => {
  it.each(
    towns.map((town, index) => [
      index,
      town.input.placeMetadata?.placeName,
      town.seed,
    ]),
  )("town %i (%s, seed %s) sits inside its state's real spread", (index) => {
    const { views } = towns[index as number]!;
    const state = views[0]!.basis.split(":")[1]!;
    const key = VIEWS_KEYS.states[state] ?? VIEWS_KEYS.national;
    const spreads = Object.values(VIEWS_KEYS.states)
      .map((row) => (row as { countySpread?: number }).countySpread)
      .filter((value): value is number => value !== undefined)
      .sort((a, b) => a - b);
    const spread =
      (key as { countySpread?: number }).countySpread ??
      spreads[Math.floor(spreads.length / 2)]!;
    const mean = views.reduce((sum, row) => sum + row.lean, 0) / views.length;
    const sampling = key.sd / Math.sqrt(views.length);
    expect(Math.abs(mean - key.mean)).toBeLessThanOrEqual(
      2 * spread + 2 * sampling,
    );
    const share = (labels: string[]) =>
      views.filter((row) => labels.includes(row.label)).length / views.length;
    const shares = key.shares!;
    expect(
      Math.abs(
        share(["conservative", "veryConservative"]) -
          (shares.conservative! + shares.veryConservative!),
      ),
    ).toBeLessThan(0.15);
    expect(Math.abs(share(["not-sure"]) - shares.notSure!)).toBeLessThan(0.08);
    // Every view names the records and key cell it came from.
    for (const row of views) expect(row.basis).toMatch(/^ces-2024:/);
  });

  it("carries each person's education and faith, as the survey does", () => {
    const { views } = towns[0]!;
    const group = (faith: string) =>
      views.filter((row) => row.basis.endsWith(`:${faith}`));
    const mean = (rows: typeof views) =>
      rows.reduce((sum, row) => sum + row.lean, 0) / Math.max(1, rows.length);
    expect(group("protestant").length).toBeGreaterThan(10);
    expect(group("none").length).toBeGreaterThan(10);
    expect(mean(group("protestant"))).toBeGreaterThan(mean(group("none")));
  });

  it("forms the same view for the same person when they are filled in again", () => {
    const town = towns[0]!;
    const again = createLifeCore(town.input, { modules: [viewsModule] });
    const person = town.adults[0]!;
    expect(viewOf(coreAPI(again), person.id)).toEqual(
      viewOf(town.api, person.id),
    );
  });

  it("moves the stances of the people an event reached, with its cause, and no one else", () => {
    const { core, api, adults } = towns[0]!;
    const [hit, witness, ...others] = adults;
    applyCoreEvent(core, {
      id: "fixture-plant-closing",
      date: core.date,
      kind: "fixture.plant-closing",
      personIds: [hit!.id],
      witnessIds: [witness!.id],
      placeId: hit!.placeId,
      topic: "fixture:jobs",
      desiredChange: "keep-jobs",
      moodImpulse: -0.4,
      stressImpulse: 0.3,
      source: { tag: "SOURCED", citation: "Fixture event.", asOf: core.date },
    });
    for (const id of [hit!.id, witness!.id]) {
      const [stance] = stancesOf(api, id);
      expect(stance).toMatchObject({
        topic: "fixture:jobs",
        desiredChange: "keep-jobs",
      });
      expect(stance!.strength).toBeGreaterThan(0);
      expect(stance!.causes[0]!.eventId).toBe("fixture-plant-closing");
    }
    for (const row of others) expect(stancesOf(api, row.id)).toEqual([]);
  });
});
