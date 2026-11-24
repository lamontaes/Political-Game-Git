import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "./kernel/dates";
import { enrichCivicInputs } from "./civic-inputs";
import { currentCloseness } from "./closeness";
import { GRIEF, griefHalfLifeDays, griefToday } from "./grief";
import { advanceCore, availableActs, chooseAct, createLifeCore } from "./life";
import { parameter } from "./parameters";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// P15 part 4: each person's own resilience line sets how fast grief fades.
describe("grief and the resilience line", () => {
  const core = createLifeCore(
    enrichCivicInputs(
      buildPopulation({
        seed: "p15-grief",
        startedAt: "2021-01-01",
        minimumPeople: 300,
      }),
    ),
  );
  const api = coreAPI(core);
  const p = (key: string) => parameter(key, core.data.parameters);
  const people = [...core.people.values()];

  it("spreads half-lives so the Bonanno shares hold at 6 and 18 months", () => {
    const month = p("daysPerMeanYear") / p("monthsPerYear");
    const lines = people.map((person) => griefHalfLifeDays(api, person.id));
    const left = (months: number) =>
      lines.map((days) => p("two") ** (-(months * month) / days));
    const little =
      left(p("griefEarlyCheckMonths")).filter(
        (share) => share <= p("griefLittleFraction"),
      ).length / lines.length;
    const chronic =
      left(p("griefLateCheckMonths")).filter(
        (share) => share > p("griefLittleFraction"),
      ).length / lines.length;
    // Sampling error for a few thousand people is about two points.
    expect(Math.abs(little - p("griefResilientShare"))).toBeLessThan(0.04);
    expect(Math.abs(chronic - p("griefChronicShare"))).toBeLessThan(0.04);
    // Keyed to each person: the same person always gets the same line.
    expect(new Set(lines).size).toBeGreaterThan(lines.length * 0.99);
    expect(griefHalfLifeDays(api, people[0]!.id)).toBe(lines[0]);
  });

  it("gives relatives who learn of a death grief that pulls toward rest and family and fades", () => {
    const deceased = people.find(
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        [...person.familyIds].some((id) => {
          const other = core.people.get(id);
          return (
            other?.alive &&
            other.tier !== "husk" &&
            core.relationships.has([id, person.id].sort().join(":"))
          );
        }),
    )!;
    const relatives = [...deceased.familyIds].filter(
      (id) =>
        core.people.get(id)?.alive &&
        core.relationships.has([id, deceased.id].sort().join(":")),
    );
    const mourner = core.people.get(
      relatives.find((id) => core.people.get(id)!.tier !== "husk")!,
    )!;
    const closeness = currentCloseness(
      core,
      core.relationships.get([mourner.id, deceased.id].sort().join(":"))!,
    );
    const restGrief = () =>
      chooseAct(core, mourner.id, availableActs(core, mourner.id))
        .scores?.find((row) => row.actionId === "rest")
        ?.reasonTerms?.find((term) => term.id === "grief-pull")?.value ?? 0;
    core.focusPersonIds.add(mourner.id);
    expect(restGrief()).toBe(0);
    api.updatePerson(deceased.id, { alive: false });
    api.emit({
      id: `life.death:${deceased.id}:${core.date}`,
      date: core.date,
      kind: GRIEF.deathEventKinds[0]!,
      personIds: [deceased.id],
      witnessIds: relatives,
      placeId: deceased.placeId,
      source: { tag: "ESTIMATED", asOf: core.date, citation: "test death" },
    });
    expect(griefToday(api, mourner).grief).toBeCloseTo(closeness, 9);
    expect(restGrief()).toBeCloseTo(closeness, 9);
    // A visit to family carries the pull; a visit outside the family does not.
    const scores = chooseAct(
      core,
      mourner.id,
      availableActs(core, mourner.id),
    ).scores!;
    for (const row of scores.filter(
      (score) => score.actionId === "contact-known-person",
    )) {
      const pull = row.reasonTerms?.find((term) => term.id === "grief-pull");
      expect(pull !== undefined).toBe(mourner.familyIds.has(row.targetId));
    }
    const start = core.date;
    const days = p("daysPerWeek") * p("two");
    advanceCore(core, addDays(makeIsoDate(core.date), days));
    expect(griefToday(api, mourner).grief).toBeCloseTo(
      closeness * p("two") ** (-days / griefHalfLifeDays(api, mourner.id)),
      9,
    );
    expect(core.date > start).toBe(true);
  });
});
