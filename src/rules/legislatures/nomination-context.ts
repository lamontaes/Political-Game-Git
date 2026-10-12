import type {
  EntityId,
  IsoDate,
  HistoricalEvent,
  PersonDeathRecord,
  DecisionTraceRecord,
  DecisionSubject,
  DecisionConsideration,
} from "../../simulation/types";
import type { ChamberNominationVoteInput } from "../../simulation/governing/chamber-votes";
import type { SeatedMember } from "../../simulation/legislation-scenarios";
export interface NominationFacts {
  readonly onDate: IsoDate;
  readonly events: readonly HistoricalEvent[];
  readonly personDeaths: readonly PersonDeathRecord[];
  readonly decisionTraces: readonly DecisionTraceRecord[];
  readonly personIds: ReadonlySet<EntityId>;
  readonly jurisdictionIds: ReadonlySet<EntityId>;
}
const FEDERAL_VACANCY_EVENT = "world.office-vacancy";
export interface ChamberVoteContext {
  readonly subject: DecisionSubject;
  readonly committee: DecisionConsideration | null;
  memberInputs(member: SeatedMember): {
    readonly views: readonly DecisionConsideration[];
    readonly cues: readonly DecisionConsideration[];
  };
}

export function nominationVoteContext(
  facts: NominationFacts,
  input: ChamberNominationVoteInput,
): ChamberVoteContext {
  const event = facts.events.find((row) => row.id === input.nominationEventId);
  if (input.nominationKind === "clemency-board") {
    const traceTag = event?.tags.find((tag) =>
      tag.startsWith("appointment-decision:"),
    );
    const traceId = traceTag?.slice("appointment-decision:".length);
    const trace = facts.decisionTraces.find((row) => row.id === traceId);
    if (
      !event ||
      event.recordedAt > facts.onDate ||
      event.occurredAt > facts.onDate ||
      event.type !== "justice.clemency-board-nominated" ||
      event.jurisdictionId !== input.jurisdictionId ||
      !facts.jurisdictionIds.has(input.jurisdictionId) ||
      !facts.personIds.has(input.appointerId) ||
      !facts.personIds.has(input.nomineeId) ||
      !Number.isInteger(input.seatOrdinal) ||
      input.seatOrdinal < 1 ||
      input.officeKey !== `${input.boardKey}:seat:${input.seatOrdinal}` ||
      !event.tags.includes(`board-key:${input.boardKey}`) ||
      !event.tags.includes(`seat:${input.seatOrdinal}`) ||
      !event.participants.some(
        (row) =>
          row.role === "agency:appointer" && row.personId === input.appointerId,
      ) ||
      !event.participants.some(
        (row) =>
          row.role === "agency:nominee" && row.personId === input.nomineeId,
      ) ||
      !trace ||
      trace.sequence >= event.sequence ||
      trace.recordedAt > event.recordedAt ||
      trace.context.actorPersonId !== input.appointerId ||
      trace.selectedOptionKey !== `person:${input.nomineeId}`
    )
      throw new Error(
        "A board confirmation requires its actual dated nomination, appointer decision, nominee, jurisdiction and seat.",
      );
    return {
      subject: {
        kind: "context:clemency-board-nomination",
        key: event.stableKey,
        entityId: event.id,
      },
      committee: null,
      memberInputs: (member) => ({
        views: input.considerationsByMember.get(member.memberKey) ?? [],
        cues: [],
      }),
    };
  }
  if (input.nominationKind === "executive-appointment") {
    const vacancy = facts.events.find((row) => row.id === input.vacancyEventId);
    const incumbentTerm = facts.events.find(
      (row) => row.id === input.incumbentTermEventId,
    );
    const trace = facts.decisionTraces.find(
      (row) => row.id === input.appointmentDecisionTraceId,
    );
    const sourceTag = event?.tags.find((tag) =>
      tag.startsWith("source-event:"),
    );
    const decisionId = sourceTag?.slice("source-event:".length);
    const decision = facts.events.find((row) => row.id === decisionId);
    const vacancyCauseTag = vacancy?.tags.find((tag) =>
      tag.startsWith("vacancy-cause:"),
    );
    const vacancyCause = vacancyCauseTag?.slice("vacancy-cause:".length);
    const vacancySourceTag = vacancy?.tags.find((tag) =>
      tag.startsWith("source-event:"),
    );
    const vacancySourceId = vacancySourceTag?.slice("source-event:".length);
    const vacancySource = facts.events.find(
      (row) => row.id === vacancySourceId,
    );
    const incumbentPersonId = incumbentTerm?.participants.find(
      (row) => row.role === "focus:subject",
    )?.personId;
    const incumbentTermEnd = incumbentTerm?.tags
      .find((tag) => tag.startsWith("term-end:"))
      ?.slice("term-end:".length);
    const latestSeatRecord = facts.events
      .filter(
        (row) =>
          (row.type === "world.office-tenure" ||
            row.type === FEDERAL_VACANCY_EVENT) &&
          row.tags.includes(`appointment-post:${input.postOfficeKey}`) &&
          row.tags.includes(`appointment-seat:${input.seatOrdinal}`) &&
          row.occurredAt <= (event?.occurredAt ?? facts.onDate) &&
          row.recordedAt <= (event?.recordedAt ?? facts.onDate),
      )
      .reduce<(typeof facts.events)[number] | null>(
        (latest, row) =>
          !latest || row.sequence > latest.sequence ? row : latest,
        null,
      );
    const matterTag = event?.tags.find((tag) =>
      tag.startsWith("appointment-matter:"),
    );
    const matterId = matterTag?.slice("appointment-matter:".length);
    const matter = facts.events.find((row) => row.id === matterId);
    if (
      !event ||
      event.visibility !== "public" ||
      event.recordedAt > facts.onDate ||
      event.occurredAt > facts.onDate ||
      event.type !== "executive.appointment-nominated" ||
      event.jurisdictionId !== input.jurisdictionId ||
      !facts.jurisdictionIds.has(input.jurisdictionId) ||
      !facts.personIds.has(input.appointerId) ||
      !facts.personIds.has(input.nomineeId) ||
      !Number.isInteger(input.seatOrdinal) ||
      input.seatOrdinal < 1 ||
      input.officeKey !== input.postOfficeKey ||
      !event.tags.includes(`appointment-post:${input.postOfficeKey}`) ||
      !event.tags.includes(`appointment-seat:${input.seatOrdinal}`) ||
      !event.tags.includes(`appointment-vacancy:${input.vacancyEventId}`) ||
      !event.tags.includes(`appointment-term:${input.incumbentTermEventId}`) ||
      !event.tags.includes(
        `appointment-decision:${input.appointmentDecisionTraceId}`,
      ) ||
      !event.participants.some(
        (row) =>
          row.role === "agency:appointer" && row.personId === input.appointerId,
      ) ||
      !event.participants.some(
        (row) =>
          row.role === "agency:nominee" && row.personId === input.nomineeId,
      ) ||
      !vacancy ||
      vacancy.type !== FEDERAL_VACANCY_EVENT ||
      vacancy.sequence >= event.sequence ||
      vacancy.recordedAt > event.recordedAt ||
      vacancy.occurredAt > event.occurredAt ||
      !vacancy.tags.includes(
        `office:${input.postOfficeKey}:seat:${input.seatOrdinal}`,
      ) ||
      !vacancy.tags.includes(`appointment-post:${input.postOfficeKey}`) ||
      !vacancy.tags.includes(`appointment-seat:${input.seatOrdinal}`) ||
      !vacancy.tags.includes(
        `appointment-term:${input.incumbentTermEventId}`,
      ) ||
      latestSeatRecord?.id !== vacancy.id ||
      !["term-expired", "death", "resignation"].includes(vacancyCause ?? "") ||
      !incumbentTerm ||
      incumbentTerm.type !== "world.office-tenure" ||
      incumbentTerm.sequence >= vacancy.sequence ||
      incumbentTerm.recordedAt > vacancy.recordedAt ||
      incumbentTerm.occurredAt > vacancy.occurredAt ||
      !incumbentTerm.tags.includes(`appointment-post:${input.postOfficeKey}`) ||
      !incumbentTerm.tags.includes(`appointment-seat:${input.seatOrdinal}`) ||
      !incumbentTerm.participants.some(
        (row) =>
          row.role === "focus:subject" &&
          vacancy.involvedEntityIds.includes(row.personId),
      ) ||
      !vacancySource ||
      vacancySource.sequence >= vacancy.sequence ||
      vacancySource.recordedAt > vacancy.recordedAt ||
      vacancySource.occurredAt > vacancy.occurredAt ||
      !incumbentPersonId ||
      (vacancyCause === "term-expired" &&
        (vacancySource.id !== incumbentTerm.id ||
          !incumbentTermEnd ||
          incumbentTermEnd > vacancy.occurredAt)) ||
      (vacancyCause === "death" &&
        !facts.personDeaths.some(
          (death) =>
            death.personId === incumbentPersonId &&
            death.eventId === vacancySource.id &&
            death.diedAt <= vacancy.occurredAt,
        )) ||
      (vacancyCause === "resignation" &&
        (vacancySource.type !== "world.office-resignation" ||
          !vacancySource.tags.includes(
            `appointment-term:${input.incumbentTermEventId}`,
          ) ||
          !vacancySource.participants.some(
            (row) =>
              row.personId === incumbentPersonId && row.role === "focus:actor",
          ))) ||
      !decision ||
      decision.type !== "governing.matter-decided" ||
      decision.sequence >= event.sequence ||
      decision.recordedAt > event.recordedAt ||
      !matter ||
      !decision.tags.includes(`matter:${matter.id}`) ||
      !decision.tags.includes(`choice:person:${input.nomineeId}`) ||
      matter.sequence >= decision.sequence ||
      matter.recordedAt > decision.recordedAt ||
      matter.occurredAt > decision.occurredAt ||
      !decision.participants.some(
        (row) =>
          row.role === "agency:decider" && row.personId === input.appointerId,
      ) ||
      !trace ||
      trace.id !== input.appointmentDecisionTraceId ||
      trace.stableKey !== `appointments-v1:${matter.stableKey}:choose:trace` ||
      trace.context.decisionType !== "appointment.choose-appointee" ||
      trace.context.actorPersonId !== input.appointerId ||
      trace.context.subject.key !== input.postOfficeKey ||
      trace.sequence >= event.sequence ||
      trace.sequence >= decision.sequence ||
      trace.recordedAt > event.recordedAt ||
      trace.recordedAt > decision.recordedAt ||
      !facts.personIds.has(trace.context.actorPersonId) ||
      trace.selectedOptionKey !== `person:${input.nomineeId}` ||
      !trace.sourceSnapshots.some(
        (snapshot) =>
          snapshot.reference.kind === "historical-event" &&
          snapshot.reference.eventId === matter.id,
      ) ||
      matter.type !== "governing.matter-opened" ||
      matter.sequence >= event.sequence ||
      matter.recordedAt > event.recordedAt
    )
      throw new Error(
        "An executive confirmation requires its actual dated nomination, appointer decision, named post and seat, and causal vacancy from a recorded incumbent term.",
      );
    return {
      subject: {
        kind: "context:executive-appointment-nomination",
        key: event.stableKey,
        entityId: event.id,
      },
      committee: null,
      memberInputs: (member) => ({
        views: input.considerationsByMember.get(member.memberKey) ?? [],
        cues: [],
      }),
    };
  }
  const chief = input.officeKey === "us-chief-justice";
  if (
    !event ||
    event.recordedAt > facts.onDate ||
    event.occurredAt > facts.onDate ||
    !facts.personIds.has(input.nomineeId) ||
    !facts.personIds.has(input.presidentId) ||
    event.type !==
      (chief
        ? "governing.chief-justice-nominated"
        : "governing.supreme-court-nominated") ||
    !event.tags.includes(
      chief ? "office:us-chief-justice" : `judicial-seat:${input.officeKey}`,
    ) ||
    !event.participants.some(
      (row) => row.role === "focus:actor" && row.personId === input.presidentId,
    ) ||
    !event.participants.some(
      (row) => row.role === "focus:subject" && row.personId === input.nomineeId,
    )
  )
    throw new Error(
      "A chamber nomination vote requires its actual dated nomination event, actor, nominee and office.",
    );
  return {
    subject: {
      kind: "context:supreme-court-nomination",
      key: event.stableKey,
      entityId: null,
    },
    committee: null,
    memberInputs: (member) => ({
      views: input.considerationsByMember.get(member.memberKey) ?? [],
      cues: [],
    }),
  };
}
