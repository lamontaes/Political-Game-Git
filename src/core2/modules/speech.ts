/**
 * Speeches (M4-04): reception and retelling. A speech is recorded as heard by
 * its audience; the views engine moves each listener's stance on its topic by
 * the speaker's standing with them (`standingWith`), and the drives engine
 * may turn it into a cause. Then each listener decides, through the core's one
 * chooser, whether to retell it at home, from how far it moved them, how
 * closely they follow politics and their temperament; a retelling reaches
 * their household and the ties they have outside it, and moves them the same way. A listener with nobody at home
 * or in their ties outside the audience has no one to tell and weighs nothing. The wording of the speech is GOV's (`giveSpeech`) and the English
 * engine's; this engine records who heard it and what it did.
 *
 * Word of what someone did spreads the same way (CTO, Nov 17: "word of what you did spreads
 * from the people who saw it"). An act on the list people talk about (`src/core2/data/speech/word-kinds.json`)
 * is weighed by each of those who saw it with the same choice, from how hard it struck them;
 * a retelling reaches the same people, and each hearer who believes it learns who told them
 * (`word:<event>:heardFrom`) and is a witness of it at one remove (`word.retold`), which the
 * drives engine reads as it reads the act. What a person knows of someone is what they saw
 * and what they were told: there is no reputation table.
 */
import { scoreOffers, decisionFromScores } from "../choice";
import { addDays, makeIsoDate } from "../kernel/dates";
import rows from "../data/speech/parameters.json" with { type: "json" };
import wordKinds from "../data/speech/word-kinds.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import { engagementOf, NATIONAL_ENGAGEMENT } from "../electorate";
import { believesClaim, claimFit } from "../heard-claims";
import { currentCloseness } from "../closeness";
import { decisionKinds } from "../trait-decision-table";
import { stanceRow, VIEWS_SPEAKER_KEY, VIEWS_SPEAKER_LEAN_KEY } from "./views";
import { hearAsGroups, hearsAsPerson } from "../hearer-groups";

export const SPEECH_MODULE_ID = "speech";
export const SPEECH_HEARD = "speech.heard";
export const SPEECH_RETOLD = "speech.retold";
/** Word of an act retold by one who saw it: the teller is its person, the hearers who believed it its witnesses. */
export const WORD_RETOLD = "word.retold";
/** The `word.retold` fact holding the act as it was recorded (JSON), so a hearer's engines read the act itself. */
export const WORD_EVENT = "wordEvent";
/** A hearer's kept fact that they were told of an act, and by whom. */
export const wordHeardKey = (eventId: string) => `word:${eventId}:heardFrom`;

/** An act people talk about: who saw it and whom it is about, by the event's own fields. */
interface WordKind {
  readonly kind: string;
  /** Who saw it: the event's witnesses, or its persons (the ones it was done to). */
  readonly tellers: "witnesses" | "persons";
  /** Whom it is about: the event's first person, or a fact naming them. */
  readonly about: "first-person" | { readonly fact: string };
}
const WORD_KINDS: ReadonlyMap<string, WordKind> = new Map(
  (wordKinds.kinds as readonly WordKind[]).map((row) => [row.kind, row]),
);
/** The facts of `speech.heard` that name what the speech was given at. */
export const SPEECH_OCCASION_ID = "occasionId";
export const SPEECH_OCCASION_KIND = "occasionKind";
const PARAMETERS = rows as Readonly<Record<string, Parameter>>;
const s = (api: CoreAPI, key: string) => {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  return row.value;
};

export interface SpeechInput {
  id: string;
  speakerId: PersonId;
  placeId: string;
  topic: string;
  desiredChange: string;
  audienceIds: readonly PersonId[];
  /** The speaker is still in the wider population: their lean from their counted record. */
  countedSpeakerLean?: number;
  /**
   * Hearers nobody watches take it as groups of like hearers (`hearAsGroups`):
   * no witness row, no retelling weighed. Set for a world candidate's
   * campaign speech; the player's own speeches keep every hearer a person.
   */
  groupUnwatched?: boolean;
  /**
   * What the speech was given at: the record id of the event (the meeting, the
   * hearing, the sitting, the campaign's statement) and its kind, read from
   * that record. A speech with no event behind it carries none.
   */
  occasion?: { readonly recordId: string; readonly kind: string };
}

export interface Retelling {
  id: string;
  /** The speech, or the act, being retold. */
  speechId: string;
  /** The day it was weighed (rows are dropped speechRetellingKeptDays later). */
  date?: string;
  listenerId: PersonId;
  retold: boolean;
  /** How far the speech moved the listener's stance on its topic. */
  moved: number;
  /** Where the listener weighed retelling it: how closely they follow politics, and the one at home most likely to take it up does. */
  engagement?: number;
  home?: number;
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
      },
    ],
  };
}
export const RETELL = action("speech-retell", true);
export const KEEP = action("speech-keep", false);

const table = (api: CoreAPI) =>
  api.moduleState(SPEECH_MODULE_ID).table("retellings");
const addresses = (api: CoreAPI) =>
  api.moduleState(SPEECH_MODULE_ID).table("addresses");
/**
 * The retelling case being weighed: how far the speech moved the listener,
 * how closely they follow politics, and how closely the one at home most
 * likely to take it up does.
 */
const weighing = new WeakMap<
  object,
  { moved: number; engagement: number; home: number }
>();

/**
 * The speeches the person has given, by the record each one leaves (the
 * English engine earns a speaker their crafted devices from them).
 */
export function addressesGivenBy(
  api: CoreAPI,
  personId: PersonId,
): readonly string[] {
  if (!api.state.modules.has(SPEECH_MODULE_ID)) return [];
  return addresses(api)
    .query("bySpeaker", [personId])
    .map((row) => (row as { id: string }).id);
}

function movedBy(
  api: CoreAPI,
  personId: PersonId,
  eventId: string,
  topic: string,
) {
  const stance = stanceRow(api, personId, topic);
  return (
    stance?.causes
      .filter((row) => row.eventId === eventId)
      .reduce((sum, row) => sum + row.change, api.parameter("zero")) ??
    api.parameter("zero")
  );
}

/**
 * The living people a listener is tied to outside their household and outside
 * the audience: relatives elsewhere, friends and coworkers, from the kept ties
 * (`relationshipsByPerson`), the few they are closest to (speechRetellTies).
 * How far a retelling moves each is decided by the hearer, by how close they
 * are to the teller (`believesClaim`) and by the speaker's standing with them.
 */
function tiesBeyondHome(
  api: CoreAPI,
  listener: Readonly<PersonState>,
  speech: { readonly speakerId: PersonId },
  audience: ReadonlySet<string>,
  atHome: readonly string[],
): readonly PersonState[] {
  const household = new Set(
    api.state.households.get(listener.householdId)?.memberIds ?? [],
  );
  // A person talks it over with a few: the ones they are closest to, nearest
  // first, ties broken by id. Only those few are kept while the ties are read
  // (the same few, in the same order, as sorting every tie and taking them).
  const few = Math.trunc(s(api, "speechRetellTies"));
  if (few <= 0) return [];
  const out: { person: PersonState; closeness: number }[] = [];
  const before = (
    a: { person: PersonState; closeness: number },
    b: { person: PersonState; closeness: number },
  ) => b.closeness - a.closeness || a.person.id.localeCompare(b.person.id);
  for (const key of api.state.relationshipsByPerson.get(listener.id) ?? []) {
    const tie = api.state.relationships.get(key);
    if (!tie) continue;
    const otherId = tie.actorId === listener.id ? tie.otherId : tie.actorId;
    if (
      otherId === speech.speakerId ||
      household.has(otherId) ||
      audience.has(otherId) ||
      atHome.includes(otherId)
    )
      continue;
    const other = api.state.people.get(otherId);
    if (!other?.alive) continue;
    const row = { person: other, closeness: currentCloseness(api.state, tie) };
    // Kept in order: a tie goes where it sorts, and the list stays `few` long.
    if (out.length >= few && before(row, out[out.length - 1]!) >= 0) continue;
    let at = out.length;
    while (at > 0 && before(row, out[at - 1]!) < 0) at -= 1;
    out.splice(at, 0, row);
    if (out.length > few) out.pop();
  }
  return out.map((row) => row.person);
}

/** A speech is heard by its audience; some listeners retell it at home. */
export function deliverSpeech(api: CoreAPI, speech: SpeechInput): Retelling[] {
  const speaker = api.state.people.get(speech.speakerId);
  if (!speaker && speech.countedSpeakerLean === undefined)
    throw new Error(`No such speaker: ${speech.speakerId}`);
  const impulse = s(api, "speechImpulse");
  // The views engine moves each listener by the speaker's standing with them.
  const facts = {
    [VIEWS_SPEAKER_KEY]: speech.speakerId,
    ...(speech.countedSpeakerLean !== undefined
      ? { [VIEWS_SPEAKER_LEAN_KEY]: String(speech.countedSpeakerLean) }
      : {}),
    ...(speech.occasion
      ? {
          [SPEECH_OCCASION_ID]: speech.occasion.recordId,
          [SPEECH_OCCASION_KIND]: speech.occasion.kind,
        }
      : {}),
  };
  const source = {
    tag: "SOURCED" as const,
    citation:
      "A speech given in the simulation; its audience is the people recorded present.",
    asOf: api.state.date,
  };
  // Level of detail (owner, Nov 9): in a world candidate's speech, hearers
  // nobody watches are applied once per group of like hearers; the rest hear
  // it as people.
  const grouped =
    speech.groupUnwatched && speech.speakerId !== api.state.playerId;
  const audienceIds = grouped
    ? speech.audienceIds.filter((id) => hearsAsPerson(api, id))
    : speech.audienceIds;
  if (grouped && audienceIds.length < speech.audienceIds.length) {
    const asPeople = new Set(audienceIds);
    hearAsGroups(
      api,
      {
        event: { id: speech.id, date: api.state.date },
        speakerId: speech.speakerId,
        countedSpeakerLean: speech.countedSpeakerLean,
        topic: speech.topic,
        desiredChange: speech.desiredChange,
        size: Math.abs(impulse) > 0 ? Math.abs(impulse) : 1,
      },
      speech.audienceIds.filter(
        (id) =>
          id !== speech.speakerId &&
          !asPeople.has(id) &&
          api.state.people.get(id)?.alive,
      ),
    );
  }
  api.emit({
    id: speech.id,
    date: api.state.date,
    kind: SPEECH_HEARD,
    // A speaker still in the wider population is named by the event's speaker fact, not as a person.
    personIds: speaker ? [speech.speakerId] : [],
    witnessIds: audienceIds.filter((id) => id !== speech.speakerId),
    placeId: speech.placeId,
    topic: speech.topic,
    desiredChange: speech.desiredChange,
    moodImpulse: impulse,
    facts,
    source,
  });
  addresses(api).put({
    id: speech.id,
    speakerId: speech.speakerId,
    date: api.state.date,
    topic: speech.topic,
  } as unknown as { id: string });
  return retellAmong(api, {
    eventId: speech.id,
    aboutId: speech.speakerId,
    placeId: speech.placeId,
    topic: speech.topic,
    desiredChange: speech.desiredChange,
    impulse,
    present: speech.audienceIds,
    listenerIds: audienceIds,
    moved: (listenerId) => movedBy(api, listenerId, speech.id, speech.topic),
    retold: (listener, toIds) => ({
      id: `${speech.id}:retold:${listener.id}`,
      date: api.state.date,
      kind: SPEECH_RETOLD,
      personIds: [listener.id],
      witnessIds: toIds,
      placeId: listener.placeId,
      topic: speech.topic,
      desiredChange: speech.desiredChange,
      moodImpulse: impulse,
      // Retold at home, it is the listener's case to their family.
      facts: { [VIEWS_SPEAKER_KEY]: listener.id },
      source,
    }),
  });
}

/** What one retelling weighs: the event, who was there, and how it moved each one. */
interface RetellInput {
  readonly eventId: string;
  /** The speaker, or the one the act is about: never told it as news. */
  readonly aboutId: PersonId;
  readonly placeId: string;
  readonly topic?: string;
  readonly desiredChange?: string;
  readonly impulse: number;
  /** Everyone there: nobody present is told it at home. */
  readonly present: readonly PersonId[];
  /** The ones who weigh retelling it. */
  readonly listenerIds: readonly PersonId[];
  /** How far it moved one who was there. */
  readonly moved: (listenerId: PersonId) => number;
  /** The record of one retelling, to the hearers who believed it. */
  readonly retold: (
    listener: Readonly<PersonState>,
    toIds: readonly PersonId[],
  ) => CoreEventInput;
}

/**
 * Each one who was there decides, through the one chooser, whether to tell it: at home
 * first, and past it to the few they are closest to. Each hearer takes it in or not by
 * how close they are to the teller and how it fits where they stand.
 */
function retellAmong(api: CoreAPI, input: RetellInput): Retelling[] {
  const out: Retelling[] = [];
  const audience = new Set(input.present);
  for (const listenerId of input.listenerIds) {
    const listener = api.state.people.get(listenerId);
    if (!listener?.alive || listenerId === input.aboutId) continue;
    const amount = input.moved(listenerId);
    // Who is at home to hear it: the household outside the audience.
    const atHome = (
      api.state.households.get(listener.householdId)?.memberIds ?? []
    ).filter(
      (id) =>
        id !== listenerId &&
        id !== input.aboutId &&
        !audience.has(id) &&
        api.state.people.get(id)?.alive,
    );
    // The people they see outside the house (family elsewhere, friends,
    // coworkers) are also whom a retelling can reach; their own household
    // first, since that is where talk mostly happens.
    const beyond = () =>
      tiesBeyondHome(
        api,
        listener,
        { speakerId: input.aboutId },
        audience,
        atHome,
      );
    let retold = false;
    let scored: ReturnType<typeof scoreOffers> = [];
    let weighed: { engagement: number; home: number } | undefined;
    let outside: readonly PersonState[] = [];
    // Nobody at home to tell: the ones they would tell are the ties outside it.
    if (!atHome.length) outside = beyond();
    const hearers = atHome.length
      ? atHome.map((id) => api.state.people.get(id)!)
      : outside;
    if (hearers.length) {
      const follows = (person: PersonState) =>
        engagementOf(api.state as CoreState, person) ?? NATIONAL_ENGAGEMENT;
      weighed = {
        engagement: follows(listener),
        home: Math.max(...hearers.map(follows)),
      };
      weighing.set(api.state, { moved: amount, ...weighed });
      const offers: ActOffer[] = [KEEP, RETELL].map((definition) => ({
        definition,
        targetId: input.eventId,
        availableHours: api.parameter("hoursPerDay"),
      }));
      scored = scoreOffers(api.state, listenerId, offers, {
        needValues: { company: api.parameter("zero") },
      });
      const decision = decisionFromScores(api.state, listenerId, scored);
      weighing.delete(api.state);
      retold = decision.selected?.definition.id === RETELL.id;
    }
    // A retelling reaches the household and, past it, the listener's ties
    // outside the house; each decides below whether to take it in, by how
    // close they are to the one telling it.
    if (retold && atHome.length) outside = beyond();
    const told = retold
      ? [...atHome.map((id) => api.state.people.get(id)!), ...outside].map(
          (person) => person.id,
        )
      : [];
    const toIds = told.filter((id) => {
      const hearer = api.state.people.get(id)!;
      return believesClaim(api.state, hearer, {
        tellerId: listenerId,
        fit: claimFit(api, hearer, input.topic, input.desiredChange),
      });
    });
    if (toIds.length) api.emit(input.retold(listener, toIds));
    const row: Retelling = {
      id: `${input.eventId}:${listenerId}`,
      speechId: input.eventId,
      date: api.state.date,
      listenerId,
      retold,
      moved: amount,
      ...weighed,
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

/**
 * Word of an act on the list people talk about: those who saw it weigh telling it, by how
 * hard it struck them (the event's own appraised impact), and each hearer who believes it
 * learns of it from them and is its witness at one remove. Only an act about a person the
 * world keeps in full is talked of as theirs.
 */
function spreadWord(api: CoreAPI, event: CoreEventInput): void {
  const row = WORD_KINDS.get(event.kind);
  if (!row) return;
  const aboutId =
    row.about === "first-person"
      ? event.personIds[0]
      : event.facts?.[row.about.fact];
  if (!aboutId || !api.state.people.get(aboutId)?.alive) return;
  const seen =
    row.tellers === "witnesses" ? (event.witnessIds ?? []) : event.personIds;
  const listenerIds = seen.filter(
    (id) => id !== aboutId && api.state.people.get(id)?.alive,
  );
  if (!listenerIds.length) return;
  const impact =
    Math.abs(event.moodImpulse ?? 0) + Math.max(0, event.stressImpulse ?? 0);
  // The act as recorded, so the hearer's engines read the act itself.
  const act = JSON.stringify({
    id: event.id,
    kind: event.kind,
    personIds: event.personIds,
    placeId: event.placeId,
    ...(event.topic ? { topic: event.topic } : {}),
    ...(event.desiredChange ? { desiredChange: event.desiredChange } : {}),
    ...(event.moodImpulse !== undefined
      ? { moodImpulse: event.moodImpulse }
      : {}),
    ...(event.stressImpulse !== undefined
      ? { stressImpulse: event.stressImpulse }
      : {}),
    facts: event.facts ?? {},
  });
  retellAmong(api, {
    eventId: event.id,
    aboutId,
    placeId: event.placeId,
    topic: event.topic,
    desiredChange: event.desiredChange,
    impulse: impact,
    present: [...event.personIds, ...(event.witnessIds ?? [])],
    listenerIds,
    moved: () => impact,
    retold: (listener, toIds) => ({
      id: `${event.id}:word:${listener.id}`,
      date: api.state.date,
      kind: WORD_RETOLD,
      personIds: [listener.id],
      witnessIds: toIds,
      placeId: listener.placeId,
      facts: {
        [wordHeardKey(event.id)]: listener.id,
        [WORD_EVENT]: act,
      },
      source: {
        tag: "SOURCED",
        citation: `Retold by one who saw it: ${event.id}`,
        asOf: api.state.date,
      },
    }),
  });
}

/**
 * Who told a person of an act, or null where nobody did. A person who saw it knows it by
 * the act's own record (`event:<id>:experienced`) for as long as they keep it.
 */
export function heardFrom(
  api: CoreAPI,
  personId: PersonId,
  eventId: string,
): PersonId | null {
  const fact = api.knows(personId, wordHeardKey(eventId));
  return typeof fact?.value === "string" ? fact.value : null;
}

/** Who heard a speech, and who retold it. */
export function retellingsOf(
  api: CoreAPI,
  speechId: string,
): readonly Retelling[] {
  if (!api.state.modules.has(SPEECH_MODULE_ID)) return [];
  return table(api).query("bySpeech", [speechId]) as unknown as Retelling[];
}

/**
 * A speech's retellings are kept as rows for speechRetellingKeptDays, then
 * dropped (owner, Oct 29: old records fold into summaries): nothing in play
 * reads a retelling after the speech's own day; what a hearer was told of an
 * act stays in their knowledge (`heardFrom`). The speech's address row stays,
 * since a speaker's addresses are counted (`addressesGivenBy`). Each day looks
 * up only the retellings weighed that many days before, by date.
 */
function forgetOldRetellings(api: CoreAPI): void {
  const date = addDays(
    makeIsoDate(api.state.date),
    -s(api, "speechRetellingKeptDays"),
  );
  for (const row of table(api).query("byDate", [date]))
    table(api).remove(row.id);
}

export const speechModule: CoreModule = {
  id: SPEECH_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      retellings: {
        indexes: {
          bySpeech: { fields: ["speechId"] },
          byDate: { fields: ["date"] },
        },
      },
      addresses: { indexes: { bySpeaker: { fields: ["speakerId"] } } },
    },
  },
  onDay: (api) => forgetOldRetellings(api),
  eventKinds: [...WORD_KINDS.keys()],
  onEvent: (api, event) => spreadWord(api, event),
  reasonProviders: {
    "speech-reception": (api, actor, _offer, binding) => {
      const now = weighing.get(api.state);
      if (now === undefined) return undefined;
      return {
        value:
          binding.arguments?.retelling === "true"
            ? s(api, "speechRetellWeight") * now.moved +
              s(api, "speechRetellEngagementWeight") * now.engagement +
              s(api, "speechRetellHomeWeight") * now.home
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
    /** A speaker still in the wider population: their counted lean (they have no view row). */
    readonly countedSpeakerLean?: number;
  },
): void {
  const listeners = input.listenerIds.filter(
    (id) => id !== input.speakerId && api.state.people.get(id)?.alive,
  );
  const counted =
    input.countedSpeakerLean !== undefined &&
    !api.state.people.has(input.speakerId);
  if (
    !listeners.length ||
    (!counted && !api.state.people.get(input.speakerId)?.alive)
  )
    return;
  api.emit({
    id: input.id,
    date: api.state.date,
    kind: CASE_MADE,
    // A speaker still in the wider population is named by the event's speaker fact, not as a person.
    personIds: counted ? [] : [input.speakerId],
    witnessIds: listeners,
    placeId: input.placeId,
    topic: input.topic,
    desiredChange: input.desiredChange,
    moodImpulse: s(api, "speechImpulse"),
    facts: {
      [VIEWS_SPEAKER_KEY]: input.speakerId,
      ...(counted
        ? { [VIEWS_SPEAKER_LEAN_KEY]: String(input.countedSpeakerLean) }
        : {}),
    },
    source: { tag: "SOURCED", citation: input.citation, asOf: api.state.date },
  });
}
