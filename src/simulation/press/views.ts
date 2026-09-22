import type { ClaimStance } from "../claim-stances";
import { personName } from "../people";
import type { EntityId, IsoDate, World } from "../types";
import {
  assignedReporter,
  dispositionsForLead,
  latestDisposition,
  storyLeads,
} from "./desk";
import { campaignPersonalUseAvailability } from "./matters";
import {
  ensurePressStateCoverage,
  mediaOutlets,
  reporterIsCurrent,
  reporterRoles,
  stateOfJurisdiction,
} from "./outlets";
import { outletOwner } from "./ownership";
import { proceedingSteps } from "./procedures";
import {
  MISCONDUCT_FAMILY_LABELS,
  SOURCE_TERMS,
  SOURCE_TERMS_GLOSSARY,
  type MediaBeat,
  type MediaScope,
  type SourceTerms,
} from "./records";
import { agreementsKnownTo } from "./sources";
import { pressRecordsOfKind, requirePressRecord } from "./store";

/**
 * Read models for the player's press desk. Pure: nothing here writes the
 * World. Everything shown is limited to what the viewing person knows or took
 * part in; other people's source arrangements never appear.
 */

export interface PressOutletSummary {
  readonly outletId: EntityId;
  readonly outletKey: string;
  readonly name: string;
  readonly scope: MediaScope;
  readonly beats: readonly MediaBeat[];
  /** Who owns the outlet today; null where no owner is recorded. */
  readonly ownerName: string | null;
  readonly reporters: readonly {
    readonly personId: EntityId;
    readonly name: string;
    readonly title: string;
    /** Whether this person has had any recorded contact with the viewer. */
    readonly knownToYou: boolean;
  }[];
}

export type PressAnswerChoice =
  "deny" | "confirm" | "false-denial" | "false-confirmation" | "decline";

export interface PressAnswerOption {
  readonly choice: PressAnswerChoice;
  readonly label: string;
  /** The exact words that will be said, shown before commitment. */
  readonly statement: string;
  /** Plain statement of what this choice is. */
  readonly note: string;
  readonly isLie: boolean;
}

export interface IncomingPressRequest {
  readonly leadId: EntityId;
  readonly outletName: string;
  readonly reporterPersonId: EntityId;
  readonly reporterName: string;
  readonly question: string;
  readonly dueAt: IsoDate;
  readonly answerOptions: readonly PressAnswerOption[];
}

export interface KnownMatterView {
  readonly matterId: EntityId;
  readonly label: string;
  /** Allegation and procedure lines this person actually knows. */
  readonly knownLines: readonly {
    readonly date: IsoDate;
    readonly text: string;
  }[];
  readonly awaitingYourChoice: {
    readonly proceedingId: EntityId;
    readonly institution: string;
  } | null;
}

export interface PressDeskView {
  readonly personId: EntityId;
  readonly outlets: readonly PressOutletSummary[];
  readonly incomingRequests: readonly IncomingPressRequest[];
  readonly agreements: readonly {
    readonly agreementId: EntityId;
    readonly outletName: string;
    readonly reporterName: string;
    readonly terms: SourceTerms;
    readonly label: string | null;
    readonly explanation: string;
  }[];
  readonly matters: readonly KnownMatterView[];
  readonly glossary: readonly {
    readonly terms: SourceTerms;
    readonly text: string;
  }[];
  readonly personalUse: {
    readonly available: boolean;
    readonly label: string;
    readonly balanceMinorUnits: number;
  };
}

/**
 * Everybody this person has anything recorded between them and.
 *
 * One definition, because two surfaces answer "have you spoken to them" — the
 * desk and the disclosure list — and two copies of this would drift into two
 * different answers to the same question.
 */
export function peopleSpokenWith(
  world: World,
  personId: EntityId,
): ReadonlySet<EntityId> {
  return new Set(
    world.history.relationshipInteractions
      .filter((interaction) => interaction.personIds.includes(personId))
      .flatMap((interaction) => interaction.personIds),
  );
}

export function projectPressDesk(
  world: World,
  personId: EntityId,
): PressDeskView {
  const contacts = peopleSpokenWith(world, personId);
  const outlets = mediaOutlets(world).map((outlet) => ({
    outletId: outlet.id,
    outletKey: `media:${outlet.id}`,
    name: outlet.name,
    scope: outlet.scope,
    beats: outlet.beats,
    ownerName: outletOwner(world, outlet.id)?.name ?? null,
    // Only people who could actually take a call. A journalism role outlives
    // the person who held it, and since a current opening now carries the
    // mortality model from the moment it is built, a desk that listed every
    // role ever recorded could offer a dead reporter on the first day.
    reporters: reporterRoles(world, outlet.id)
      .filter((role) => reporterIsCurrent(world, role))
      .map((role) => ({
        personId: role.personId,
        name: personName(world.people[role.personId]!),
        title: role.title,
        knownToYou: contacts.has(role.personId),
      })),
  }));
  const incomingRequests = storyLeads(world).flatMap((lead) => {
    if (!lead.subjectPersonIds.includes(personId)) return [];
    const latest = latestDisposition(world, lead.id);
    if (
      latest?.decision !== "response-requested" ||
      latest.responseDueAt === null ||
      latest.responseDueAt < world.currentDate
    )
      return [];
    const reporterPersonId = assignedReporter(world, lead.id)!;
    const request = world.history.events.find(
      (event) => event.id === latest.eventId,
    )!;
    return [
      {
        leadId: lead.id,
        outletName: requirePressRecord(world, "media-outlet", lead.outletId)
          .name,
        reporterPersonId,
        reporterName: personName(world.people[reporterPersonId]!),
        question: request.context.socialContext ?? request.summary,
        dueAt: latest.responseDueAt,
        answerOptions: pressAnswerOptions(world, lead.id, personId),
      },
    ];
  });
  const agreements = agreementsKnownTo(world, personId).map((agreement) => ({
    agreementId: agreement.id,
    outletName: requirePressRecord(world, "media-outlet", agreement.outletId)
      .name,
    reporterName: personName(world.people[agreement.reporterPersonId]!),
    terms: agreement.terms,
    label: agreement.attributionLabel,
    explanation: SOURCE_TERMS_GLOSSARY[agreement.terms],
  }));
  const personalUse = campaignPersonalUseAvailability(world);
  return {
    personId,
    outlets,
    incomingRequests,
    agreements,
    matters: knownMatters(world, personId),
    glossary: SOURCE_TERMS.map((terms) => ({
      terms,
      text: SOURCE_TERMS_GLOSSARY[terms],
    })),
    personalUse: {
      available: personalUse.available,
      label: personalUse.reason,
      balanceMinorUnits: personalUse.balanceMinorUnits,
    },
  };
}

function knownMatters(
  world: World,
  personId: EntityId,
): readonly KnownMatterView[] {
  const knownEventIds = new Set([
    ...world.history.knowledge
      .filter(
        (record) =>
          record.personId === personId && record.learnedAt <= world.currentDate,
      )
      .map((record) => record.eventId),
    ...world.history.events
      .filter((event) =>
        event.participants.some(
          (entry) =>
            entry.personId === personId && entry.role.startsWith("agency:"),
        ),
      )
      .map((event) => event.id),
  ]);
  return pressRecordsOfKind(world, "matter").flatMap((matter) => {
    const lines = world.history.events
      .filter(
        (event) =>
          event.tags.includes(`press46.matter:${matter.id}`) &&
          knownEventIds.has(event.id) &&
          event.visibility !== "private",
      )
      .map((event) => ({ date: event.occurredAt, text: event.summary }));
    if (lines.length === 0) return [];
    const proceeding = pressRecordsOfKind(world, "matter-proceeding").find(
      (record) =>
        record.matterId === matter.id &&
        record.respondentPersonIds.includes(personId),
    );
    const last = proceeding
      ? proceedingSteps(world, proceeding.id).at(-1)
      : undefined;
    const chosen = proceeding
      ? world.history.events.some(
          (event) =>
            event.stableKey ===
            `${proceeding.stableKey}:respondent-choice:${personId}`,
        )
      : true;
    const awaiting =
      proceeding &&
      last &&
      (last.step === "respondent-notified" ||
        last.step === "complaint-served") &&
      !chosen
        ? {
            proceedingId: proceeding.id,
            institution: proceeding.institutionLabel,
          }
        : null;
    return [
      {
        matterId: matter.id,
        label: MISCONDUCT_FAMILY_LABELS[matter.family],
        knownLines: lines,
        awaitingYourChoice: awaiting,
      },
    ];
  });
}

/**
 * The answers a subject can give, each with its exact words. Whether an answer
 * is a lie comes from the speaker's own record, never from world truth alone.
 */
export function pressAnswerOptions(
  world: World,
  leadId: EntityId,
  personId: EntityId,
): readonly PressAnswerOption[] {
  const decline: PressAnswerOption = {
    choice: "decline",
    label: "Decline to comment",
    statement: "I have no comment.",
    note: "Saying nothing on the record. A refusal is reported as a refusal, not as an admission.",
    isLie: false,
  };
  const lead = requirePressRecord(world, "story-lead", leadId);
  if (!lead.matterId) {
    return [
      {
        choice: "confirm",
        label: "Confirm the account",
        statement: "That account is accurate.",
        note: "Confirms what the reporter described.",
        isLie: false,
      },
      decline,
    ];
  }
  const belief = speakerBelief(world, lead.matterId, personId);
  const knowsItHappened = belief === "believes-true";
  return [
    knowsItHappened
      ? {
          choice: "false-denial",
          label: "Deny it (this is a lie)",
          statement:
            "That is not true. No campaign money paid for anything personal.",
          note: "You know this happened. Denying it is a deliberate lie, and evidence can contradict it later.",
          isLie: true,
        }
      : {
          choice: "deny",
          label: "Deny it",
          statement:
            "That is not true. No campaign money paid for anything personal.",
          note: "As far as your own records show, this did not happen.",
          isLie: false,
        },
    knowsItHappened
      ? {
          choice: "confirm",
          label: "Acknowledge it",
          statement: "Yes. A personal expense was paid from campaign money.",
          note: "An honest acknowledgment. It does not end any inquiry.",
          isLie: false,
        }
      : {
          choice: "false-confirmation",
          label: "Admit to it anyway (this is false as far as you know)",
          statement: "Yes. A personal expense was paid from campaign money.",
          note: "You have no record of this. Saying it happened is a false statement.",
          isLie: true,
        },
    decline,
  ];
}

export function speakerBelief(
  world: World,
  matterId: EntityId,
  personId: EntityId,
): "believes-true" | "believes-false" {
  const matter = requirePressRecord(world, "matter", matterId);
  if (!matter.occurrenceId) return "believes-false";
  const occurrence = requirePressRecord(
    world,
    "financial-occurrence",
    matter.occurrenceId,
  );
  const knows =
    occurrence.actorPersonIds.includes(personId) ||
    world.history.knowledge.some(
      (record) =>
        record.personId === personId &&
        record.eventId === occurrence.occurrenceEventId &&
        record.learnedAt <= world.currentDate,
    );
  return knows ? "believes-true" : "believes-false";
}

/** Builds the PEOPLE stance for a chosen answer. */
export function pressAnswerStance(
  world: World,
  leadId: EntityId,
  personId: EntityId,
  choice: PressAnswerChoice,
): {
  readonly stance: ClaimStance;
  readonly worldTruth: "true" | "false" | "unknown";
} {
  const option = pressAnswerOptions(world, leadId, personId).find(
    (candidate) => candidate.choice === choice,
  );
  if (!option) throw new Error("That answer is not available.");
  const lead = requirePressRecord(world, "story-lead", leadId);
  const reporterId = assignedReporter(world, leadId);
  const base = {
    version: 1 as const,
    statement: option.statement,
    beliefEvidenceIds: [] as EntityId[],
    recipientPersonIds: reporterId ? [reporterId] : [],
    audibility: "press-exchange",
    sourceEntityIds: [...lead.basisEventIds],
  };
  if (!lead.matterId) {
    return {
      stance: {
        ...base,
        propositionKey: `press-story:${lead.id}`,
        proposition: "The reporter's account is accurate.",
        asserted: choice === "decline" ? "none" : "affirms",
        speakerBelief:
          choice === "decline" ? "not-applicable" : "believes-true",
        intent: choice === "decline" ? "evade" : "truthful",
      },
      worldTruth: "unknown",
    };
  }
  const matter = requirePressRecord(world, "matter", lead.matterId);
  const belief = speakerBelief(world, matter.id, personId);
  const occurrence = matter.occurrenceId
    ? requirePressRecord(world, "financial-occurrence", matter.occurrenceId)
    : null;
  const worldTruth = matter.occurrenceId ? "true" : "false";
  const asserted =
    choice === "decline"
      ? "none"
      : choice === "deny" || choice === "false-denial"
        ? "denies"
        : "affirms";
  const matches =
    (asserted === "affirms" && belief === "believes-true") ||
    (asserted === "denies" && belief === "believes-false");
  return {
    stance: {
      ...base,
      propositionKey: `matter:${matter.id}`,
      proposition: `${MISCONDUCT_FAMILY_LABELS[matter.family]} happened as alleged.`,
      asserted,
      speakerBelief: choice === "decline" ? "not-applicable" : belief,
      intent: choice === "decline" ? "evade" : matches ? "truthful" : "deceive",
      beliefEvidenceIds: occurrence ? [occurrence.occurrenceEventId] : [],
    },
    worldTruth,
  };
}

/**
 * State politics is exposed when the controlled person took part in a public
 * event inside a state that has no state newsroom yet.
 */
export function ensurePressExposureCoverage(world: World): World {
  if (world.control.kind !== "person") return world;
  const personId = world.control.personId;
  const covered = new Set(
    mediaOutlets(world)
      .filter((outlet) => outlet.scope === "state")
      .flatMap((outlet) => outlet.primaryJurisdictionIds),
  );
  const exposed = new Set<EntityId>();
  for (const event of world.history.events) {
    if (event.visibility !== "public" || !event.jurisdictionId) continue;
    if (!event.participants.some((entry) => entry.personId === personId))
      continue;
    const state = stateOfJurisdiction(world, event.jurisdictionId);
    if (state && !covered.has(state)) exposed.add(state);
  }
  let next = world;
  for (const state of [...exposed].sort()) {
    next = ensurePressStateCoverage(next, state);
  }
  return next;
}

/** Stories published by an outlet, newest first, for a reporter byline list. */
export function storiesByReporter(
  world: World,
  reporterPersonId: EntityId,
): readonly {
  readonly publicationId: EntityId;
  readonly headline: string;
  readonly publishedAt: IsoDate;
}[] {
  return storyLeads(world)
    .flatMap((lead) =>
      dispositionsForLead(world, lead.id)
        .filter(
          (record) =>
            record.decision === "published" &&
            record.reporterPersonId === reporterPersonId &&
            record.publicationId,
        )
        .map((record) => {
          const publication = (world.history.publications ?? []).find(
            (item) => item.id === record.publicationId,
          )!;
          return {
            publicationId: publication.id,
            headline: publication.headline,
            publishedAt: publication.publishedAt,
          };
        }),
    )
    .reverse();
}

/** CAMPAIGN interface: current reporters whose geography covers a place. */
export function reportersCoveringJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): readonly EntityId[] {
  const state = stateOfJurisdiction(world, jurisdictionId);
  return reporterRoles(world)
    .filter((role) => {
      if (!reporterIsCurrent(world, role)) return false;
      const outlet = requirePressRecord(world, "media-outlet", role.outletId);
      if (outlet.scope === "national") return false;
      return (
        role.geographyJurisdictionIds.includes(jurisdictionId) ||
        (state !== null && role.geographyJurisdictionIds.includes(state))
      );
    })
    .map((role) => role.personId);
}
