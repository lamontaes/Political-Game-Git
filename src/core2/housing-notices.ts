/**
 * A letter a household receives about a law that changed what it pays or owes
 * (a rent renewal held below the market, a settlement reached with a lawyer):
 * the letter is an event the oldest adult receives, and from the letter they
 * learn the law's effect, which moves their view of the law and which the
 * director schedules a scene from. Counted households have no one to tell.
 */
import lawParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import type { CoreAPI, CoreState } from "./types";

/** The oldest living adult among these people, or undefined. */
export function oldestAdult(api: CoreAPI, memberIds: readonly string[]) {
  const c = api.state as CoreState;
  const today = makeIsoDate(api.state.date);
  return memberIds
    .map((id) => c.people.get(id))
    .filter(
      (p) =>
        p?.alive &&
        ageOnDate(makeIsoDate(p.birthDate), today) >=
          lawParameters.parameters.adultAge.value,
    )
    .sort(
      (a, b) =>
        a!.birthDate.localeCompare(b!.birthDate) || a!.id.localeCompare(b!.id),
    )[0];
}

export function sendLawNotice(
  api: CoreAPI,
  input: {
    readonly memberIds: readonly string[];
    /** The notice's event kind, e.g. `housing.rent-renewal`. */
    readonly kind: string;
    /** What the notice is about: the lease or case it comes from. */
    readonly recordId: string;
    readonly lawId: string;
    /** The question the learner holds a view on. */
    readonly topic: string;
    readonly desiredChange: "enact" | "repeal";
    readonly noticeFacts: Readonly<Record<string, string>>;
    /** The effect learned, as a share of what the household pays or owes (signed). */
    readonly moodImpulse: number;
    readonly learnedFacts: Readonly<Record<string, string>>;
    readonly noticeCitation: string;
    readonly learnedCitation: string;
  },
): void {
  const head = oldestAdult(api, input.memberIds);
  if (!head) return;
  const noticeId = `event:${input.kind}:${input.recordId}:${api.state.date}`;
  const source = {
    tag: "SOURCED" as const,
    asOf: api.state.date,
    citation: input.noticeCitation,
  };
  api.emit({
    id: noticeId,
    date: api.state.date,
    kind: input.kind,
    personIds: [head.id],
    placeId: head.placeId,
    facts: { lawId: input.lawId, ...input.noticeFacts },
    publicRecord: false,
    source,
  });
  api.emit({
    id: `event:law.effect-learned:${input.recordId}:${api.state.date}`,
    date: api.state.date,
    kind: "law.effect-learned",
    personIds: [head.id],
    placeId: head.placeId,
    topic: input.topic,
    desiredChange: input.desiredChange,
    moodImpulse: input.moodImpulse,
    facts: {
      lawId: input.lawId,
      learnedFrom: `event:${noticeId}:experienced`,
      ...input.learnedFacts,
    },
    publicRecord: false,
    source: { ...source, citation: input.learnedCitation },
  });
}
