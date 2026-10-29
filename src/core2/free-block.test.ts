import { describe, expect, it } from "vitest";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { enrichCivicInputs } from "./civic-inputs";
import { advanceCore, availableActs, createLifeCore } from "./life";
import { parameter } from "./parameters";
import { buildPopulation } from "./population";

// P15 part 2b: free hours hold several acts from one scoring pass; weekly
// residents plan the coming week and each act happens on its own date.
describe("filling free hours", () => {
  const input = enrichCivicInputs(
    buildPopulation({
      seed: "p15-free-block",
      startedAt: "2021-01-01",
      minimumPeople: 300,
    }),
  );
  const core = createLifeCore(input);
  const p = (key: string) => parameter(key, core.data.parameters);
  const residents = [...core.people.values()].filter(
    (person) => person.alive && person.tier !== "husk",
  );
  const free = new Set(
    core.data.actions
      .filter(
        (row) => !core.data.work?.discretionaryExclusions.includes(row.effect),
      )
      .map((row) => row.id),
  );
  const needOf = new Map(core.data.actions.map((row) => [row.id, row.need]));
  const days = p("daysPerWeek") * p("two");
  const actedOff: string[] = [];
  const contactsOff: string[] = [];
  let perNeedMax = p("zero");
  for (let day = p("zero"); day < days; day += p("one")) {
    const before = new Map(
      residents.map((person) => [person.id, new Map(person.actsByKind)]),
    );
    const date = addDays(makeIsoDate(core.date), p("one"));
    advanceCore(core, date);
    for (const person of residents) {
      const counts = new Map<string, number>();
      let acted = p("zero");
      for (const [id, count] of person.actsByKind) {
        if (!free.has(id)) continue;
        const delta = count - (before.get(person.id)!.get(id) ?? p("zero"));
        if (delta <= p("zero")) continue;
        acted += delta;
        const need = needOf.get(id)!;
        counts.set(need, (counts.get(need) ?? p("zero")) + delta);
      }
      for (const count of counts.values())
        perNeedMax = Math.max(perNeedMax, count);
      // A resident who did not activate today but acted ran a planned act.
      if (acted > p("zero") && person.lastActDate !== date) {
        actedOff.push(person.id);
        if (person.lastContactDate === date) contactsOff.push(person.id);
      }
    }
  }

  it("does at most one act per need on any day", () => {
    expect(perNeedMax).toBe(p("one"));
  });

  it("runs weekly residents' planned acts on their own dates", () => {
    expect(actedOff.length).toBeGreaterThan(p("zero"));
    // A planned visit moves the last contact to the day it happened.
    expect(contactsOff.length).toBeGreaterThan(p("zero"));
  });

  it("offers care only for children at home, by their own age", () => {
    let offered = p("zero");
    for (const person of residents)
      for (const offer of availableActs(core, person.id)) {
        if (offer.definition.effect !== "care") continue;
        offered += p("one");
        const child = core.people.get(offer.targetId)!;
        expect(child.householdId).toBe(person.householdId);
        expect(person.familyIds.has(child.id)).toBe(true);
        expect(
          daysBetween(makeIsoDate(child.birthDate), makeIsoDate(core.date)) /
            p("daysPerMeanYear"),
        ).toBeLessThan(p("householdChildAgeYears"));
      }
    expect(offered).toBeGreaterThan(p("zero"));
  });
});
