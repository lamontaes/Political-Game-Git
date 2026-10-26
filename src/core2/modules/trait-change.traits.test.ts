/**
 * Slow trait change and the stress a hardship brings, on the smallest real
 * slice of the game: the life core with the trait-change module and the
 * health engine's own event impulses installed, a few hundred adults drawn
 * from the opening's spread of levels. The played world's own run (a layoff
 * or eviction in a drawn place) is shown in the pull request.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setBookkeeping } from "../bookkeeping";
import { P } from "../parameters";
import { advanceCore, createLifeCore } from "../life";
import { traitLean } from "../choice";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./health";
import { TRAIT_CHANGE_MODULE } from "./trait-change";
import type { CoreInput, CoreModule, PersonInput, Source } from "../types";

// Play runs with bookkeeping off; the twenty-year checks below would take
// minutes with it on.
let previousBookkeeping = true;
beforeAll(() => {
  previousBookkeeping = setBookkeeping(false);
});
afterAll(() => {
  setBookkeeping(previousBookkeeping);
});

const startedAt = "2021-01-01";
const placeId = "place:trait-fixture";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation: "Controlled input for the trait-change check, not observed people.",
  estimatedFrom: "Authored fixture identities.",
};
const RELIABILITY = "people-mind-v1:reliability";
const CALM = "personality-v1:facet-calm";
const BROODING = "personality-v1:facet-brooding";
const DISTRESS = "personality-v1:concern-for-distress";
/** The opening's 10/20/40/20/10 spread of levels, as a repeating cycle. */
const SPREAD = [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2];

const person = (
  index: number,
  traits: Record<string, number>,
  birthDate: string,
): PersonInput => ({
  id: `person:fixture-${index}`,
  givenName: `Fixture${index}`,
  familyName: "Person",
  birthDate,
  placeId,
  countyId: `${placeId}:county`,
  householdId: `household:fixture-${index}`,
  tier: "daily",
  traits,
  liquidMinor: P.zero,
  livingCostDailyMinor: P.zero,
  familyIds: [],
  knownIds: [],
  source,
});

function town(people: PersonInput[]): CoreInput {
  return {
    seed: "trait-change-fixture",
    startedAt,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: [],
    organizations: [],
    familyLinks: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("maturity", () => {
  it("raises reliability and lowers risk-taking over ten years of adulthood", () => {
    const people = Array.from({ length: 100 }, (_, index) =>
      person(
        index,
        {
          [RELIABILITY]: SPREAD[index % SPREAD.length]!,
          "people-mind-v1:risk": SPREAD[(index * 3) % SPREAD.length]!,
          "personality-v1:facet-duty-bound":
            SPREAD[(index * 7) % SPREAD.length]!,
        },
        `${1999 - (index % 5)}-${String(1 + (index % 12)).padStart(2, "0")}-15`,
      ),
    );
    const core = createLifeCore(town(people), {
      scheduledWork: false,
      modules: [TRAIT_CHANGE_MODULE],
    });
    const mean = (key: string) =>
      [...core.people.values()].reduce(
        (sum, row) => sum + row.traits[key]!,
        0,
      ) / core.people.size;
    const before = {
      reliability: mean(RELIABILITY),
      risk: mean("people-mind-v1:risk"),
      dutyBound: mean("personality-v1:facet-duty-bound"),
    };
    advanceCore(core, "2031-01-01");
    const after = {
      reliability: mean(RELIABILITY),
      risk: mean("people-mind-v1:risk"),
      dutyBound: mean("personality-v1:facet-duty-bound"),
    };
    console.log(
      `maturity, 100 adults aged 22-26 to 32-36: reliability ${before.reliability.toFixed(2)} to ${after.reliability.toFixed(2)}, risk ${before.risk.toFixed(2)} to ${after.risk.toFixed(2)}, duty-bound ${before.dutyBound.toFixed(2)} to ${after.dutyBound.toFixed(2)}`,
    );
    // Roberts, Walton and Viechtbauer 2006: conscientiousness rises through
    // young adulthood; the opening's own curve for excitement-seeking falls.
    expect(after.reliability).toBeGreaterThan(before.reliability + 0.08);
    expect(after.dutyBound).toBeGreaterThan(before.dutyBound + 0.02);
    expect(after.risk).toBeLessThan(before.risk - 0.08);
  }, 120_000);

  it("replaces the traits object and drops the cached lean, so choices read the new person", () => {
    const people = Array.from({ length: 100 }, (_, index) =>
      person(
        index,
        { [RELIABILITY]: SPREAD[index % SPREAD.length]! },
        "1999-03-15",
      ),
    );
    const core = createLifeCore(town(people), {
      scheduledWork: false,
      modules: [TRAIT_CHANGE_MODULE],
    });
    const before = new Map(
      [...core.people.values()].map((row) => [
        row.id,
        { traits: row.traits, lean: traitLean(core, row, ["follow-rules"]) },
      ]),
    );
    advanceCore(core, "2031-01-01");
    let changed = 0;
    for (const row of core.people.values()) {
      const old = before.get(row.id)!;
      if (row.traits === old.traits) continue;
      changed += 1;
      const fresh = traitLean(core, { traits: { ...row.traits } }, [
        "follow-rules",
      ]);
      expect(traitLean(core, row, ["follow-rules"])).toBeCloseTo(fresh, 12);
    }
    expect(changed).toBeGreaterThan(5);
  }, 120_000);
});

describe("hardship", () => {
  const layoffDay = "2021-03-01";
  const layoffs: CoreModule = {
    id: "trait-fixture-layoffs",
    onAfterDay(api) {
      if (api.state.date !== layoffDay) return;
      for (const row of api.state.people.values())
        if (/1$/.test(row.id) || row.id.includes(":hit-"))
          api.emit({
            id: `event:work.job-lost:${layoffDay}:${row.id}`,
            date: layoffDay,
            kind: "work.job-lost",
            personIds: [row.id],
            placeId,
            publicRecord: false,
            topic: "organization:fixture",
            // The jobs engine's own impulse for a lost job.
            ...severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity),
            source,
          });
    },
  };

  const appraised = new Map<string, number>();
  const spy: CoreModule = {
    id: "trait-fixture-appraisal-spy",
    appraisalEventKinds: ["work.job-lost"],
    onEventAppraisal(_api, _event, appraisal) {
      appraised.set(appraisal.actorId, appraisal.stressImpulse);
    },
  };

  it("hits a brooding, distress-prone person harder than a calm one, by the sourced ratio", () => {
    const sensitive = person(
      0,
      { [BROODING]: 2, [DISTRESS]: 2, [CALM]: 0 },
      "1985-06-01",
    );
    const steady = person(
      1,
      { [BROODING]: -2, [DISTRESS]: -2, [CALM]: 0 },
      "1985-06-01",
    );
    const hit = (row: PersonInput, id: string) => ({
      ...row,
      id,
      householdId: `household:${id}`,
    });
    const people = [
      hit(sensitive, "person:hit-a"),
      hit(steady, "person:hit-b"),
    ];
    const core = createLifeCore(town(people), {
      scheduledWork: false,
      modules: [layoffs, spy],
    });
    advanceCore(core, layoffDay);
    const ratio =
      appraised.get("person:hit-a")! / appraised.get("person:hit-b")!;
    console.log(
      `hardship: appraised stress impulse ${appraised.get("person:hit-a")!.toFixed(3)} (brooding, distress-prone) vs ${appraised.get("person:hit-b")!.toFixed(3)} (steady), ratio ${ratio.toFixed(2)}, target 1.65`,
    );
    expect(appraised.get("person:hit-b")).toBeGreaterThan(0);
    // Bolger and Schilling 1991: the most reactive respond about 1.65 times
    // as strongly as the least (the weights' derivation, parameters.json).
    expect(ratio).toBeGreaterThan(1.65 * 0.9);
    expect(ratio).toBeLessThan(1.65 * 1.1);
  });

  it("shifts a laid-off person's emotional stability a small step, and no one else's", () => {
    const people = Array.from({ length: 300 }, (_, index) =>
      person(
        index,
        {
          [CALM]: SPREAD[index % SPREAD.length]!,
          [BROODING]: SPREAD[(index * 3) % SPREAD.length]!,
        },
        "1985-06-01",
      ),
    );
    const core = createLifeCore(town(people), {
      scheduledWork: false,
      modules: [TRAIT_CHANGE_MODULE, layoffs],
    });
    const hitIds = people
      .filter((row) => /1$/.test(row.id))
      .map((row) => row.id);
    const before = new Map(
      [...core.people.values()].map((row) => [row.id, { ...row.traits }]),
    );
    advanceCore(core, "2021-04-01");
    let calmer = 0;
    let lessCalm = 0;
    let moodier = 0;
    let others = 0;
    for (const row of core.people.values()) {
      const old = before.get(row.id)!;
      const hit = hitIds.includes(row.id);
      if (row.traits[CALM]! < old[CALM]!) lessCalm += hit ? 1 : 0;
      if (row.traits[CALM]! > old[CALM]!) calmer += 1;
      if (row.traits[BROODING]! > old[BROODING]!) moodier += hit ? 1 : 0;
      if (
        !hit &&
        (row.traits[CALM] !== old[CALM] ||
          row.traits[BROODING] !== old[BROODING])
      )
        others += 1;
    }
    console.log(
      `life event: ${hitIds.length} laid off, ${lessCalm} less calm, ${moodier} more brooding, ${calmer} calmer, ${others} others changed`,
    );
    expect(lessCalm + moodier).toBeGreaterThan(0);
    expect(calmer).toBe(0);
    expect(others).toBe(0);
  });
});
