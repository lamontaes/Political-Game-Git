import { describe, expect, it } from "vitest";

import { senateVacancyLaw, senateVacancyLawRows } from "./senate-vacancy-law";

describe("Build 27 step 3: each state's Senate vacancy law", () => {
  it("records exactly one row for each of the 50 states", () => {
    const states = senateVacancyLawRows().map((row) => row.stateUsps);
    expect(new Set(states).size).toBe(50);
    expect(states).toHaveLength(50);
  });

  it("reads the rows the statutes set", () => {
    expect(senateVacancyLaw("OR")).toMatchObject({
      appointment: "governor-same-party",
      appointmentDeadlineDays: 30,
      specialElection: { kind: "prompt", promptDays: 80 },
    });
    expect(senateVacancyLaw("WI")!.appointment).toBe("none");
    expect(senateVacancyLaw("KY")!.appointment).toBe("none");
    expect(senateVacancyLaw("TX")!.specialElection).toEqual({
      kind: "prompt",
      promptDays: 36,
    });
    expect(senateVacancyLaw("NY")).toMatchObject({
      appointment: "governor",
      specialElection: { kind: "next-general" },
    });
    // D.C. and the territories elect no senators.
    expect(senateVacancyLaw("DC")).toBeNull();
  });
});
