import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { buildDeepPast } from "./deep-past";
import { OPENING_FAVORS } from "./opening-favors";
import { OPENING_KIN } from "./opening-kin";
import { buildPopulation } from "./population";

// P15 part 3: dated moves, and favors from people the mover knew at the time.
describe("moves and favors in the shared past", () => {
  const input = buildDeepPast(
    buildPopulation({
      seed: "p15-favors-test",
      startedAt: "2021-01-01",
      minimumPeople: 2000,
    }),
  );
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const facts = (id: string, kind: string) =>
    (byId.get(id)!.pastFacts ?? []).filter((fact) => fact.kind === kind);
  const age = (id: string, date: string) =>
    ageOnDate(makeIsoDate(byId.get(id)!.birthDate), makeIsoDate(date));

  it("dates each move after the person turned 18 and before the opening", () => {
    let moves = 0;
    for (const person of input.people)
      for (const kind of [
        OPENING_KIN.moves.movedInKind,
        OPENING_KIN.moves.movedAwayKind,
      ])
        for (const move of facts(person.id, kind)) {
          expect(age(person.id, move.date)).toBeGreaterThanOrEqual(18);
          expect(move.date <= input.startedAt).toBe(true);
          moves += 1;
        }
    expect(moves).toBeGreaterThan(100);
    // Residents who left where they grew up record a move into the county;
    // relatives who left record a move away.
    expect(
      input.people.some(
        (person) =>
          person.tier !== "husk" &&
          facts(person.id, OPENING_KIN.moves.movedInKind).length,
      ),
    ).toBe(true);
    expect(
      input.people.some(
        (person) =>
          person.tier === "husk" &&
          facts(person.id, OPENING_KIN.moves.movedAwayKind).length,
      ),
    ).toBe(true);
  });

  it("records each favor on both people at the move, from someone known before it", () => {
    let favors = 0;
    for (const person of input.people)
      for (const favor of facts(person.id, OPENING_FAVORS.factKind)) {
        const helper = favor.facts!.helperId!;
        if (helper === person.id) continue;
        const need = person.pastFacts!.find(
          (row) => row.id === favor.facts!.needFactId,
        )!;
        expect(need.date).toBe(favor.date);
        const mirror = facts(helper, OPENING_FAVORS.factKind).find(
          (row) =>
            row.facts!.otherPersonId === person.id && row.date === favor.date,
        );
        expect(mirror).toBeDefined();
        const context = person.pastFacts!.find(
          (row) => row.id === favor.facts!.contextFactId,
        )!;
        expect(context.date < favor.date).toBe(true);
        favors += 1;
      }
    expect(favors).toBeGreaterThan(50);
  });

  it("helps about the calibrated share of moves, from people close at the time", () => {
    let moves = 0,
      helped = 0;
    for (const person of input.people) {
      if (person.tier === "husk") continue;
      for (const need of facts(person.id, OPENING_KIN.moves.movedInKind)) {
        moves += 1;
        if (
          facts(person.id, OPENING_FAVORS.factKind).some(
            (row) =>
              row.facts!.needFactId === need.id &&
              row.facts!.helperId !== person.id,
          )
        )
          helped += 1;
      }
    }
    expect(Math.abs(helped / moves - 0.39)).toBeLessThan(0.1);
    const closeness = input.people.flatMap((person) =>
      facts(person.id, OPENING_FAVORS.factKind)
        .filter((row) => row.facts!.helperId !== person.id)
        .map((row) => Number(row.facts!.closeness)),
    );
    // Favors come from people who were close at the time, not at random.
    const mean =
      closeness.reduce((sum, value) => sum + value, 0) / closeness.length;
    expect(mean).toBeGreaterThan(0.2);
  });
});
