import type {
  HistoricalEvent,
  DecisionTraceRecord,
} from "../../simulation/types";
import type { CitizenPetition } from "../../simulation/recall";
const PETITION_SIGNED = "civic.petition-signed";
const PETITION_ASKED = "civic.petition-asked";
const PETITION_SIGNATURE_REVIEWED = "civic.petition-signature-reviewed";
function tagValue(tags: readonly string[], prefix: string): string | null {
  return (
    tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ?? null
  );
}
export function recordedPetitionSignatures(facts: PetitionSignatureFacts) {
  const { petition } = facts;
  const events = facts.events.filter(
    (event) =>
      (event.type === PETITION_SIGNED || event.type === PETITION_ASKED
        ? event.occurredAt <= petition.closesAt
        : event.occurredAt <= facts.currentDate) &&
      event.recordedAt <= facts.currentDate &&
      event.sequence < facts.nextSequence,
  );
  const asks = new Map<string, HistoricalEvent>(
    events
      .filter(
        (row) =>
          row.type === PETITION_ASKED &&
          row.tags.includes(`petition:${petition.stableKey}`),
      )
      .map((row) => [row.id, row]),
  );
  const seen = new Set<string>();
  const valid: {
    readonly signerPersonId: string;
    readonly eventId: string;
    readonly askEventId: string;
  }[] = [];
  const invalid: {
    readonly eventId: string;
    readonly reason: string;
  }[] = [];
  for (const signed of events.filter(
    (row) =>
      row.type === PETITION_SIGNED &&
      row.tags.includes(`petition:${petition.stableKey}`),
  )) {
    const signer = signed.participants.find(
      (row) => row.role === "focus:signer",
    )?.personId;
    const askId = tagValue(signed.tags, "ask:") as string | null;
    const ask = askId ? asks.get(askId) : undefined;
    const eligibility = signer
      ? facts.eligibility(signer, signed.occurredAt)
      : null;
    const traceId = tagValue(signed.tags, "signer-decision:");
    const trace = facts.decisionTraces.find((row) => row.id === traceId);
    const review = events
      .filter(
        (row) =>
          row.type === PETITION_SIGNATURE_REVIEWED &&
          row.tags.includes(`signature:${signed.id}`),
      )
      .at(-1);
    const reason = review?.tags.includes("validity:invalid")
      ? "reviewed-invalid"
      : !signer
        ? "missing-signer"
        : seen.has(signer)
          ? "duplicate-signer"
          : !ask ||
              ask.sequence >= signed.sequence ||
              ask.occurredAt > signed.occurredAt ||
              !ask.participants.some(
                (row) =>
                  row.personId === signer && row.role === "focus:requested",
              )
            ? "missing-request"
            : eligibility && !eligibility.eligible
              ? "ineligible-signer"
              : !trace ||
                  trace.sequence >= signed.sequence ||
                  trace.context.actorPersonId !== signer ||
                  trace.context.subject.key !== petition.stableKey ||
                  trace.selectedOptionKey !== "sign"
                ? "missing-decision"
                : null;
    if (reason) invalid.push({ eventId: signed.id, reason });
    else {
      seen.add(signer!);
      valid.push({
        signerPersonId: signer!,
        eventId: signed.id,
        askEventId: askId!,
      });
    }
  }
  const countAsOf =
    petition.closesAt < facts.currentDate
      ? petition.closesAt
      : facts.currentDate;
  const registeredVoters = facts.registeredVoters(countAsOf);
  return {
    yes: valid.length,
    registeredVoters,
    valid,
    invalid,
    sourceRecordIds: valid.flatMap((row) => [row.eventId, row.askEventId]),
  };
}
export interface PetitionSignatureFacts {
  readonly petition: CitizenPetition;
  readonly events: readonly HistoricalEvent[];
  readonly decisionTraces: readonly DecisionTraceRecord[];
  readonly currentDate: string;
  readonly nextSequence: number;
  readonly eligibility: (
    personId: string,
    on: string,
  ) => { eligible: boolean } | null;
  readonly registeredVoters: (on: string) => number;
}
