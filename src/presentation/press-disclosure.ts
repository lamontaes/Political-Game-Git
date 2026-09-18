import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import { hasPersonDiscoveredEvidence } from "../simulation/evidence";
import { currentLifeCutoff } from "../simulation/life-queries";
import {
  SOURCE_TERMS,
  SOURCE_TERMS_GLOSSARY,
  agreementsKnownTo,
  discloseToReporter,
  mediaOutlets,
  negotiateGroundRules,
  peopleSpokenWith,
  reporterRoles,
  sourceTermsAttributable,
  sourceTermsPubliclyUsable,
} from "../simulation/press";
import type { SourceTerms } from "../simulation/press";
import { proseDate } from "./prose-dates";

/**
 * Taking something to a reporter (CRUNCH47 B2, the player's side).
 *
 * Three separate steps, in the order a person would actually take them: who
 * you would be talking to, on what terms, and only then what you would say.
 * The terms are agreed before anything is disclosed, and the exact words of
 * the arrangement are shown before it is entered into — not summarized
 * afterwards.
 *
 * What the player can hand over is what they actually hold: records they have
 * discovered and events they know about. Nothing else is offered, so there is
 * no way to leak a document the character has never seen.
 *
 * Pure projections; the commands below are the only writers. Who a source was
 * is never published by this module, and never appears on anybody else's view.
 */

export interface DisclosureTerms {
  readonly terms: SourceTerms;
  readonly label: string;
  /** What it means, in the words the glossary already uses. */
  readonly meaning: string;
  readonly publiclyUsable: boolean;
  readonly attributable: boolean;
  /** Background needs the exact description agreed in advance. */
  readonly needsAttributionLabel: boolean;
  readonly available: boolean;
  readonly unavailableReason: string | null;
}

export interface DisclosableRecord {
  readonly kind: "event" | "evidence";
  readonly id: EntityId;
  readonly summary: string;
  readonly on: string;
  readonly onSpoken: string;
}

export interface ReporterContact {
  readonly reporterPersonId: EntityId;
  readonly reporterName: string;
  readonly outletId: EntityId;
  readonly outletName: string;
  readonly beats: readonly string[];
  readonly terms: readonly DisclosureTerms[];
  /** An arrangement these two already have, if any. */
  readonly existingAgreementId: EntityId | null;
  /**
   * Whether anything is recorded between these two already.
   *
   * Not a condition of talking to them: anybody can write to a newspaper, and
   * the list is every reporter at every outlet for that reason. This only says
   * which of them the character has actually met.
   */
  readonly knownToYou: boolean;
}

export interface DisclosureView {
  readonly personId: EntityId;
  readonly contacts: readonly ReporterContact[];
  readonly tellable: readonly DisclosableRecord[];
  readonly leakable: readonly DisclosableRecord[];
  /** Said before any of it: what this is and is not. */
  readonly note: string;
}

const TERM_LABEL: Readonly<Record<SourceTerms, string>> = {
  "on-record": "On the record",
  background: "On background",
  "deep-background": "On deep background",
  "off-record": "Off the record",
};

export function projectDisclosure(
  world: World,
  personId: EntityId,
): DisclosureView {
  const agreements = agreementsKnownTo(world, personId);
  const spokenWith = peopleSpokenWith(world, personId);
  const contacts = mediaOutlets(world).flatMap((outlet) =>
    reporterRoles(world, outlet.id).flatMap((role) => {
      const reporter = world.people[role.personId];
      if (!reporter || role.personId === personId) return [];
      const existing = agreements.find(
        (agreement) =>
          agreement.reporterPersonId === role.personId &&
          agreement.sourcePersonId === personId,
      );
      return [
        {
          reporterPersonId: role.personId,
          reporterName: personName(reporter),
          outletId: outlet.id,
          outletName: outlet.name,
          beats: [...role.beats],
          existingAgreementId: existing?.id ?? null,
          knownToYou: spokenWith.has(role.personId),
          terms: SOURCE_TERMS.map((terms): DisclosureTerms => {
            const refused =
              terms === "deep-background" && !outlet.acceptsDeepBackground;
            return {
              terms,
              label: TERM_LABEL[terms],
              meaning: SOURCE_TERMS_GLOSSARY[terms],
              publiclyUsable: sourceTermsPubliclyUsable(terms),
              attributable: sourceTermsAttributable(terms),
              needsAttributionLabel: terms === "background",
              available: !refused,
              unavailableReason: refused
                ? `${outlet.name} does not accept deep background.`
                : null,
            };
          }),
        },
      ];
    }),
  );
  return {
    personId,
    contacts,
    tellable: tellableEvents(world, personId),
    leakable: leakableEvidence(world, personId),
    note: "Terms are agreed before anything is said. Off the record cannot be published; on background is published only as the exact description you agree.",
  };
}

/** Events this person knows about and could therefore tell somebody. */
function tellableEvents(
  world: World,
  personId: EntityId,
): readonly DisclosableRecord[] {
  const known = new Set(
    world.history.knowledge
      .filter((entry) => entry.personId === personId)
      .map((entry) => entry.eventId),
  );
  for (const event of world.history.events) {
    if (event.involvedEntityIds.includes(personId)) known.add(event.id);
  }
  return world.history.events
    .filter((event) => known.has(event.id) && event.visibility !== "public")
    .slice(-40)
    .map((event) => ({
      kind: "event" as const,
      id: event.id,
      summary: event.summary,
      on: event.occurredAt,
      onSpoken: proseDate(event.occurredAt),
    }));
}

/** Records this person has actually discovered, and so could hand over. */
function leakableEvidence(
  world: World,
  personId: EntityId,
): readonly DisclosableRecord[] {
  const cutoff = currentLifeCutoff(world);
  return world.history.evidenceArtifacts.flatMap((artifact) => {
    if (!hasPersonDiscoveredEvidence(world, personId, artifact.id, cutoff)) {
      return [];
    }
    return [
      {
        kind: "evidence" as const,
        id: artifact.id,
        summary: artifact.description ?? artifact.evidenceKind,
        on: artifact.createdAt,
        onSpoken: proseDate(artifact.createdAt),
      },
    ];
  });
}

export interface AgreeTermsInput {
  readonly personId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly outletId: EntityId;
  readonly terms: SourceTerms;
  /** Exactly how you may be described, for background.  */
  readonly attributionLabel?: string;
}

/** Agree how you may be described. A refusal is an ordinary answer. */
export function agreePressTerms(
  world: World,
  input: AgreeTermsInput,
): {
  world: World;
  accepted: boolean;
  agreementId: EntityId | null;
  reason: string;
} {
  requireControlled(world, input.personId);
  const outcome = negotiateGroundRules(world, {
    stableKey: `press-source:${input.personId}:${input.reporterPersonId}:${world.currentDate}`,
    outletId: input.outletId,
    reporterPersonId: input.reporterPersonId,
    sourcePersonId: input.personId,
    leadId: null,
    terms: input.terms,
    attributionLabel: input.attributionLabel ?? null,
  });
  return {
    world: outcome.world,
    accepted: outcome.accepted,
    agreementId: outcome.agreement?.id ?? null,
    reason: outcome.reason,
  };
}

export interface TellReporterInput {
  readonly personId: EntityId;
  readonly agreementId: EntityId;
  readonly statement?: string;
  readonly eventIds?: readonly EntityId[];
  readonly evidenceArtifactIds?: readonly EntityId[];
  readonly subjectPersonIds?: readonly EntityId[];
  /** Whether the reporter should look into it, rather than just know it. */
  readonly openLead?: boolean;
}

/**
 * Say it, hand it over, or both. Only what the player actually holds; the
 * domain refuses anything else, and the refusal says which.
 */
export function tellReporter(
  world: World,
  input: TellReporterInput,
): { world: World; leadId: EntityId | null } {
  requireControlled(world, input.personId);
  const result = discloseToReporter(world, {
    stableKey: `press-disclosure:${input.personId}:${input.agreementId}:${world.currentDate}`,
    agreementId: input.agreementId,
    statement: input.statement?.trim() || null,
    disclosedEventIds: input.eventIds ?? [],
    leakedEvidenceArtifactIds: input.evidenceArtifactIds ?? [],
    subjectPersonIds: input.subjectPersonIds ?? [],
    stance: null,
    worldTruth: "unknown",
    openLead: input.openLead ?? false,
    matterId: null,
  });
  return { world: result.world, leadId: result.leadId };
}

function requireControlled(world: World, personId: EntityId): void {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    throw new Error("Only the character being played can talk to a reporter.");
  }
}
