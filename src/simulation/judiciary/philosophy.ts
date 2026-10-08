import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { recordById, recordsByStringField } from "../history-index";
import { factsForPerson } from "../people";
import type {
  DecisionConsideration,
  EntityId,
  IsoDate,
  MindSourceReference,
  PrincipleRecord,
  World,
} from "../types";
import { loadedTraitRegistry } from "../trait-registry";
import { traitReadingOfRecord } from "../trait-readings";
import { traitDefinitionFromPack } from "../trait-packs";
import { assertWorldIntegrity } from "../world";
import { DECISION_IMPORTANCE_ORDER } from "../decisions";
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
  /** The seating record authorizes an empty, explicitly unknown baseline. */
  readonly seatingTenureId?: string;
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
    case "political-principle": {
      const principle = recordById(history.principles, evidence.id);
      return principle?.personId === personId ? principle.formedAt : null;
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

function latestPrincipleRecord(
  world: World,
  personId: EntityId,
  stableKey: string,
  through: IsoDate,
): PrincipleRecord | undefined {
  const definitions = world.policyCatalog.principles;
  return recordsByStringField(world.history.principles, "personId", personId)
    .filter((record) => {
      const definition = definitions[record.principleId];
      return (
        record.personId === personId &&
        record.formedAt <= through &&
        (definition?.stableKey === stableKey ||
          definition?.stableKey.endsWith(`:${stableKey}`))
      );
    })
    .sort(
      (a, b) => a.formedAt.localeCompare(b.formedAt) || a.sequence - b.sequence,
    )
    .at(-1);
}

function principleFormation(
  world: World,
  personId: EntityId,
  key: string,
  through: IsoDate,
  reason: string,
  reverse = false,
): JudicialPhilosophyFormation | undefined {
  const record = latestPrincipleRecord(world, personId, key, through);
  if (!record || record.stance === "conflicted") return undefined;
  const magnitude = Math.max(0, Math.min(2, Math.round(record.strength * 2)));
  return {
    strength: ((record.stance === "endorses" ? magnitude : -magnitude) *
      (reverse ? -1 : 1)) as JudicialPhilosophyStrength,
    evidence: [{ kind: "political-principle", id: record.id }],
    reason,
  };
}

/** Record only the judicial outlook supported by the seated person's own records. */
export function recordJudicialPhilosophyAtSeating(
  world: World,
  personId: EntityId,
  tenureId: string,
  formedAt: IsoDate,
): World {
  return writeJudicialPhilosophy(
    world,
    judicialPhilosophyInputAtSeating(world, personId, tenureId, formedAt),
    true,
  );
}

export function recordJudicialPhilosophiesAtSeating(
  world: World,
  tenures: readonly {
    readonly tenureId: string;
    readonly personId: EntityId;
    readonly startedAt: IsoDate;
  }[],
): World {
  let next = world;
  for (const tenure of tenures)
    next = writeJudicialPhilosophy(
      next,
      judicialPhilosophyInputAtSeating(
        next,
        tenure.personId,
        tenure.tenureId,
        tenure.startedAt,
      ),
      false,
    );
  assertWorldIntegrity(next);
  return next;
}

function judicialPhilosophyInputAtSeating(
  world: World,
  personId: EntityId,
  tenureId: string,
  formedAt: IsoDate,
): JudicialPhilosophyInput {
  const dimensions: Partial<
    Record<JudicialPhilosophyAxis, JudicialPhilosophyFormation>
  > = {};
  const rights = principleFormation(
    world,
    personId,
    "personal-liberty",
    formedAt,
    "judicial.outlook.rights.civil-liberties",
  );
  const federalism = principleFormation(
    world,
    personId,
    "local-control",
    formedAt,
    "judicial.outlook.federalism.state-local",
  );
  const deference = principleFormation(
    world,
    personId,
    "trust-in-government",
    formedAt,
    "judicial.outlook.deference.government-trust",
    true,
  );
  const tradition = principleFormation(
    world,
    personId,
    "tradition",
    formedAt,
    "judicial.outlook.precedent.tradition",
    true,
  );
  if (rights) dimensions.rights = rights;
  if (federalism) dimensions.federalism = federalism;
  if (deference) dimensions.deference = deference;
  if (tradition) dimensions.precedent = tradition;

  const conscientiousness = [...loadedTraitRegistry().traits.values()].find(
    (trait) => trait.key === "conscientiousness",
  );
  const tendency = conscientiousness
    ? recordsByStringField(
        world.history.personalityTendencies,
        "personId",
        personId,
      )
        .filter(
          (record) =>
            record.personId === personId &&
            record.tendencyId ===
              traitDefinitionFromPack(conscientiousness).id &&
            record.recordedAt <= formedAt,
        )
        .sort(
          (a, b) =>
            a.recordedAt.localeCompare(b.recordedAt) || a.sequence - b.sequence,
        )
        .at(-1)
    : undefined;
  if (tendency && conscientiousness) {
    const reading = traitReadingOfRecord(conscientiousness, tendency);
    if (reading.state === "recorded") {
      const scaleTop = Math.max(
        ...conscientiousness.scale.steps.map((step) => step.magnitude),
      );
      const strength = (-Math.sign(reading.value) *
        Math.round(Math.min(2, (Math.abs(reading.value) / scaleTop) * 2)) ||
        0) as JudicialPhilosophyStrength;
      const prior = dimensions.precedent;
      const evidence = [
        ...(prior?.evidence ?? []),
        { kind: "personality-tendency" as const, id: tendency.id },
      ];
      const combined = prior
        ? Math.round((prior.strength + strength) / 2)
        : strength;
      dimensions.precedent = {
        strength: combined as JudicialPhilosophyStrength,
        evidence,
        reason: "judicial.outlook.precedent.tradition-conscientiousness",
      };
    }
  }

  return {
    stableKey: `seating:${tenureId}`,
    personId,
    formedAt,
    dimensions,
    reason: "judicial.outlook.recorded-at-seating",
    seatingTenureId: tenureId,
  };
}

/** Read the latest recorded axis as a reason in an existing court decision. */
export function judicialOutlookConsideration(
  world: World,
  personId: EntityId,
  axis: JudicialPhilosophyAxis,
  positiveOption: string,
  negativeOption: string,
  stableKey: string,
  rightsSubject?: JudicialRightsSubject,
): DecisionConsideration | null {
  const record = [...(world.judiciary?.philosophies ?? [])]
    .reverse()
    .find(
      (item) =>
        item.personId === personId && item.formedAt <= world.currentDate,
    );
  const subjectOutlook =
    axis === "rights" && rightsSubject
      ? record?.rightsBySubject?.[rightsSubject]
      : undefined;
  const selectedAxis = subjectOutlook ? undefined : axis;
  const strength = subjectOutlook?.strength ?? record?.dimensions[axis];
  if (strength === undefined || strength === null || strength === 0)
    return null;
  const evidence =
    subjectOutlook?.evidence ??
    (selectedAxis ? record.dimensionEvidence?.[axis] : undefined) ??
    [];
  const reason =
    subjectOutlook?.reason ??
    (selectedAxis ? record.dimensionReasons?.[axis] : undefined);
  const sourceRefs = evidence
    .map((evidence): MindSourceReference | null => {
      switch (evidence.kind) {
        case "person-fact":
          return { kind: "person-fact", factId: evidence.id };
        case "personality-tendency":
          return {
            kind: "personality-tendency",
            tendencyRecordId: evidence.id,
          };
        case "personal-value":
          return { kind: "personal-value", valueRecordId: evidence.id };
        case "private-belief":
          return { kind: "private-belief", beliefId: evidence.id };
        case "political-principle":
          return {
            kind: "political-principle",
            principleRecordId: evidence.id,
          };
        case "historical-event":
          return { kind: "historical-event", eventId: evidence.id };
        case "mentorship":
          return {
            kind: "relationship-interaction",
            interactionId: evidence.id,
          };
        case "decision-trace":
          return {
            kind: "decision-trace",
            decisionTraceId: evidence.id,
          };
      }
    })
    .filter(
      (reference): reference is MindSourceReference => reference !== null,
    );
  if (sourceRefs.length === 0) return null;
  return {
    stableKey,
    optionKey: strength > 0 ? positiveOption : negativeOption,
    sourceType: "belief:judicial-philosophy",
    direction: "supports",
    importance:
      DECISION_IMPORTANCE_ORDER[
        Math.min(DECISION_IMPORTANCE_ORDER.length - 1, Math.abs(strength))
      ]!,
    confidence: "high",
    explanation:
      reason ?? record.dimensionReasons?.[axis] ?? `judicial.outlook.${axis}`,
    sourceRefs,
  };
}

/** Apply a judge's recorded respect for precedent to its existing row weights. */
export function judicialPrecedentImportance(
  world: World,
  personId: EntityId,
  importance: DecisionConsideration["importance"],
): DecisionConsideration["importance"] {
  const record = [...(world.judiciary?.philosophies ?? [])]
    .reverse()
    .find(
      (item) =>
        item.personId === personId && item.formedAt <= world.currentDate,
    );
  const strength = record?.dimensions.precedent;
  if (strength === undefined || strength === null || strength === 0)
    return importance;
  const index = DECISION_IMPORTANCE_ORDER.indexOf(importance);
  return DECISION_IMPORTANCE_ORDER[
    Math.max(
      0,
      Math.min(
        DECISION_IMPORTANCE_ORDER.length - 1,
        index - Math.sign(strength),
      ),
    )
  ]!;
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
  return writeJudicialPhilosophy(world, input, true);
}

function writeJudicialPhilosophy(
  world: World,
  input: JudicialPhilosophyInput,
  validateIntegrity: boolean,
): World {
  if (!world.judiciary) throw new Error("Judicial courts have not opened.");
  const person = world.people[input.personId];
  if (!person) throw new Error("Judicial philosophy person is missing.");
  if (!input.stableKey.trim() || !input.reason.trim())
    throw new Error("Judicial philosophy needs a key and reason.");
  const formedAt = makeIsoDate(input.formedAt);
  if (input.seatingTenureId) {
    const tenure = world.judiciary.seatTenures.find(
      (item) => item.tenureId === input.seatingTenureId,
    );
    if (
      !tenure ||
      tenure.personId !== input.personId ||
      tenure.startedAt !== formedAt
    )
      throw new Error(
        "Judicial philosophy seating record is missing or unrelated.",
      );
  }
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
  if (changes === 0 && !input.seatingTenureId)
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
  if (validateIntegrity) assertWorldIntegrity(next);
  return next;
}
