import { ADDRESS_FACT, ADDRESS_PART_BREAK } from "./opening-facts";
import { familyFactsOf } from "../core2/modules/people";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { relationPhrase } from "../english/journal-words";
import {
  sceneParagraph,
  wordSceneLine,
  type Fact,
  type SceneLine,
  type NarrationMove,
  type SceneWords,
} from "../english/scene-words";
import type { Director } from "./ledger";
import type { SceneBinding, ScheduleEntry } from "./scheduling";
import { properName, spoken } from "./words";

const zero = P.zero;

/** `data/scene-rows.json`: the scene's structure, holding no sentences. */
export interface SceneRows {
  version: string;
  and: string;
  settings: readonly string[];
  leads: readonly string[];
  causes: readonly string[];
  /** The moves that open a scene, each narrated by the bank's opening sentences. */
  openings?: readonly string[];
}
export type { SceneLine };

export interface Scene {
  momentId: string;
  typeKey: string;
  setting: { kind: string; recordId: string };
  presentIds: PersonId[];
  /** Why each person present is there: the fill of the role that cast them. */
  presentReasons: Record<PersonId, string>;
  /**
   * The narrator's opening: one short paragraph (the day, the setting, who is
   * there, what led here), then the characters play the scene out.
   */
  narration: SceneLine[];
  /** The person who opens the scene and whom the conversation is with. */
  talkToId?: PersonId;
  /**
   * A speech the scene is about, in the words its record kept (the address
   * the English engine composed): the speaker gives it in the scene.
   */
  speech?: SceneLine & {
    speakerId: PersonId;
    /** The speech in the parts the talk box plays, one per Continue. */
    parts: readonly string[];
  };
}

export function composeScene(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  words?: SceneWords,
): Scene | null {
  const book = director.ledger.people.get(personId);
  const moment = book?.momentsById.get(entry.momentId);
  const person = core.people.get(personId);
  if (!moment || !person) return null;
  // A moment no situation type binds still plays: at home, with the people
  // who live there, about what happened (audit 1: it used to throw).
  const living = (
    core.households.get(person.householdId)?.memberIds ?? []
  ).filter((id) => core.people.get(id)?.alive);
  const binding: SceneBinding = entry.bindings[zero] ?? {
    typeKey: "unbound",
    roles: [],
    presentIds: living,
    presentReasons: Object.fromEntries(
      living.map((id) => [id, "household"]),
    ) as Record<PersonId, string>,
    setting: { kind: "home", recordId: person.householdId },
    timing: "now",
    openUntil: moment.date,
  };

  const relation = familyFactsOf(person);
  const named = new Set<PersonId>();
  // Someone in the scene, as you know them: by relation, else by name.
  const who = (id: PersonId): Fact | null => {
    const row = core.people.get(id);
    if (!row) return null;
    const kin = relation.get(id);
    const phrase = kin
      ? relationPhrase(kin.relation, row.looks?.gender ?? "other", "scene")
      : undefined;
    if (kin && phrase) return { text: phrase, sourceRecordIds: [kin.factId] };
    if (!person.knownIds.has(id)) return null;
    const first = !named.has(id);
    named.add(id);
    return {
      text: first ? `${row.givenName} ${row.familyName}` : row.givenName,
      sourceRecordIds: [person.knownIdSources?.[id]?.sourceFactId ?? id],
    };
  };
  const place = (id: string): Fact | null => {
    const row = corePlaceByJurisdictionId(id as never);
    return row ? { text: spoken(row), sourceRecordIds: [id] } : null;
  };

  // The narrator's lines are the English engine's: the director says which
  // line it is and what the records give it.
  const render = (
    move: NarrationMove,
    facts: Record<string, Fact> | (() => Record<string, Fact>),
    momentKey: string,
    stage?: (facts: Record<string, Fact>) => string,
  ): SceneLine | null =>
    wordSceneLine({
      seed: core.seed,
      move,
      viewerId: personId,
      facts,
      ...(stage ? { stage } : {}),
      momentKey,
      fallbackSourceId: moment.causeId,
      ...(words ? { words } : {}),
    });

  // The narrator never restates what the screen shows (owner, Oct 26: "it
  // shouldn't say you're at home in Albion or it's Tuesday in November";
  // Oct 27: "When it says you're in place or person is with you, I hate
  // those"): no day, no place and nobody announced as there. Only how the
  // scene reaches the player is said: a call or a letter.
  const sentences: SceneLine[] = [];
  const { kind } = binding.setting;
  const setting = render({ part: "setting", kind }, {}, `${moment.id}:setting`);
  if (setting) sentences.push(setting);

  // Nobody is announced as merely there;
  // the scene's lead says who came and why.
  const opener = binding.roles.find((row) => row.role === binding.opener);

  // What is happening, from the staged situation's type. It names only
  // someone the scene places in the room: not the person a funeral is for.
  // A speech heard (the address on the evening news) is its speaker's own
  // words: no talk opens with them and no lead stands in for them.
  const talkToId = binding.said
    ? undefined
    : (opener?.personIds.find((id) => id !== personId) ??
      moment.counterpartIds.find((id) => binding.presentIds.includes(id)));
  const wasNamed = talkToId ? named.has(talkToId) : false;
  const lead = binding.said
    ? null
    : render(
        {
          part: "lead",
          typeKey: binding.typeKey,
          setting: binding.setting.kind,
        },
        () => {
          const facts: Record<string, Fact> = {};
          const other = talkToId ? who(talkToId) : null;
          if (other) facts.other = other;
          const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
          const org = job
            ? core.organizations.get(job.organizationId)
            : undefined;
          if (org)
            facts.employer = {
              text: properName(org.name),
              sourceRecordIds: [org.id],
            };
          const town = place(person.placeId);
          if (town) facts.place = town;
          return facts;
        },
        `${moment.id}:lead`,
        (facts) => (facts.other ? "other" : "alone"),
      );
  if (lead) sentences.push(lead);
  // A lead that did not say the name leaves it unsaid: the next line to name
  // them says it in full.
  if (talkToId && !wasNamed && !lead?.usedFactKeys?.includes("other"))
    named.delete(talkToId);

  // How the scene opens, from its first move: the one who opens it and
  // what they came to do ("Your mother has something to tell you.").
  const openerId = opener?.personIds.find((id) => id !== personId);
  const openerFact = openerId ? who(openerId) : null;
  const openingLine =
    binding.opening && openerFact
      ? render(
          { part: "opening", move: binding.opening },
          { who: openerFact },
          `${moment.id}:opening`,
        )
      : null;
  // A lead that names the one who opens the scene has already said who came
  // and why; the opening would say it again ("Your mother has news for you.
  // Your mother has something to tell you.").
  const leadNamedOpener =
    !!openerId &&
    openerId === talkToId &&
    !!lead?.usedFactKeys?.includes("other");
  const opening = leadNamedOpener ? null : openingLine;

  // What led here, from the moment's cause, about someone else or the
  // player. News the opener is about to tell is left to them to tell.
  const toTell = openingLine !== null && binding.opening === "tell";
  const otherId = moment.counterpartIds[zero];
  const cause = toTell
    ? null
    : render(
        { part: "cause", label: moment.label },
        () => {
          const facts: Record<string, Fact> = {};
          const other = otherId ? who(otherId) : null;
          if (other) facts.other = other;
          const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
          const org = core.jobs.get(moment.causeId)
            ? core.organizations.get(
                core.jobs.get(moment.causeId)!.organizationId,
              )
            : job
              ? core.organizations.get(job.organizationId)
              : undefined;
          if (org)
            facts.employer = {
              text: properName(org.name),
              sourceRecordIds: [org.id],
            };
          const town = place(person.placeId);
          if (town) facts.place = town;
          return facts;
        },
        `${moment.id}:cause`,
        (facts) => (facts.other && otherId !== personId ? "other" : "self"),
      );
  if (cause) sentences.push(cause);
  if (opening) sentences.push(opening);

  // The sentences are one paragraph, so the narrator sets the scene before
  // anyone speaks.
  const narration: SceneLine[] = sentences.length
    ? [
        {
          text: sceneParagraph(sentences),
          parts: sentences.flatMap((line) => line.parts ?? []),
          // A sitting that took in a later cause the same day cites it too.
          sourceRecordIds: [
            ...new Set([
              ...sentences.flatMap((line) => line.sourceRecordIds),
              ...(binding.joined ?? []).map((row) => row.causeId),
            ]),
          ],
        },
      ]
    : [];
  // A speech's own words, when its record kept them and the person gave it.
  const record = core.durableLog.get(moment.causeId);
  const speechText = record?.facts?.[ADDRESS_FACT.text];
  // The speaker is the person, or the one the scene's `said` role holds.
  const speakerId = record?.facts?.[ADDRESS_FACT.president];
  const speech =
    typeof speechText === "string" &&
    speechText &&
    speakerId &&
    (speakerId === personId ||
      binding.roles.some(
        (row) =>
          row.role === binding.said &&
          row.personIds.includes(speakerId as PersonId),
      ))
      ? {
          speakerId: speakerId as PersonId,
          text: speechText,
          // Played one part per Continue; a speech kept whole is one part.
          parts: String(record!.facts?.[ADDRESS_FACT.parts] ?? speechText)
            .split(ADDRESS_PART_BREAK)
            .filter(Boolean),
          sourceRecordIds: [record!.id],
        }
      : undefined;
  return {
    momentId: moment.id,
    typeKey: binding.typeKey,
    setting: binding.setting,
    presentIds: binding.presentIds,
    presentReasons: binding.presentReasons ?? {},
    narration,
    ...(talkToId ? { talkToId } : {}),
    ...(speech ? { speech } : {}),
  };
}
