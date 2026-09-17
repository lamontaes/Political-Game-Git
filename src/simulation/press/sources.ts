import {
  claimStanceTag,
  recordPlayerClaim,
  type ClaimStance,
} from "../claim-stances";
import { scheduleContradictionCheck } from "../claim-contradictions";
import {
  hasPersonDiscoveredEvidence,
  recordEvidenceDiscovery,
} from "../evidence";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import {
  recordClaim,
  recordEventKnowledge,
  recordRelationshipInteraction,
} from "../records";
import type { ClaimAudience, EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { recordStoryLead, recordSubjectResponse } from "./desk";
import { sortedUnique } from "./shared";
import { reporterIsCurrent, reporterRoles } from "./outlets";
import {
  PRESS_CONTRACT_VERSION,
  SOURCE_TERMS_GLOSSARY,
  sourceTermsAttributable,
  sourceTermsPubliclyUsable,
  type SourceAgreementRecord,
  type SourceContributionRecord,
  type SourceTerms,
} from "./records";
import {
  appendPressRecord,
  pressRecordsOfKind,
  requirePressRecord,
} from "./store";

/**
 * M3 — ground rules, disclosures and leaks.
 *
 * Terms are agreed before anything is disclosed and are stored with the exact
 * negotiated label. What the source then says is an ordinary claim; what the
 * source hands over is an evidence discovery by the reporter. Nothing here
 * tells anyone else who the source was.
 */

export interface ProposeGroundRulesInput {
  readonly stableKey: string;
  readonly outletId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly sourcePersonId: EntityId;
  readonly leadId: EntityId | null;
  readonly terms: SourceTerms;
  /** Required for background: exactly how the source may be described. */
  readonly attributionLabel: string | null;
}

export interface GroundRulesOutcome {
  readonly world: World;
  readonly accepted: boolean;
  readonly agreement: SourceAgreementRecord | null;
  readonly reason: string;
}

/**
 * The reporter accepts terms their outlet's policy allows. A refusal is an
 * ordinary answer, recorded as such; there is no disclosure without terms.
 */
export function negotiateGroundRules(
  world: World,
  input: ProposeGroundRulesInput,
): GroundRulesOutcome {
  const outlet = requirePressRecord(world, "media-outlet", input.outletId);
  const role = reporterRoles(world, outlet.id).find(
    (candidate) => candidate.personId === input.reporterPersonId,
  );
  if (!role || !reporterIsCurrent(world, role)) {
    throw new Error("Ground rules need a current reporter at this outlet.");
  }
  const label =
    input.terms === "background"
      ? (input.attributionLabel?.trim() ?? "")
      : null;
  if (input.terms === "background" && !label) {
    throw new Error("Background terms need the exact attribution you agree.");
  }
  const refused =
    input.terms === "deep-background" && !outlet.acceptsDeepBackground
      ? `${outlet.name} does not accept deep background.`
      : null;
  const source = world.people[input.sourcePersonId];
  const reporter = world.people[input.reporterPersonId];
  if (!source || !reporter) throw new Error("Ground rules need both people.");
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:terms`,
    type: refused ? "press.ground-rules-refused" : "press.ground-rules-agreed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: sortedUnique([
      input.sourcePersonId,
      input.reporterPersonId,
    ]),
    participants: [
      {
        personId: input.sourcePersonId,
        role: "agency:press-source",
        detail: `Proposed ${input.terms} terms`,
      },
      {
        personId: input.reporterPersonId,
        role: "agency:reporter",
        detail: refused ? "Refused the terms" : "Agreed the terms",
      },
    ],
    personFactConstraints: [],
    // Only the two people present know the terms, or that they spoke.
    visibility: "private",
    tags: [
      PRESS_CONTRACT_VERSION,
      `press.terms:${input.terms}`,
      `press.outlet:${outlet.id}`,
    ],
    summary: refused
      ? `${personName(reporter)} would not accept ${input.terms} terms.`
      : `${personName(source)} and ${personName(reporter)} agreed to talk ${termsPhrase(input.terms, label)}.`,
    context: {
      location: null,
      socialContext: SOURCE_TERMS_GLOSSARY[input.terms],
      pressure: refused,
      choice: input.terms,
      motivation: null,
      immediateReaction: label,
    },
  });
  const event = next.history.events.at(-1)!;
  for (const personId of [input.sourcePersonId, input.reporterPersonId]) {
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:terms:known:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  next = recordRelationshipInteraction(next, {
    stableKey: `${input.stableKey}:contact`,
    personIds: [input.sourcePersonId, input.reporterPersonId],
    eventId: event.id,
    occurredAt: next.currentDate,
    kind: "exchange:press-contact",
    change: next.history.relationshipInteractions.some(
      (interaction) =>
        interaction.personIds.includes(input.sourcePersonId) &&
        interaction.personIds.includes(input.reporterPersonId),
    )
      ? "maintained"
      : "formed",
    significance: "minor",
    summary: "A professional press contact.",
    tags: ["press.contact"],
  });
  if (refused) {
    return { world: next, accepted: false, agreement: null, reason: refused };
  }
  const appended = appendPressRecord(next, "source-agreement", {
    stableKey: input.stableKey,
    outletId: outlet.id,
    reporterPersonId: input.reporterPersonId,
    sourcePersonId: input.sourcePersonId,
    leadId: input.leadId,
    terms: input.terms,
    attributionLabel: label,
    agreedAt: next.currentDate,
    agreementEventId: event.id,
    publiclyUsable: sourceTermsPubliclyUsable(input.terms),
    attributable: sourceTermsAttributable(input.terms),
  });
  return {
    world: appended.world,
    accepted: true,
    agreement: appended.record,
    reason: SOURCE_TERMS_GLOSSARY[input.terms],
  };
}

function termsPhrase(terms: SourceTerms, label: string | null): string {
  switch (terms) {
    case "on-record":
      return "on the record";
    case "background":
      return `on background, credited only as “${label}”`;
    case "deep-background":
      return "on deep background";
    case "off-record":
      return "off the record";
  }
}

export interface DiscloseToReporterInput {
  readonly stableKey: string;
  readonly agreementId: EntityId;
  /** The exact words the source says, if any. */
  readonly statement: string | null;
  /** Earlier events the source tells the reporter about. */
  readonly disclosedEventIds: readonly EntityId[];
  /** Evidence the source actually holds and hands over: a leak. */
  readonly leakedEvidenceArtifactIds: readonly EntityId[];
  readonly subjectPersonIds: readonly EntityId[];
  /** PEOPLE stance when the controlled person speaks. */
  readonly stance: ClaimStance | null;
  readonly worldTruth: "true" | "false" | "unknown";
  /** Open a lead at the outlet when this contribution is a tip. */
  readonly openLead: boolean;
  readonly matterId: EntityId | null;
}

/**
 * A disclosure under agreed terms. The reporter learns what the source says
 * (and, for a leak, discovers the records); the claim's audience follows the
 * terms, so off-record words never become publishable material.
 */
export function discloseToReporter(
  world: World,
  input: DiscloseToReporterInput,
): {
  readonly world: World;
  readonly contribution: SourceContributionRecord;
  readonly leadId: EntityId | null;
} {
  const agreement = requirePressRecord(
    world,
    "source-agreement",
    input.agreementId,
  );
  const statement = input.statement?.trim() || null;
  for (const artifactId of input.leakedEvidenceArtifactIds) {
    if (
      !hasPersonDiscoveredEvidence(
        world,
        agreement.sourcePersonId,
        artifactId,
        currentHistoricalCutoff(world),
      )
    ) {
      throw new Error(
        "A source can hand over only records they actually hold.",
      );
    }
  }
  for (const eventId of input.disclosedEventIds) {
    const knows =
      world.history.knowledge.some(
        (knowledge) =>
          knowledge.personId === agreement.sourcePersonId &&
          knowledge.eventId === eventId &&
          knowledge.learnedAt <= world.currentDate,
      ) ||
      world.history.events
        .find((event) => event.id === eventId)
        ?.participants.some(
          (entry) => entry.personId === agreement.sourcePersonId,
        );
    if (!knows) {
      throw new Error("A source can disclose only what they actually know.");
    }
  }
  const leak = input.leakedEvidenceArtifactIds.length > 0;
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:disclosure`,
    type: leak ? "press.records-leaked" : "press.source-disclosure",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: sortedUnique([
      agreement.sourcePersonId,
      agreement.reporterPersonId,
      agreement.id,
      ...input.leakedEvidenceArtifactIds,
    ]),
    participants: [
      {
        personId: agreement.sourcePersonId,
        role: "agency:press-source",
        detail: leak ? "Handed over records" : "Spoke to a reporter",
      },
      {
        personId: agreement.reporterPersonId,
        role: "observation:reporter",
        detail: `Received it under ${agreement.terms} terms`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      PRESS_CONTRACT_VERSION,
      `press.terms:${agreement.terms}`,
      `press.agreement:${agreement.id}`,
      ...(input.stance ? [claimStanceTag(input.stance)] : []),
    ],
    summary: leak
      ? `Records were handed to a reporter under ${agreement.terms} terms.`
      : `A source spoke to a reporter under ${agreement.terms} terms.`,
    context: {
      location: null,
      socialContext: SOURCE_TERMS_GLOSSARY[agreement.terms],
      pressure: null,
      choice: agreement.terms,
      motivation: null,
      immediateReaction: statement,
    },
  });
  const event = next.history.events.at(-1)!;
  const audience: ClaimAudience = agreement.publiclyUsable
    ? "limited"
    : "private";
  let claimId: EntityId | null = null;
  if (statement) {
    if (input.stance && agreement.sourcePersonId === controlled) {
      next = recordPlayerClaim(next, {
        stableKey: input.stableKey,
        eventId: event.id,
        speakerPersonId: agreement.sourcePersonId,
        audience,
        stance: {
          ...input.stance,
          statement,
          recipientPersonIds: [agreement.reporterPersonId],
        },
        worldTruth: input.worldTruth,
      });
      claimId = next.history.claims.at(-1)!.id;
      next = scheduleContradictionCheck(next, {
        stanceEventId: event.id,
        speakerPersonId: agreement.sourcePersonId,
        stance: input.stance,
        jurisdictionId: null,
      });
    } else {
      next = recordClaim(next, {
        stableKey: `${input.stableKey}:claim`,
        speakerPersonId: agreement.sourcePersonId,
        eventId: event.id,
        madeAt: next.currentDate,
        audience,
        statement,
        relationshipToTruth:
          input.worldTruth === "unknown"
            ? "unknown"
            : input.worldTruth === "true"
              ? "consistent"
              : "contradicts",
        provenance: { kind: "direct-record" },
      });
      claimId = next.history.claims.at(-1)!.id;
      next = recordEventKnowledge(next, {
        stableKey: `${input.stableKey}:heard`,
        personId: agreement.reporterPersonId,
        eventId: event.id,
        learnedAt: next.currentDate,
        believedSummary: `A source said: “${statement}”`,
        accuracy: "unknown",
        confidence: "medium",
        source: {
          kind: "told-by",
          sourcePersonId: agreement.sourcePersonId,
          claimId,
        },
      });
    }
  } else {
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:received`,
      personId: agreement.reporterPersonId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  for (const eventId of input.disclosedEventIds) {
    const disclosed = next.history.events.find((item) => item.id === eventId)!;
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:told:${eventId}`,
      personId: agreement.reporterPersonId,
      eventId,
      learnedAt: next.currentDate,
      believedSummary: disclosed.summary,
      accuracy: "unknown",
      confidence: "medium",
      source: {
        kind: "told-by",
        sourcePersonId: agreement.sourcePersonId,
        claimId: null,
      },
    });
  }
  input.leakedEvidenceArtifactIds.forEach((artifactId, index) => {
    next = recordEvidenceDiscovery(next, {
      stableKey: `${input.stableKey}:leak:${index}`,
      personId: agreement.reporterPersonId,
      evidenceArtifactId: artifactId,
      discoveredAt: next.currentDate,
      recordedAt: next.currentDate,
      methodKey: "press:source-leak",
      provenance: {
        kind: "simulated",
        sourceEntityIds: sortedUnique([artifactId, event.id]),
      },
    });
  });
  let leadId: EntityId | null = agreement.leadId;
  if (input.openLead && leadId === null) {
    const created = recordStoryLead(next, {
      stableKey: `${input.stableKey}:lead`,
      outletId: agreement.outletId,
      family: leak ? "records" : "allegation",
      route: "source-tip",
      basisEventIds: [event.id],
      subjectPersonIds: input.subjectPersonIds,
      jurisdictionId: null,
      matterId: input.matterId,
      followsPublicationId: null,
    });
    next = created.world;
    leadId = created.lead.id;
  }
  const appended = appendPressRecord(next, "source-contribution", {
    stableKey: input.stableKey,
    agreementId: agreement.id,
    contributionEventId: event.id,
    claimId,
    disclosedEventIds: sortedUnique(input.disclosedEventIds),
    leakedEvidenceArtifactIds: sortedUnique(input.leakedEvidenceArtifactIds),
    leak,
    subjectPersonIds: sortedUnique(input.subjectPersonIds),
    contributedAt: next.currentDate,
  });
  return { world: appended.world, contribution: appended.record, leadId };
}

export interface PlayerPressAnswerInput {
  readonly leadId: EntityId;
  /** PEOPLE stance with the exact words the player confirmed. */
  readonly stance: ClaimStance;
  readonly worldTruth: "true" | "false" | "unknown";
}

/**
 * The player's on-record answer to a response request. A refusal (evade)
 * records "declined to comment"; any assertion goes through PEOPLE's claim
 * writer, so a lie and a mistake stay different things.
 */
export function answerPressRequest(
  world: World,
  input: PlayerPressAnswerInput,
): World {
  if (world.control.kind !== "person") {
    throw new Error("Only a controlled person can answer a reporter.");
  }
  const personId = world.control.personId;
  const lead = requirePressRecord(world, "story-lead", input.leadId);
  const decline = input.stance.intent === "evade";
  const reporterId =
    pressRecordsOfKind(world, "story-disposition")
      .filter((record) => record.leadId === lead.id)
      .at(-1)?.reporterPersonId ?? null;
  const recorded = recordSubjectResponse(world, {
    leadId: lead.id,
    personId,
    kind: decline ? "decline" : "answer",
    statement: decline ? "I have no comment." : input.stance.statement,
    tags: [claimStanceTag(input.stance)],
  });
  if (decline) return recorded.world;
  let next = recordPlayerClaim(recorded.world, {
    stableKey: `${lead.stableKey}:answer`,
    eventId: recorded.eventId,
    speakerPersonId: personId,
    audience: "public",
    stance: {
      ...input.stance,
      recipientPersonIds: reporterId ? [reporterId] : [],
    },
    worldTruth: input.worldTruth,
  });
  next = scheduleContradictionCheck(next, {
    stanceEventId: recorded.eventId,
    speakerPersonId: personId,
    stance: input.stance,
    jurisdictionId: lead.jurisdictionId,
  });
  return next;
}

/** Agreements visible to one participant only; never to anyone else. */
export function agreementsKnownTo(
  world: World,
  personId: EntityId,
): readonly SourceAgreementRecord[] {
  return pressRecordsOfKind(world, "source-agreement").filter(
    (agreement) =>
      agreement.sourcePersonId === personId ||
      agreement.reporterPersonId === personId,
  );
}
