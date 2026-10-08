import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { factsForPerson } from "../people";
import type { EntityId, IsoDate, World } from "../types";
import { assertWorldIntegrity } from "../world";
import type {
  JudicialPhilosophyAxis,
  JudicialPhilosophyEvidence,
  JudicialPhilosophyRecord,
  JudicialPhilosophyStrength,
  JudicialRightsSubject,
} from "./types";

const AXES: readonly JudicialPhilosophyAxis[] = [
  "reading",
  "deference",
  "federalism",
  "rights",
  "precedent",
];
const RIGHTS: readonly JudicialRightsSubject[] = [
  "speech",
  "religion",
  "guns",
  "criminal-procedure",
  "property",
  "economic-regulation",
  "equal-treatment",
];

export interface JudicialPhilosophyFormation {
  readonly strength: JudicialPhilosophyStrength;
  readonly evidence: readonly JudicialPhilosophyEvidence[];
  /** The authored interpretation of these specific records for this axis. */
  readonly reason: string;
}

export interface JudicialPhilosophyInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly formedAt: IsoDate;
  readonly dimensions?: Readonly<
    Partial<Record<JudicialPhilosophyAxis, JudicialPhilosophyFormation>>
  >;
  readonly rightsBySubject?: Readonly<
    Partial<Record<JudicialRightsSubject, JudicialPhilosophyFormation>>
  >;
  readonly reason: string;
}

function sourceDate(
  world: World,
  personId: EntityId,
  evidence: JudicialPhilosophyEvidence,
): IsoDate | null {
  const history = world.history;
  switch (evidence.kind) {
    case "person-fact": {
      const person = world.people[personId];
      const fact =
        person &&
        factsForPerson(person).find((item) => item.id === evidence.id);
      return fact && (fact.kind === "education" || fact.kind === "occupation")
        ? fact.occurredAt
        : null;
    }
    case "personal-value": {
      const value = history.personalValues.find(
        (item) => item.id === evidence.id,
      );
      return value?.personId === personId ? value.recordedAt : null;
    }
    case "personality-tendency": {
      const tendency = history.personalityTendencies.find(
        (item) => item.id === evidence.id,
      );
      return tendency?.personId === personId ? tendency.recordedAt : null;
    }
    case "private-belief": {
      const belief = history.privateBeliefs.find(
        (item) => item.id === evidence.id,
      );
      return belief?.personId === personId ? belief.formedAt : null;
    }
    case "mentorship": {
      const interaction = history.relationshipInteractions.find(
        (item) => item.id === evidence.id,
      );
      return interaction?.personIds.includes(personId) &&
        interaction.kind.startsWith("mentorship:")
        ? interaction.occurredAt
        : null;
    }
    case "historical-event": {
      const event = history.events.find((item) => item.id === evidence.id);
      if (!event) return null;
      return event.involvedEntityIds.includes(personId) ||
        event.participants.some((item) => item.personId === personId)
        ? event.occurredAt
        : null;
    }
    case "decision-trace": {
      const trace = history.decisionTraces.find(
        (item) => item.id === evidence.id,
      );
      return trace?.context.actorPersonId === personId
        ? trace.recordedAt
        : null;
    }
  }
}

function assertFormation(
  world: World,
  personId: EntityId,
  formedAt: IsoDate,
  formation: JudicialPhilosophyFormation,
): void {
  if (!Number.isInteger(formation.strength) || Math.abs(formation.strength) > 2)
    throw new Error("Judicial philosophy strength must be between -2 and 2.");
  if (!formation.reason.trim())
    throw new Error(
      "Judicial philosophy needs an interpretation of its evidence.",
    );
  if (formation.evidence.length === 0)
    throw new Error("Judicial philosophy cannot form without life evidence.");
  const used = new Set<EntityId>();
  for (const evidence of formation.evidence) {
    if (used.has(evidence.id))
      throw new Error(
        "Judicial philosophy repeats the same evidence for one axis.",
      );
    used.add(evidence.id);
    const date = sourceDate(world, personId, evidence);
    if (!date || date > formedAt)
      throw new Error(
        "Judicial philosophy evidence is missing, unrelated or later than formation.",
      );
  }
}

/** Append a reasoned view from this person's dated life records. Never infer from party. */
export function recordJudicialPhilosophy(
  world: World,
  input: JudicialPhilosophyInput,
): World {
  if (!world.judiciary) throw new Error("Judicial courts have not opened.");
  const person = world.people[input.personId];
  if (!person) throw new Error("Judicial philosophy person is missing.");
  if (!input.stableKey.trim() || !input.reason.trim())
    throw new Error("Judicial philosophy needs a key and reason.");
  const formedAt = makeIsoDate(input.formedAt);
  if (formedAt < person.birthDate || formedAt > world.currentDate)
    throw new Error(
      "Judicial philosophy formation is outside this person's lived dates.",
    );
  const recordId = createStableId(
    "judicial-philosophy",
    `${input.personId}:${input.stableKey}`,
  );
  const recorded = world.judiciary.philosophies;
  const existingIndex = recorded.findIndex(
    (item) => item.recordId === recordId,
  );
  const existing = existingIndex >= 0 ? recorded[existingIndex] : null;
  const previous = (
    existingIndex >= 0 ? recorded.slice(0, existingIndex) : recorded
  )
    .filter((item) => item.personId === input.personId)
    .at(-1);
  const dimensions: Record<
    JudicialPhilosophyAxis,
    JudicialPhilosophyStrength | null
  > = {
    reading: previous?.dimensions.reading ?? null,
    deference: previous?.dimensions.deference ?? null,
    federalism: previous?.dimensions.federalism ?? null,
    rights: previous?.dimensions.rights ?? null,
    precedent: previous?.dimensions.precedent ?? null,
  };
  const rightsBySubject: Record<
    JudicialRightsSubject,
    JudicialPhilosophyStrength | null
  > = {
    speech: previous?.rightsBySubject.speech ?? null,
    religion: previous?.rightsBySubject.religion ?? null,
    guns: previous?.rightsBySubject.guns ?? null,
    "criminal-procedure":
      previous?.rightsBySubject["criminal-procedure"] ?? null,
    property: previous?.rightsBySubject.property ?? null,
    "economic-regulation":
      previous?.rightsBySubject["economic-regulation"] ?? null,
    "equal-treatment": previous?.rightsBySubject["equal-treatment"] ?? null,
  };
  const dimensionEvidence = { ...previous?.dimensionEvidence };
  const dimensionReasons = { ...previous?.dimensionReasons };
  const rightsEvidence = { ...previous?.rightsEvidence };
  const rightsReasons = { ...previous?.rightsReasons };
  let changes = 0;
  if (
    Object.keys(input.dimensions ?? {}).some(
      (key) => !AXES.includes(key as JudicialPhilosophyAxis),
    )
  )
    throw new Error("Judicial philosophy contains an unsupported dimension.");
  if (
    Object.keys(input.rightsBySubject ?? {}).some(
      (key) => !RIGHTS.includes(key as JudicialRightsSubject),
    )
  )
    throw new Error(
      "Judicial philosophy contains an unsupported rights subject.",
    );
  for (const axis of AXES) {
    const formation = input.dimensions?.[axis];
    if (!formation) continue;
    assertFormation(world, input.personId, formedAt, formation);
    dimensions[axis] = formation.strength;
    dimensionEvidence[axis] = [...formation.evidence];
    dimensionReasons[axis] = formation.reason.trim();
    changes += 1;
  }
  for (const subject of RIGHTS) {
    const formation = input.rightsBySubject?.[subject];
    if (!formation) continue;
    assertFormation(world, input.personId, formedAt, formation);
    rightsBySubject[subject] = formation.strength;
    rightsEvidence[subject] = [...formation.evidence];
    rightsReasons[subject] = formation.reason.trim();
    changes += 1;
  }
  if (changes === 0)
    throw new Error(
      "Judicial philosophy has no evidenced axis or rights subject.",
    );
  if (
    Object.values(rightsBySubject).some((strength) => strength !== null) &&
    dimensions.rights === null
  )
    throw new Error("A rights subject requires a recorded rights dimension.");
  const lifeEvidenceIds = [
    ...new Set<EntityId>([
      ...(previous?.lifeEvidenceIds ?? []),
      ...Object.values(dimensionEvidence).flatMap(
        (items) => items?.map((item) => item.id) ?? [],
      ),
      ...Object.values(rightsEvidence).flatMap(
        (items) => items?.map((item) => item.id) ?? [],
      ),
    ]),
  ];
  const record: JudicialPhilosophyRecord = {
    recordId,
    personId: input.personId,
    formedAt,
    dimensions,
    rightsBySubject,
    lifeEvidenceIds,
    dimensionEvidence,
    dimensionReasons,
    rightsEvidence,
    rightsReasons,
    reason: input.reason.trim(),
  };
  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(record)) return world;
    throw new Error(
      "Judicial philosophy key already records different evidence.",
    );
  }
  const next: World = {
    ...world,
    judiciary: {
      ...world.judiciary,
      philosophies: [...world.judiciary.philosophies, record],
    },
  };
  assertWorldIntegrity(next);
  return next;
}
