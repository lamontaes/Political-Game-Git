import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource as source } from "./core-pieces-fixture";
import { coreAPI } from "./state";
import { createRenewalCore } from "./births-setup";
import { birthCircumstances, partnershipStart } from "./births-plan";
import { renewalParameter } from "./births-parameters";
import type { CoreInput } from "./types";

/** A young couple; `wage` is the mother's job pay a day, and `partnerFact` dates their start. */
function couple(wage: number, partnerFact = true): CoreInput {
  const input = piecesInput(),
    person = input.people[0]!;
  const mother = {
    ...person,
    id: "mother",
    birthDate: "1996-01-01",
    looks: { gender: "female" },
    ...(wage ? { jobId: "job" } : {}),
    liquidMinor: 500_000,
    familyIds: ["father"],
    knownIds: [],
    pastFacts: partnerFact
      ? [
          {
            id: "mother:partner",
            date: "2023-07-01",
            kind: "family:partner",
            summary: "partner",
            source,
            facts: { otherPersonId: "father" },
          },
        ]
      : [],
  };
  const father = {
    ...person,
    id: "father",
    birthDate: "1995-01-01",
    looks: { gender: "male" },
    liquidMinor: 500_000,
    familyIds: ["mother"],
    knownIds: [],
  };
  return {
    ...input,
    people: [mother, father],
    households: [
      { ...input.households[0]!, memberIds: [mother.id, father.id] },
    ],
    organizations: [
      {
        id: "employer",
        name: "employer",
        kind: "firm",
        placeId: "place",
        liquidMinor: 0,
        source,
      },
    ],
    jobs: wage
      ? [
          {
            id: "job",
            personId: mother.id,
            organizationId: "employer",
            title: "role",
            wageDailyMinor: wage,
            hoursDaily: 0,
            source,
          },
        ]
      : [],
    familyLinks: [
      { id: "couple", kind: "partner", personIds: [mother.id, father.id] },
    ],
  };
}

const row = (core: ReturnType<typeof createRenewalCore>) => ({
  id: "couple",
  motherId: "mother",
  otherParentId: "father",
  startedAt:
    core.people
      .get("mother")!
      .pastFacts?.find((fact) => fact.kind === "family:partner")?.date ??
    core.startedAt,
  childIds: [],
});

describe("family-planning circumstances (PW-8)", () => {
  it("weighs a household with no pay at a bounded cost, never a cliff", () => {
    const circumstances = [0, 5_000, 30_000, 200_000].map((wage) => {
      const core = createRenewalCore(couple(wage), { scheduledWork: false });
      const api = coreAPI(core);
      return {
        weight: renewalParameter(api, "renewalIncomeWeight"),
        values: birthCircumstances(api, core.people.get("mother")!, row(core)),
      };
    });
    const [none, low, middle, high] = circumstances;
    // No pay costs exactly the income weight; the old log term was -15.9.
    expect(none!.values.income).toBeCloseTo(-none!.weight, 6);
    expect(low!.values.income).toBeGreaterThan(none!.values.income);
    expect(middle!.values.income).toBeGreaterThan(low!.values.income);
    expect(high!.values.income).toBeGreaterThan(middle!.values.income);
    expect(high!.values.income).toBeLessThan(high!.weight);
    // A partner with pay counts as work; nobody employed counts against.
    expect(none!.values.work).toBeLessThan(middle!.values.work);
    for (const { values } of circumstances)
      for (const value of Object.values(values))
        expect(Number.isFinite(value)).toBe(true);
  });

  it("estimates a missing partnership start from the couple's records, not the opening day", () => {
    const core = createRenewalCore(couple(30_000, false), {
      scheduledWork: false,
    });
    const api = coreAPI(core);
    const start = partnershipStart(api, row(core), []);
    expect(start < core.startedAt).toBe(true);
    // The mother reaching the usual age of a first union.
    expect(start.slice(0, 4)).toBe(
      String(1996 + renewalParameter(api, "renewalUnionAgeYears")),
    );
    // A recorded start is kept as recorded.
    const dated = createRenewalCore(couple(30_000), { scheduledWork: false });
    expect(partnershipStart(coreAPI(dated), row(dated), [])).toBe("2023-07-01");
  });
});
