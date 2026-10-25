import { ADDRESS_FACT } from "./opening-facts";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { relationPhrase } from "../english/journal-words";
import {
  sceneNameList,
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
const one = P.one;

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
  speech?: SceneLine & { speakerId: PersonId };
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
  const binding: SceneBinding = entry.bindings[zero] ?? {
    typeKey: "unbound",
    roles: [],
    presentIds: (
      core.households.get(person.householdId)?.memberIds ?? []
    ).filter((id) => core.people.get(id)?.alive),
    setting: { kind: "home", recordId: person.householdId },
    timing: "now",
    openUntil: moment.date,
  };

  const relation = new Map<string, { relation: string; factId: string }>();
  for (const fact of person.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      relation.set(fact.facts.otherPersonId, {
        relation: fact.kind.slice("family:".length),
        factId: fact.id,
      });
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

  // Where you are, from the setting's record.
  const { kind, recordId } = binding.setting;
  const settingFacts: Record<string, Fact> = {};
  if (kind === "home" || kind === "public" || kind === "venue") {
    const town = place(kind === "home" ? person.placeId : recordId);
    if (town) settingFacts.place = town;
  }
  if (kind === "workplace") {
    const org = core.organizations.get(recordId);
    if (org)
      settingFacts.employer = {
        text: properName(org.name),
        sourceRecordIds: [org.id],
      };
  }
  if (kind === "other-home") {
    const host = binding.roles
      .flatMap((row) => row.personIds)
      .find((id) => core.people.get(id)?.householdId === recordId);
    const named = host ? core.people.get(host) : undefined;
    if (named)
      settingFacts.host = {
        text: named.givenName,
        sourceRecordIds: [recordId, named.id],
      };
  }
  const sentences: SceneLine[] = [];
  const dayAt = new Date(`${moment.date}T00:00:00Z`);
  const frame = render(
    { part: "frame" },
    {
      weekday: {
        text: dayAt.toLocaleString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        }),
        sourceRecordIds: [moment.causeId],
      },
      month: {
        text: dayAt.toLocaleString("en-US", {
          month: "long",
          timeZone: "UTC",
        }),
        sourceRecordIds: [moment.causeId],
      },
    },
    `${moment.id}:frame`,
  );
  if (frame) sentences.push(frame);
  const setting = render(
    { part: "setting", kind },
    settingFacts,
    `${moment.id}:setting`,
  );
  if (setting) sentences.push(setting);

  // Who is there. Two people with the same relation ("your son", "your
  // son") are said by their given names instead, so each is someone.
  // Only the people the scene is about are named: the one who opens it and
  // whoever its record names, never a roll call of everyone in the house
  // (batch 11: "Timothy, your daughter, Ahmad, your father, ... are here.").
  const opener = binding.roles.find((row) => row.role === binding.opener);
  const about = new Set<string>([
    ...(opener?.personIds ?? []),
    ...moment.counterpartIds,
  ]);
  const here = binding.presentIds.filter(
    (id) => id !== personId && core.people.get(id)?.alive && about.has(id),
  );
  const said = here.map(who);
  const counts = new Map<string, number>();
  for (const row of said)
    if (row) counts.set(row.text, (counts.get(row.text) ?? zero) + one);
  const present = said
    .map((row, at) =>
      row && (counts.get(row.text) ?? zero) > one
        ? {
            text: core.people.get(here[at]!)!.givenName,
            sourceRecordIds: [...row.sourceRecordIds, here[at]!],
          }
        : row,
    )
    .filter((row): row is Fact => row !== null);
  if (present.length) {
    const line = render(
      { part: "present" },
      {
        who: {
          text: sceneNameList(
            present.map((row) => row.text),
            words,
          ),
          sourceRecordIds: present.flatMap((row) => row.sourceRecordIds),
        },
      },
      `${moment.id}:present`,
      () => (present.length === one ? "one" : "many"),
    );
    if (line) sentences.push(line);
  }

  // What is happening, from the staged situation's type. It names only
  // someone the scene places in the room: not the person a funeral is for.
  const talkToId =
    opener?.personIds.find((id) => id !== personId) ??
    moment.counterpartIds.find((id) => binding.presentIds.includes(id));
  const lead = render(
    { part: "lead", typeKey: binding.typeKey },
    () => {
      const facts: Record<string, Fact> = {};
      const other = talkToId ? who(talkToId) : null;
      if (other) facts.other = other;
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      const org = job ? core.organizations.get(job.organizationId) : undefined;
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

  // How the scene opens, from its first move: the one who opens it and
  // what they came to do ("Your mother has something to tell you.").
  const openerId = opener?.personIds.find((id) => id !== personId);
  const openerFact = openerId ? who(openerId) : null;
  const opening =
    binding.opening && openerFact
      ? render(
          { part: "opening", move: binding.opening },
          { who: openerFact },
          `${moment.id}:opening`,
        )
      : null;

  // What led here, from the moment's cause, about someone else or the
  // player. News the opener is about to tell is left to them to tell.
  const toTell = opening !== null && binding.opening === "tell";
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
  const speech =
    typeof speechText === "string" &&
    speechText &&
    record?.facts?.[ADDRESS_FACT.president] === personId
      ? { speakerId: personId, text: speechText, sourceRecordIds: [record.id] }
      : undefined;
  return {
    momentId: moment.id,
    typeKey: binding.typeKey,
    setting: binding.setting,
    presentIds: binding.presentIds,
    narration,
    ...(talkToId ? { talkToId } : {}),
    ...(speech ? { speech } : {}),
  };
}
