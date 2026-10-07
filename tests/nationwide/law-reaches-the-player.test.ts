import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import type { NewGameSetup } from "../../src/presentation/new-game";
import {
  lawExposureSentence,
  paycheckLawLines,
} from "../../src/presentation/law-exposure-lines";
import { projectWorld39Journal } from "../../src/presentation/world39-journal";
import {
  enterLifePath,
  lifePaths2Handlers,
  performLifePathSession,
  scheduleLifePathSession,
} from "../../src/simulation/life-paths2";
import { introduceMeasure } from "../../src/simulation/legislation";
import { createLegislativeScenario } from "../../src/simulation/legislation-scenarios";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { SeededRng } from "../../src/simulation/rng";
import type * as TaxLaw from "../../src/simulation/state-income-tax-law";
import { stateIncomeTaxUnderLaw } from "../../src/simulation/state-income-tax-law";
import { residenceStateKey } from "../../src/simulation/statutory-tax";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import type {
  EntityId,
  LawExposureRecord,
  World,
} from "../../src/simulation/types";
import { advanceWorld } from "../../src/simulation/world";

/**
 * The player reads, in the Journal, how a law enacted in play reached their
 * own paycheck. The law's answer for the tax is set here, as in
 * `src/simulation/state-tax-laws-paycheck.test.ts`, because a law enacted in
 * play needs a full legislative history; the pay, the withholding and the
 * Journal are the real ones. The place is drawn from all 56 by the seed.
 */

vi.mock(
  "../../src/simulation/state-income-tax-law",
  async (importOriginal) => ({
    ...(await importOriginal<typeof TaxLaw>()),
    stateIncomeTaxUnderLaw: vi.fn(),
  }),
);

const rule = vi.mocked(stateIncomeTaxUnderLaw);
const actual = await vi.importActual<typeof TaxLaw>(
  "../../src/simulation/state-income-tax-law",
);
const FIXED_LAW = "measure_law-reaches-the-player" as EntityId;
let LAW = FIXED_LAW;
const TITLE = "Fair Share Income Tax Act";
const SEED = "law-reaches-the-player-0929";

beforeEach(() => {
  rule.mockReset();
  rule.mockImplementation(actual.stateIncomeTaxUnderLaw);
});

/** The largest place of each state and D.C., and one per territory. */
function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

const PLACES = onePlaceEach();
const PLACE = new SeededRng(SEED).pick(PLACES);

function newLife(): { world: World; personId: EntityId } {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 30,
    placeKey: PLACE,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    priors: [],
    seed: SEED,
  } as NewGameSetup);
  // The measure the tax rows name, filed through the ordinary writer. Its
  // passage is not what this test reads; the tax rule's answer is set above.
  const template =
    createLegislativeScenario("nebraska").world.history.legislativeMeasures!.at(
      -1,
    )!;
  const world = introduceMeasure(created.world, {
    stableKey: "law-reaches-the-player:measure",
    jurisdictionId:
      created.world.people[created.playerPersonId]!.homeJurisdictionId!,
    rulePackId: template.rulePackId,
    designation: "LB 1",
    shortTitle: TITLE,
    summary: "Sets the state income tax.",
    origin: "member-introduction",
    subjectClass: template.subjectClass,
  });
  LAW = world.history.legislativeMeasures!.at(-1)!.id;
  return { world, personId: created.playerPersonId };
}

function workOneShift(world: World): World {
  const entered = enterLifePath(world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  const workId = entered.world.history.workRelationships.at(-1)!.id;
  const scheduled = scheduleLifePathSession(entered.world, workId);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
  const worked = performLifePathSession(scheduled.world, activityId);
  expect(worked.ok, worked.message).toBe(true);
  return advanceWorld(worked.world, 1, lifePaths2Handlers());
}

function journalTexts(world: World, personId: EntityId): string[] {
  return projectWorld39Journal(world, personId).entries.map(
    (entry) => entry.text,
  );
}

describe(`a law reaches the player's own paycheck (place ${PLACE}, seed ${SEED})`, () => {
  it("says in the Journal how much a new income tax law took from the paycheck", () => {
    const start = newLife();
    const stateKey = residenceStateKey(start.world, start.personId);
    rule.mockImplementation((_world, key) =>
      key === stateKey
        ? {
            kind: "estimated",
            shape: "flat",
            lawMeasureIds: [LAW],
            schedule: {
              standardDeductionMinor: 0,
              brackets: [{ overMinor: 0, rateBasisPoints: 400 }],
              sourceUrl: null,
            },
            estimatedFromAverage: "ESTIMATED FROM AVERAGE: test.",
          }
        : { kind: "as-begun" },
    );
    // Before the paycheck the Journal says nothing about the law.
    expect(journalTexts(start.world, start.personId).join(" ")).not.toContain(
      TITLE,
    );
    const worked = workOneShift(start.world);
    const lines = paycheckLawLines(worked, start.personId);
    expect(lines).toHaveLength(1);
    // 4% of the $72.00 shift.
    expect(lines[0]!.text).toMatch(
      new RegExp(
        `^Because of the ${TITLE}, \\$2\\.88 for .+ income tax came out of your .+ paycheck of \\$72\\.$`,
      ),
    );
    expect(journalTexts(worked, start.personId)).toContain(lines[0]!.text);
  });

  it("says in the Journal that a repeal left the tax out of the paycheck", () => {
    const start = newLife();
    const stateKey = residenceStateKey(start.world, start.personId);
    rule.mockImplementation((_world, key) =>
      key === stateKey
        ? { kind: "repealed", lawMeasureIds: [LAW] }
        : { kind: "as-begun" },
    );
    const worked = workOneShift(start.world);
    const text = paycheckLawLines(worked, start.personId)[0]?.text ?? "";
    expect(text).toMatch(
      new RegExp(
        `^No .+ income tax came out of your .+ paycheck of \\$72, because the ${TITLE} ended it\\.$`,
      ),
    );
    expect(journalTexts(worked, start.personId)).toContain(text);
  });

  it("shows nothing where no law touched the paycheck", () => {
    const start = newLife();
    const worked = workOneShift(start.world);
    expect(paycheckLawLines(worked, start.personId)).toEqual([]);
  });
});

describe("a law exposure in the player's words", () => {
  const world = {
    people: {
      p: { id: "p", givenName: "Ada", familyName: "Reyes" },
      q: { id: "q", givenName: "Sam", familyName: "Reyes" },
    },
    history: { legislativeMeasures: [{ id: FIXED_LAW, shortTitle: TITLE }] },
  } as unknown as World;
  const exposure = (over: Partial<LawExposureRecord>): LawExposureRecord =>
    ({
      id: "x",
      personId: "p",
      measureId: FIXED_LAW,
      channel: "tax-payment",
      relation: "own",
      viaPersonId: null,
      direction: "cost",
      amount: { minorUnits: 12_000, currency: "USD" },
      cadence: "one-time",
      monthlyPay: { minorUnits: 300_000, currency: "USD" },
      ...over,
    }) as LawExposureRecord;

  it("names the law, the money and its share of a month's pay", () => {
    expect(lawExposureSentence(world, "p" as EntityId, exposure({}))).toBe(
      `The ${TITLE} cost you $120 in taxes, about 4% of a month's pay.`,
    );
    expect(
      lawExposureSentence(
        world,
        "p" as EntityId,
        exposure({
          channel: "rent",
          cadence: "monthly",
          relation: "family",
          viaPersonId: "q" as EntityId,
          monthlyPay: null,
        }),
      ),
    ).toBe(`The ${TITLE} raised Sam's rent by $120 a month.`);
  });

  it("writes nothing for somebody else's exposure or an unknown law", () => {
    expect(lawExposureSentence(world, "q" as EntityId, exposure({}))).toBe(
      null,
    );
    expect(
      lawExposureSentence(
        world,
        "p" as EntityId,
        exposure({ measureId: "other" as EntityId }),
      ),
    ).toBe(null);
  });
});
