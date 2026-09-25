import {
  organizationProfileAt,
  workRoleAt,
  type EntityId,
  type World,
} from "../simulation";
import type {
  AuthoredEnglishBank,
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

/** Reviewed lines only. The caller decides whether this start merits a chapter. */
export const WORK_START_JOURNAL_BANK: AuthoredEnglishBank = {
  key: "saved-work-start-journal",
  version: "1",
  surface: "journal",
  variants: [
    {
      key: "plain",
      kind: "template",
      stages: ["active", "active-year-established"],
      text: "I started work at {{employer}} as {{role-phrase}}.",
    },
    {
      key: "that-month",
      kind: "template",
      stages: ["active-year-established"],
      text: "That {{month}}, I started work at {{employer}} as {{role-phrase}}.",
    },
    {
      key: "staff-plain",
      kind: "template",
      stages: ["active-staff", "active-staff-year-established"],
      text: "I started working in {{employer}}.",
    },
    {
      key: "staff-that-month",
      kind: "template",
      stages: ["active-staff-year-established"],
      text: "That {{month}}, I started working in {{employer}}.",
    },
  ],
};

export interface WorkStartJournalDiscourse {
  /** Supply only when the surrounding rendered Journal has stated this year. */
  readonly establishedYear: string | null;
}

export type WorkStartJournalPacketResult =
  | { readonly kind: "packet"; readonly packet: GroundedEnglishPacket }
  | { readonly kind: "missing-context"; readonly reasons: readonly string[] };

/**
 * Bind one already-recorded work start without changing the World. A missing
 * organization, title, or safe English noun phrase refuses the render. It does
 * not turn every routine start into a Journal entry; selection stays upstream.
 */
export function buildSavedWorkStartJournalPacket(
  world: World,
  personId: EntityId,
  workStatusId: EntityId,
  discourse: WorkStartJournalDiscourse,
): WorkStartJournalPacketResult {
  const status = world.history.workStatuses.find(
    (row) => row.id === workStatusId,
  );
  if (
    !status ||
    status.status !== "active" ||
    status.effectiveAt > world.currentDate
  )
    return refusal("No completed work start is available at this date.");

  const relationship = world.history.workRelationships.find(
    (row) => row.id === status.workRelationshipId,
  );
  if (
    !relationship ||
    relationship.personId !== personId ||
    relationship.recordedAt > world.currentDate ||
    !relationship.organizationId
  )
    return refusal("The work start has no matching person's saved employer.");

  const cutoff = {
    asOfDate: status.effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const employer = organizationProfileAt(
    world,
    relationship.organizationId,
    cutoff,
  );
  const role = workRoleAt(world, relationship.id, cutoff);
  const isLegislativeStaff = role?.title.trim() === "Legislative staff";
  const rolePhrase = role ? grammaticalWorkRolePhrase(role.title) : null;
  if (!employer?.name.trim() || !role || (!rolePhrase && !isLegislativeStaff))
    return refusal("The saved employer or grammatical role is unavailable.");

  const month = MONTH.format(new Date(`${status.effectiveAt}T00:00:00.000Z`));
  const yearEstablished =
    discourse.establishedYear === status.effectiveAt.slice(0, 4);
  const facts: Record<string, GroundedEnglishFact> = {
    employer: {
      text: grammaticalEmployerPhrase(employer.name),
      sourceRecordIds: [employer.id],
    },
    month: { text: month, sourceRecordIds: [status.id] },
  };
  if (rolePhrase)
    facts["role-phrase"] = {
      text: rolePhrase,
      sourceRecordIds: [role.id],
    };

  // Traits are saved cues available for later reviewed variants. Neither line
  // above uses them to infer a feeling, motive, or outcome.
  const traits: Record<string, GroundedEnglishFact> = {};
  for (const tendency of world.history.personalityTendencies)
    if (
      tendency.personId === personId &&
      tendency.recordedAt <= status.effectiveAt
    )
      traits[`expression:${tendency.expressionKey}`] = {
        text: tendency.strength,
        sourceRecordIds: [tendency.id],
      };

  return {
    kind: "packet",
    packet: {
      surface: "journal",
      momentKey: status.id,
      worldSeed: world.seed,
      bankVersion: WORK_START_JOURNAL_BANK.version,
      stage: isLegislativeStaff
        ? yearEstablished
          ? "active-staff-year-established"
          : "active-staff"
        : yearEstablished
          ? "active-year-established"
          : "active",
      sourceRecordIds: [status.id, relationship.id, role.id],
      facts,
      viewer: { personId, traits },
      // Own employment and its dated status establish direct involvement;
      // merely sharing an employer would not grant another viewer knowledge.
      knowledge: Object.keys(facts).map((factKey) => ({
        personId,
        factKey,
        sourceRecordIds: [status.id],
      })),
    },
  };
}

/**
 * Safe for ordinary occupation nouns. Refuse a formal or proper title until
 * its author supplies a reviewed grammatical phrase; never silently lower a
 * person's named office or institution.
 */
export function grammaticalWorkRolePhrase(title: string): string | null {
  const trimmed = title.trim();
  if (/\b(?:staff|work|support)$/i.test(trimmed)) return null;
  if (!/^[A-Z][a-z]+(?:[ -][a-z][a-z-]*)*$/.test(trimmed)) return null;
  const role = trimmed[0]!.toLocaleLowerCase("en-US") + trimmed.slice(1);
  const first = role.split(/[ -]/, 1)[0]!.toLocaleLowerCase("en-US");
  const silentH = /^(hour|honest|honor|heir)/.test(first);
  const consonantSound = /^(uni(?:vers|t|on)|use|euro|one)/.test(first);
  const article =
    silentH || (/^[aeiou]/.test(first) && !consonantSound) ? "an" : "a";
  return `${article} ${role}`;
}

/** Descriptive office names need an article; a named firm does not. */
export function grammaticalEmployerPhrase(name: string): string {
  const trimmed = name.trim();
  if (/^[A-Z][a-z]+ legislative office$/.test(trimmed)) return `the ${trimmed}`;
  return trimmed;
}

function refusal(reason: string): WorkStartJournalPacketResult {
  return { kind: "missing-context", reasons: [reason] };
}
