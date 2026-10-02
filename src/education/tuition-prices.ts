import { recordWorldEvent } from "../simulation/world";
import { recordEvidenceArtifact } from "../simulation/evidence";
import { recordsByStringField } from "../simulation/history-index";
import type { EntityId, IsoDate, World } from "../simulation/types";

export interface SchoolTuitionSourceRef {
  readonly artifactId: string;
  readonly sha256: string;
  readonly member: string;
  readonly row: number;
  readonly field: string;
  readonly sheet?: string;
}

/** Source units are retained; an academic-year price is never a period price. */
export interface SchoolTuitionInput {
  readonly artifacts: Readonly<Record<string, { readonly sha256: string }>>;
  readonly definitions: Readonly<
    Record<
      string,
      {
        readonly label: string;
        readonly description: string;
        readonly chargeUnit: "academic-year" | "credit-hour" | "program" | null;
        readonly academicYear: string | null;
        readonly imputationField: string;
        readonly dictionaryEvidence: SchoolTuitionSourceRef;
      }
    >
  >;
  readonly components: Readonly<
    Record<
      string,
      {
        readonly member: string;
        readonly columns: readonly string[];
        readonly rows: readonly (readonly [
          string,
          number,
          readonly string[],
        ])[];
      }
    >
  >;
}

export interface SchoolTuitionSelector {
  readonly institutionId: string;
  readonly artifactId: string;
  /** Exact dictionary field: residency, level and tuition/fees are not guessed. */
  readonly field: string;
}

export interface SourcedSchoolTuitionQuote {
  readonly status: "sourced";
  readonly institutionId: string;
  readonly amountMinor: number;
  readonly currency: "USD";
  readonly chargeUnit: "academic-year" | "credit-hour" | "program";
  readonly academicYear: string | null;
  readonly label: string;
  readonly description: string;
  readonly imputationFlag: string;
  readonly sourceRefs: readonly SchoolTuitionSourceRef[];
}

/** Pure source quote; no enrollment, ownership, calendar or residency inference. */
export function schoolTuitionQuote(
  input: SchoolTuitionInput,
  selector: SchoolTuitionSelector,
): SourcedSchoolTuitionQuote | { readonly status: "missing-source" } {
  const component = input.components[selector.artifactId];
  const definition =
    input.definitions[`${selector.artifactId}:${selector.field}`];
  const artifact = input.artifacts[selector.artifactId];
  const row = component?.rows.find(([id]) => id === selector.institutionId);
  const column = component?.columns.indexOf(selector.field) ?? -1;
  if (!component || !definition?.chargeUnit || !artifact || !row || column < 0)
    return { status: "missing-source" };
  const raw = row[2][column];
  // Blank and negative source sentinels are not zero tuition.
  if (!raw || !/^\d+$/.test(raw)) return { status: "missing-source" };
  const amountMinor = Number(raw) * 100;
  if (!Number.isSafeInteger(amountMinor)) return { status: "missing-source" };
  const imputationColumn = component.columns.indexOf(
    definition.imputationField,
  );
  return {
    status: "sourced",
    institutionId: selector.institutionId,
    amountMinor,
    currency: "USD",
    chargeUnit: definition.chargeUnit,
    academicYear: definition.academicYear,
    label: definition.label,
    description: definition.description,
    imputationFlag:
      imputationColumn < 0 ? "" : (row[2][imputationColumn] ?? ""),
    sourceRefs: [
      {
        artifactId: selector.artifactId,
        sha256: artifact.sha256,
        member: component.member,
        row: row[1],
        field: selector.field,
      },
      definition.dictionaryEvidence,
    ],
  };
}

const PRICE_KIND = "education:school-tuition-price";

/** Save the observed price on today's game date; its survey vintage stays separate. */
export function recordSchoolTuitionPriceRevision(
  world: World,
  input: {
    readonly stableKey: string;
    readonly organizationId: EntityId;
    readonly source: SchoolTuitionInput;
    readonly selector: SchoolTuitionSelector;
  },
): World {
  const quote = schoolTuitionQuote(input.source, input.selector);
  if (quote.status !== "sourced") throw new Error("No sourced school price.");
  if (
    !world.history.organizations.some((row) => row.id === input.organizationId)
  )
    throw new Error("The school must be a saved organization.");
  const eventKey = `${input.stableKey}:observation`;
  const observed = recordWorldEvent(world, {
    stableKey: eventKey,
    type: "education.school-tuition-observed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["education"],
    summary: `Recorded sourced school tuition: ${quote.amountMinor} USD minor units per ${quote.chargeUnit}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = observed.history.events.find(
    (row) => row.stableKey === eventKey,
  );
  if (!event) throw new Error("The price observation must be saved.");
  return recordEvidenceArtifact(observed, {
    stableKey: input.stableKey,
    evidenceKind: PRICE_KIND,
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    relatedEntityIds: [event.id],
    access: "public",
    description: JSON.stringify({
      organizationId: input.organizationId,
      quote,
    }),
    provenance: {
      kind: "authored",
      note: "Observed game-date school price from the retained source rows; survey vintage is not an operative day.",
    },
  });
}

/** Only the requested unit/category is read; older dated evidence remains immutable. */
export function readSchoolTuitionPriceAt(
  world: World,
  organizationId: EntityId,
  selector: SchoolTuitionSelector,
  asOf: IsoDate = world.currentDate,
): {
  readonly recordId: EntityId;
  readonly quote: SourcedSchoolTuitionQuote;
} | null {
  const records = recordsByStringField(
    world.history.evidenceArtifacts,
    "evidenceKind",
    PRICE_KIND,
  )
    .filter((row) => row.createdAt <= asOf && row.recordedAt <= asOf)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.sequence - a.sequence,
    );
  for (const record of records) {
    if (!record.description) continue;
    const payload = JSON.parse(record.description) as {
      organizationId: EntityId;
      quote: SourcedSchoolTuitionQuote;
    };
    if (payload.organizationId !== organizationId) continue;
    const quote = payload.quote;
    if (
      quote.status === "sourced" &&
      quote.institutionId === selector.institutionId &&
      quote.sourceRefs[0]?.artifactId === selector.artifactId &&
      quote.sourceRefs[0]?.field === selector.field
    )
      return { recordId: record.id, quote };
  }
  return null;
}
