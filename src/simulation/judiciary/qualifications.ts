/** Dated fictional professional qualifications for judicial eligibility. */

import { ageOnDate, completedMonthsBetween } from "../dates";
import { createStableId } from "../ids";
import { factsForPerson } from "../people";
import type { EntityId, IsoDate, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { EMPTY_JUDICIARY } from "./courts";
import type { JudicialProfessionalQualificationRecord } from "./types";

/** An authored background fact is saved at Begin, never invented at filing. */
export function recordJudicialProfessionalQualification(
  world: World,
  input: Omit<
    JudicialProfessionalQualificationRecord,
    "recordId" | "recordedAt"
  >,
): World {
  const person = world.people[input.personId];
  if (!person) throw new Error("Professional qualification person is missing.");
  if (!world.jurisdictions[input.jurisdictionId])
    throw new Error("Professional qualification jurisdiction is missing.");
  if (input.barAdmittedAt > world.currentDate)
    throw new Error("Bar admission cannot be recorded before it occurs.");
  if (ageOnDate(person.birthDate, input.barAdmittedAt) < 18)
    throw new Error("Opening professional admission needs an adult history.");
  if (
    input.legalPracticeSince &&
    (input.legalPracticeSince < input.barAdmittedAt ||
      input.legalPracticeSince > world.currentDate)
  )
    throw new Error("Legal practice cannot precede recorded bar admission.");
  if (
    input.qualifiedElectorSince &&
    (input.qualifiedElectorSince > world.currentDate ||
      ageOnDate(person.birthDate, input.qualifiedElectorSince) < 18)
  )
    throw new Error("Elector qualification needs a dated adult history.");
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === input.personId && death.diedAt <= world.currentDate,
    )
  )
    throw new Error("A deceased person cannot gain a new professional record.");
  if (input.provenance.kind === "generated-opening-background") {
    if (world.currentDate !== world.startedAt || !input.provenance.seedKey)
      throw new Error(
        "Generated judicial background may be authored only at Begin.",
      );
  } else if (input.provenance.seedKey !== null) {
    throw new Error(
      "A life-earned qualification cannot claim an opening seed.",
    );
  }
  const facts = new Set(factsForPerson(person).map((fact) => fact.id));
  const professionalFacts = factsForPerson(person).filter(
    (fact) =>
      input.provenance.evidenceFactIds.includes(fact.id) &&
      (fact.kind === "education" || fact.kind === "occupation"),
  );
  if (
    input.provenance.evidenceFactIds.length === 0 ||
    input.provenance.evidenceFactIds.some((id) => !facts.has(id)) ||
    professionalFacts.length === 0
  )
    throw new Error(
      "Professional qualification needs this person's saved education or work facts.",
    );
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  if (
    previous.professionalQualifications.some(
      (row) =>
        row.personId === input.personId &&
        row.jurisdictionId === input.jurisdictionId,
    )
  )
    throw new Error(
      "This person's jurisdictional bar admission is already recorded.",
    );
  const record: JudicialProfessionalQualificationRecord = {
    ...input,
    recordId: createStableId(
      "judicial-professional-qualification",
      `${world.id}:${input.personId}:${input.jurisdictionId}:${input.barAdmittedAt}`,
    ),
    recordedAt: world.currentDate,
  };
  const next = {
    ...world,
    judiciary: {
      ...previous,
      professionalQualifications: [
        ...previous.professionalQualifications,
        record,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export type JudicialProfessionalAssessment =
  | { readonly verdict: "meets"; readonly recordId: EntityId }
  | { readonly verdict: "unproved"; readonly reason: string }
  | {
      readonly verdict: "fails";
      readonly reason: string;
      readonly recordId: EntityId;
    };

export function assessJudicialProfessionalQualification(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly asOf: IsoDate;
    readonly minimumBarYears: number;
    readonly minimumPracticeYears: number;
  },
): JudicialProfessionalAssessment {
  if (
    !Number.isSafeInteger(input.minimumBarYears) ||
    !Number.isSafeInteger(input.minimumPracticeYears) ||
    input.minimumBarYears < 0 ||
    input.minimumPracticeYears < 0
  )
    throw new Error(
      "Judicial qualification durations must be nonnegative years.",
    );
  const record = world.judiciary?.professionalQualifications.find(
    (row) =>
      row.personId === input.personId &&
      row.jurisdictionId === input.jurisdictionId &&
      row.barAdmittedAt <= input.asOf &&
      row.recordedAt <= input.asOf,
  );
  if (!record)
    return {
      verdict: "unproved",
      reason:
        "This World has no dated bar admission for this person in this jurisdiction.",
    };
  if (
    completedMonthsBetween(record.barAdmittedAt, input.asOf) <
    input.minimumBarYears * 12
  )
    return {
      verdict: "fails",
      reason: "Recorded bar admission is too recent for this office.",
      recordId: record.recordId,
    };
  if (
    input.minimumPracticeYears > 0 &&
    (!record.legalPracticeSince ||
      completedMonthsBetween(record.legalPracticeSince, input.asOf) <
        input.minimumPracticeYears * 12)
  )
    return {
      verdict: "fails",
      reason: "Recorded legal practice is too short for this office.",
      recordId: record.recordId,
    };
  return { verdict: "meets", recordId: record.recordId };
}

/** Elector status is explicit; residence and bar membership cannot imply it. */
export function assessJudicialQualifiedElector(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly asOf: IsoDate;
  },
): JudicialProfessionalAssessment {
  const record = world.judiciary?.professionalQualifications.find(
    (row) =>
      row.personId === input.personId &&
      row.jurisdictionId === input.jurisdictionId &&
      row.recordedAt <= input.asOf,
  );
  if (!record || !record.qualifiedElectorSince)
    return {
      verdict: "unproved",
      reason:
        "This World has no dated elector qualification for this person in this jurisdiction.",
    };
  if (record.qualifiedElectorSince > input.asOf)
    return {
      verdict: "fails",
      reason: "Elector qualification begins after the requested election date.",
      recordId: record.recordId,
    };
  return { verdict: "meets", recordId: record.recordId };
}
