/**
 * Speeches (M4-04): reception and retelling. A speech is recorded as heard by
 * its audience; the views engine moves each listener's stance on its topic by
 * the speaker's standing with them (`standingWith`), and the drives engine
 * may turn it into a cause. Then each listener decides, through the core's one
 * chooser, whether to retell it at home, from how far it moved them and how
 * sociable they are; a retelling reaches their household and moves them the
 * same way. The wording of the speech is GOV's (`giveSpeech`) and the English
 * engine's; this engine records who heard it and what it did.
 */
import { scoreOffers, decisionFromScores } from "../choice";
import rows from "../data/speech/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  PersonId,
} from "../types";
import { decisionKinds, decisionLean } from "../trait-decisions";
import { stancesOf, VIEWS_SPEAKER_KEY } from "./views";

export const SPEECH_MODULE_ID = "speech";
export const SPEECH_HEARD = "speech.heard";
export const SPEECH_RETOLD = "speech.retold";
const PARAMETERS = rows as Readonly<Record<string, Parameter>>;
const s = (api: CoreAPI, key: string) => {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
};

/** What a speech was given at. */
export type SpeechOccasion =
  "campaign" | "meeting" | "hearing" | "party-meeting" | "address" | "press";

/** The fact on a heard speech that names the occasion it was given at. */
export const SPEECH_OCCASION_KEY = "speech:occasion";

export interface SpeechInput {
  id: string;
  /** What the speech was given at; the story director and the journal read it. */
  occasion?: SpeechOccasion;
  speakerId: PersonId;
  placeId: string;
  topic: string;
  desiredChange: string;
  audienceIds: readonly PersonId[];
}

export interface Retelling {
  id: string;
  speechId: string;
  listenerId: PersonId;
  retold: boolean;
  /** How far the speech moved the listener's stance on its topic. */
  moved: number;
  scores: readonly { actionId: string; score: number }[];
  toIds: readonly PersonId[];
}

function action(id: string, retelling: boolean): ActionDefinition {
  return {
    id,
    actKinds: decisionKinds("speech.retell", id),
    goalKinds: [],
    need: "company",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "speech",
    effect: "retell",
    reasonBindings: [
      {
        id: "reception",
        provider: "speech-reception",
        weightParameter: "one",
        arguments: { retelling: String(retelling) },
        stopgapId: "SG-P15-speech-reception",
      },
    ],
  };
}
export const RETELL = action("speech-retell", true);
export const KEEP = action("speech-keep", false);

const table = (api: CoreAPI) =>
  api.moduleState(SPEECH_MODULE_ID).table("retellings");
const moved = new WeakMap<object, number>();

function movedBy(
  api: CoreAPI,
  personId: PersonId,
  eventId: string,
  topic: string,
) {
  const stance = stancesOf(api, personId).find((row) => row.topic === topic);
  return (
    stance?.causes
      .filter((row) => row.eventId === eventId)
      .reduce((sum, row) => sum + row.change, api.parameter("zero")) ??
    api.parameter("zero")
  );
}

/** A speech is heard by its audience; some listeners retell it at home. */
export function deliverSpeech(api: CoreAPI, speech: SpeechInput): Retelling[] {
  const speaker = api.state.people.get(speech.speakerId);
  if (!speaker) throw new Error(`No such speaker: ${speech.speakerId}`);
  const impulse = s(api, "speechImpulse");
  // The views engine moves each listener by the speaker's standing with them.
  const facts: Record<string, string> = {
    [VIEWS_SPEAKER_KEY]: speech.speakerId,
    ...(speech.occasion ? { [SPEECH_OCCASION_KEY]: speech.occasion } : {}),
  };
  const source = {
    tag: "SOURCED" as const,
    citation:
      "A speech given in the simulation; its audience is the people recorded present.",
    asOf: api.state.date,
  };
  api.emit({
    id: speech.id,
    date: api.state.date,
    kind: SPEECH_HEARD,
    personIds: [speech.speakerId],
    witnessIds: speech.audienceIds.filter((id) => id !== speech.speakerId),
    placeId: speech.placeId,
    topic: speech.topic,
    desiredChange: speech.desiredChange,
    moodImpulse: impulse,
    facts,
    source,
  });
  const out: Retelling[] = [];
  for (const listenerId of speech.audienceIds) {
    const listener = api.state.people.get(listenerId);
    if (!listener?.alive || listenerId === speech.speakerId) continue;
    const amount = movedBy(api, listenerId, speech.id, speech.topic);
    moved.set(api.state, amount);
    const offers: ActOffer[] = [KEEP, RETELL].map((definition) => ({
      definition,
      targetId: speech.id,
      availableHours: api.parameter("hoursPerDay"),
    }));
    const scored = scoreOffers(api.state, listenerId, offers, {
      needValues: { company: api.parameter("zero") },
    });
    const decision = decisionFromScores(api.state, listenerId, scored);
    moved.delete(api.state);
    const retold = decision.selected?.definition.id === RETELL.id;
    const audience = new Set(speech.audienceIds);
    const toIds = retold
      ? (
          api.state.households.get(listener.householdId)?.memberIds ?? []
        ).filter(
          (id) =>
            id !== listenerId &&
            id !== speech.speakerId &&
            !audience.has(id) &&
            api.state.people.get(id)?.alive,
        )
      : [];
    if (toIds.length)
      api.emit({
        id: `${speech.id}:retold:${listenerId}`,
        date: api.state.date,
        kind: SPEECH_RETOLD,
        personIds: [listenerId],
        witnessIds: toIds,
        placeId: listener.placeId,
        topic: speech.topic,
        desiredChange: speech.desiredChange,
        moodImpulse: impulse,
        // Retold at home, it is the listener's case to their family.
        facts: {
          [VIEWS_SPEAKER_KEY]: listenerId,
          ...(speech.occasion
            ? { [SPEECH_OCCASION_KEY]: speech.occasion }
            : {}),
        },
        source,
      });
    const row: Retelling = {
      id: `${speech.id}:${listenerId}`,
      speechId: speech.id,
      listenerId,
      retold: retold && toIds.length > api.parameter("zero"),
      moved: amount,
      scores: scored.map((entry) => ({
        actionId: entry.offer.definition.id,
        score: entry.score,
      })),
      toIds,
    };
    table(api).put(row as unknown as { id: string });
    out.push(row);
  }
  return out;
}

/** Who heard a speech, and who retold it. */
export function retellingsOf(
  api: CoreAPI,
  speechId: string,
): readonly Retelling[] {
  if (!api.state.modules.has(SPEECH_MODULE_ID)) return [];
  return table(api).query("bySpeech", [speechId]) as unknown as Retelling[];
}

export const speechModule: CoreModule = {
  id: SPEECH_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { retellings: { indexes: { bySpeech: { fields: ["speechId"] } } } },
  },
  reasonProviders: {
    "speech-reception": (api, actor, _offer, binding) => {
      const amount = moved.get(api.state);
      if (amount === undefined) return undefined;
      return {
        value:
          binding.arguments?.retelling === "true"
            ? s(api, "speechRetellWeight") * amount +
              s(api, "speechSociabilityWeight") *
                decisionLean(
                  api.state,
                  actor,
                  "speech.retell",
                  "speech-retell",
                  "speech-keep",
                )
            : s(api, "speechKeepPull"),
        sourceIds: [actor.id],
      };
    },
  },
};

/** A case made in private: a lobbying visit, a constituent at an office. */
export const CASE_MADE = "case.made";

/**
 * Someone makes their case on a policy question to a few listeners face to
 * face. The views engine moves each listener by the speaker's standing with
 * them, the same way a speech moves its audience; nobody retells it.
 */
export function makeCase(
  api: CoreAPI,
  input: {
    readonly id: string;
    readonly speakerId: PersonId;
    readonly listenerIds: readonly PersonId[];
    readonly placeId: string;
    readonly topic: string;
    readonly desiredChange: string;
    readonly citation: string;
  },
): void {
  const listeners = input.listenerIds.filter(
    (id) => id !== input.speakerId && api.state.people.get(id)?.alive,
  );
  if (!listeners.length || !api.state.people.get(input.speakerId)?.alive)
    return;
  api.emit({
    id: input.id,
    date: api.state.date,
    kind: CASE_MADE,
    personIds: [input.speakerId],
    witnessIds: listeners,
    placeId: input.placeId,
    topic: input.topic,
    desiredChange: input.desiredChange,
    moodImpulse: s(api, "speechImpulse"),
    facts: { [VIEWS_SPEAKER_KEY]: input.speakerId },
    source: { tag: "SOURCED", citation: input.citation, asOf: api.state.date },
  });
}
