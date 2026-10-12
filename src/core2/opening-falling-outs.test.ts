import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { OPENING_FALLING_OUTS } from "./opening-falling-outs";
import { parameter, PARAMETERS } from "./parameters";
import { buildPopulation } from "./population";

// P15 part 3: pairs who shared a class or workgroup may have fallen out,
// smoothly by their temperaments and the years they shared.
describe("falling-outs in the shared past", () => {
  const build = () =>
    buildDeepPast(
      buildPopulation({
        seed: "p15-falling-outs",
        startedAt: "2021-01-01",
        minimumPeople: 2000,
      }),
    );
  const input = build();
  const p = (key: string) => parameter(key, PARAMETERS);
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const fallingOuts = (id: string) =>
    (byId.get(id)!.pastFacts ?? []).filter(
      (fact) => fact.kind === OPENING_FALLING_OUTS.factKind,
    );

  it("gives about the YouGov share of adults a falling-out", () => {
    const adults = input.people.filter(
      (person) =>
        person.tier !== "husk" &&
        ageOnDate(
          makeIsoDate(person.birthDate),
          makeIsoDate(input.startedAt),
        ) >= 18,
    );
    const share =
      adults.filter((person) => fallingOuts(person.id).length).length /
      adults.length;
    // Calibrated pooled over six places; measured places run 60% to 74%.
    expect(Math.abs(share - 0.68)).toBeLessThan(0.1);
  });

  it("records each falling-out on both people, dated within what they shared", () => {
    let checked = 0;
    for (const person of input.people)
      for (const fact of fallingOuts(person.id)) {
        const other = fact.facts!.otherPersonId!;
        const mirror = fallingOuts(other).find(
          (row) =>
            row.facts!.otherPersonId === person.id && row.date === fact.date,
        );
        expect(mirror).toBeDefined();
        const context = person.pastFacts!.find(
          (row) => row.id === fact.facts!.contextFactId,
        );
        expect(context).toBeDefined();
        expect(fact.date >= context!.date).toBe(true);
        expect(fact.date < input.startedAt).toBe(true);
        checked += 1;
      }
    expect(checked).toBeGreaterThan(0);
  });

  it("falls out more often between people quick to conflict and less reliable", () => {
    const rates = { quick: [0, 0], calm: [0, 0] };
    const trait = (id: string, key: string) => byId.get(id)!.traits?.[key] ?? 0;
    for (const person of input.people)
      for (const fact of person.pastFacts ?? []) {
        if (!OPENING_FALLING_OUTS.pairKinds.includes(fact.kind)) continue;
        const other = fact.facts!.otherPersonId!;
        const temper =
          trait(person.id, OPENING_FALLING_OUTS.conflictTrait) +
          trait(other, OPENING_FALLING_OUTS.conflictTrait) -
          trait(person.id, OPENING_FALLING_OUTS.reliabilityTrait) -
          trait(other, OPENING_FALLING_OUTS.reliabilityTrait);
        const bucket =
          temper >= p("two")
            ? rates.quick
            : temper <= -p("two")
              ? rates.calm
              : undefined;
        if (!bucket) continue;
        bucket[1] += 1;
        if (
          fallingOuts(person.id).some(
            (row) => row.facts!.otherPersonId === other,
          )
        )
          bucket[0] += 1;
      }
    expect(rates.quick[1]).toBeGreaterThan(50);
    expect(rates.calm[1]).toBeGreaterThan(50);
    expect(rates.quick[0] / rates.quick[1]).toBeGreaterThan(
      rates.calm[0] / rates.calm[1],
    );
  });

  it("is the same history every time the town is built", () => {
    const again = build();
    const facts = (people: typeof input.people) =>
      people.flatMap((person) =>
        (person.pastFacts ?? [])
          .filter((fact) => fact.kind === OPENING_FALLING_OUTS.factKind)
          .map((fact) => `${fact.id}@${fact.date}`),
      );
    expect(facts(again.people)).toEqual(facts(input.people));
  });
});
