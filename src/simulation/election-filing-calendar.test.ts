import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { nominationPlan } from "./nominations/nomination-rules";
import {
  fieldClosingDate,
  nextFilableStateExecutiveTerm,
} from "./nationwide-world/state-executive-turnover-calendar";

describe("office filing calendars", () => {
  it("gives governor and legislature readers their distinct Massachusetts deadlines", () => {
    const world = createDemoWorld("session13-office-filing-deadlines");
    const electionDay = makeIsoDate("2026-11-03");
    expect(fieldClosingDate(world, "MA", electionDay)).toBe("2026-06-02");
    expect(
      nominationPlan(world, {
        stateUsps: "MA",
        family: "state-legislature",
        year: 2026,
        onDate: world.currentDate,
        generalDay: electionDay,
      }),
    ).toMatchObject({ filingDeadline: "2026-05-26" });
  });

  it("keeps the governor filing deadline open through its date and advances after it", () => {
    const initial = createDemoWorld("session13-governor-filing-boundary");
    const at = (date: string) => {
      const currentDate = makeIsoDate(date);
      return {
        ...initial,
        currentDate,
        currentMoment: simulationMomentOnLocalDate(
          initial.currentMoment,
          currentDate,
        ),
      };
    };
    expect(
      nextFilableStateExecutiveTerm(at("2026-06-12"), "FL")?.electionDay,
    ).toBe("2026-11-03");
    expect(
      nextFilableStateExecutiveTerm(at("2026-06-13"), "FL")?.electionDay,
    ).toBe("2030-11-05");
    expect(
      nextFilableStateExecutiveTerm(at("2026-01-05"), "TX")?.electionDay,
    ).toBe("2030-11-05");
  });
});
