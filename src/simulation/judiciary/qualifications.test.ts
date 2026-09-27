import { describe, expect, it } from "vitest";
import { dateAtAge } from "../dates";
import { createDemoWorld } from "../demo";
import { createStableId } from "../ids";
import { factsForPerson } from "../people";
import { advanceWorld } from "../world";
import {
  assessJudicialProfessionalQualification,
  recordJudicialProfessionalQualification,
} from "./qualifications";

function opening() {
  const world = createDemoWorld("judicial-professional-history", {
    peopleCount: 3,
  });
  const personId = world.personOrder[0];
  const person = world.people[personId]!;
  const fact = {
    id: createStableId("fact", `${personId}:fixture:law-work`),
    stableKey: "fixture:law-work",
    kind: "occupation" as const,
    occurredAt: dateAtAge(person.birthDate, 25),
    jurisdictionId: person.homeJurisdictionId,
    employer: "Fictional Legal Office",
    title: "Attorney",
    endedAt: null,
    status: "ongoing" as const,
    subjectIds: [],
    summary: "A fictional legal career is part of this opening background.",
    provenance: {
      method: "procedural-placeholder" as const,
      sourceEventId: null,
      note: "Judicial qualification test fixture.",
    },
  };
  const withFact = {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        establishedFacts: [...person.establishedFacts, fact],
      },
    },
  };
  return { world: withFact, personId, factId: fact.id };
}

describe("judicial professional qualifications", () => {
  it("records a dated opening career and assesses only the recorded duration", () => {
    const fixture = opening();
    const person = fixture.world.people[fixture.personId]!;
    expect(
      factsForPerson(person).some((fact) => fact.id === fixture.factId),
    ).toBe(true);
    const admittedAt = dateAtAge(person.birthDate, 25);
    const world = recordJudicialProfessionalQualification(fixture.world, {
      personId: fixture.personId,
      jurisdictionId: person.homeJurisdictionId,
      barAdmittedAt: admittedAt,
      legalPracticeSince: admittedAt,
      provenance: {
        kind: "generated-opening-background",
        seedKey: "judicial-professional-history",
        evidenceFactIds: [fixture.factId],
      },
    });
    expect(
      assessJudicialProfessionalQualification(world, {
        personId: fixture.personId,
        jurisdictionId: person.homeJurisdictionId,
        asOf: world.currentDate,
        minimumBarYears: 1,
        minimumPracticeYears: 1,
      }).verdict,
    ).toBe("meets");
    expect(
      assessJudicialProfessionalQualification(world, {
        personId: fixture.personId,
        jurisdictionId: world.jurisdictionOrder[1],
        asOf: world.currentDate,
        minimumBarYears: 0,
        minimumPracticeYears: 0,
      }).verdict,
    ).toBe("unproved");
    expect(() =>
      recordJudicialProfessionalQualification(world, {
        personId: fixture.personId,
        jurisdictionId: person.homeJurisdictionId,
        barAdmittedAt: admittedAt,
        legalPracticeSince: admittedAt,
        provenance: {
          kind: "generated-opening-background",
          seedKey: "judicial-professional-history",
          evidenceFactIds: [fixture.factId],
        },
      }),
    ).toThrow("already recorded");
  });

  it("does not add a generated opening credential after Begin", () => {
    const fixture = opening();
    const later = advanceWorld(fixture.world, 1);
    const person = later.people[fixture.personId]!;
    expect(() =>
      recordJudicialProfessionalQualification(later, {
        personId: fixture.personId,
        jurisdictionId: person.homeJurisdictionId,
        barAdmittedAt: dateAtAge(person.birthDate, 25),
        legalPracticeSince: null,
        provenance: {
          kind: "generated-opening-background",
          seedKey: "judicial-professional-history",
          evidenceFactIds: [fixture.factId],
        },
      }),
    ).toThrow("only at Begin");
  });
});
