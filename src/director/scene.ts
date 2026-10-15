import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishKnowledge,
  type GroundedEnglishPacket,
} from "../english/grounded-english";
import { JOURNAL_DATA } from "./journal";
import type { Director } from "./ledger";
import type { SceneBinding, ScheduleEntry } from "./scheduling";
import { sceneWordsFromBank } from "./mined/scene-bank";
import { properName, spoken } from "./words";

const zero = P.zero;
const one = P.one;

interface Variant {
  key: string;
  text: string;
  stages?: string[];
}
export interface SceneWords {
  version: string;
  and: string;
  /** The day's names, as facts for the "when" line: no sentences. */
  weekdays: readonly string[];
  months: readonly string[];
  settings: Readonly<Record<string, Variant[]>>;
  /** The day it is. */
  when: Variant[];
  present: Variant[];
  /** What is happening, by the staged situation's type. */
  leads: readonly { typeKey: string; variants: Variant[] }[];
  causes: readonly { labelPrefix: string; variants: Variant[] }[];
}
/** `data/scene-rows.json`: the scene's structure, holding no sentences. */
export interface SceneRows {
  version: string;
  and: string;
  weekdays: readonly string[];
  months: readonly string[];
  settings: readonly string[];
  leads: readonly string[];
  causes: readonly string[];
}
/** The default words are the mined bank's. */
export const SCENE_WORDS: SceneWords = sceneWordsFromBank();

interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}

export interface SceneLine {
  text: string;
  sourceRecordIds: readonly string[];
}

export interface Scene {
  momentId: string;
  typeKey: string;
  setting: { kind: string; recordId: string };
  presentIds: PersonId[];
  /**
   * The narrator's opening, one sentence a line: where you are, what day it
   * is, who is there and what is happening. `paragraph` is the same lines
   * read as one.
   */
  narration: SceneLine[];
  paragraph: SceneLine;
  /** The person who opens the scene and whom the conversation is with. */
  talkToId?: PersonId;
}

export function composeScene(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  words: SceneWords = SCENE_WORDS,
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
    const forms = kin ? JOURNAL_DATA.relationWords[kin.relation] : undefined;
    const word = forms?.[row.looks?.gender ?? "other"] ?? forms?.other;
    if (kin && word)
      return {
        text: `${JOURNAL_DATA.possessive.scene} ${word}`,
        sourceRecordIds: [kin.factId],
      };
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

  const render = (
    key: string,
    rows: readonly Variant[] | undefined,
    facts: Record<string, Fact>,
    momentKey: string,
    stage = "default",
  ): SceneLine | null => {
    if (!rows?.length) return null;
    const bank: AuthoredEnglishBank = {
      key,
      version: words.version,
      surface: "scene",
      variants: rows.map((row) => ({ ...row, kind: "template" as const })),
    };
    const ids = [
      ...new Set(Object.values(facts).flatMap((row) => row.sourceRecordIds)),
    ];
    const result = renderGroundedEnglish(
      {
        surface: "scene",
        momentKey,
        worldSeed: core.seed,
        bankVersion: words.version,
        stage,
        sourceRecordIds: ids.length ? ids : [moment.causeId],
        facts,
        viewer: { personId, traits: {} },
        knowledge: Object.entries(facts).map(([factKey, fact]) => ({
          personId,
          factKey,
          sourceRecordIds: fact.sourceRecordIds,
        })) as unknown as GroundedEnglishKnowledge[],
      } as unknown as GroundedEnglishPacket,
      bank,
    );
    if (result.kind !== "rendered") return null;
    return {
      text: result.text.charAt(zero).toUpperCase() + result.text.slice(one),
      sourceRecordIds: result.sourceRecordIds,
    };
  };

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
  const narration: SceneLine[] = [];
  const setting = render(
    `scene-setting:${kind}`,
    words.settings[kind],
    settingFacts,
    `${moment.id}:setting`,
  );
  if (setting) narration.push(setting);

  // The day it is, from the day the scene is scheduled. A moment no
  // situation type binds is recorded past, not a day to narrate.
  const day = entry.bindings.length
    ? dayFacts(entry.date, words, moment.causeId)
    : null;
  if (day) {
    const when = render("scene-when", words.when, day, `${moment.id}:when`);
    if (when) narration.push(when);
  }

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
    const names = present.map((row) => row.text);
    const joined =
      names.length === one
        ? names[zero]!
        : `${names.slice(zero, -one).join(", ")} ${words.and} ${names.at(-one)!}`;
    const line = render(
      "scene-present",
      words.present,
      {
        who: {
          text: joined,
          sourceRecordIds: present.flatMap((row) => row.sourceRecordIds),
        },
      },
      `${moment.id}:present`,
      present.length === one ? "one" : "many",
    );
    if (line) narration.push(line);
  }

  // What is happening and what led here, from the situation and the
  // moment's cause. Both are said of the same people, places and employer.
  const talkToId =
    opener?.personIds.find((id) => id !== personId) ??
    moment.counterpartIds.find((id) => binding.presentIds.includes(id));
  // Only someone the scene places in the room is named: not the person a
  // funeral is for.
  const other = talkToId ? who(talkToId) : null;
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = core.jobs.get(moment.causeId)
    ? core.organizations.get(core.jobs.get(moment.causeId)!.organizationId)
    : job
      ? core.organizations.get(job.organizationId)
      : undefined;
  const story: Record<string, Fact> = {};
  if (other) story.other = other;
  if (org)
    story.employer = {
      text: properName(org.name),
      sourceRecordIds: [org.id],
    };
  const town = place(person.placeId);
  if (town) story.place = town;

  const lead = words.leads.find((row) => row.typeKey === binding.typeKey);
  if (lead) {
    const line = render(
      `scene-lead:${lead.typeKey}`,
      lead.variants,
      story,
      `${moment.id}:lead`,
      other ? "other" : "alone",
    );
    if (line) narration.push(line);
  }

  const cause = words.causes.find((row) =>
    moment.label.startsWith(row.labelPrefix),
  );
  if (cause) {
    const line = render(
      `scene-cause:${cause.labelPrefix}`,
      cause.variants,
      story,
      `${moment.id}:cause`,
    );
    if (line) narration.push(line);
  }

  return {
    momentId: moment.id,
    typeKey: binding.typeKey,
    setting: binding.setting,
    presentIds: binding.presentIds,
    narration,
    paragraph: paragraphOf(narration),
    ...(talkToId ? { talkToId } : {}),
  };
}

/** The weekday and month of a date, as the "when" line's facts. */
export function dayFacts(
  date: string,
  words: Pick<SceneWords, "weekdays" | "months">,
  recordId: string,
): Record<string, Fact> | null {
  // An ISO date reads as midnight UTC.
  const day = new Date(date);
  const weekday = words.weekdays[day.getUTCDay()];
  const month = words.months[day.getUTCMonth()];
  if (!weekday || !month) return null;
  return {
    weekday: { text: weekday, sourceRecordIds: [recordId] },
    month: { text: month, sourceRecordIds: [recordId] },
  };
}

/** The narrator's lines as one paragraph, citing every record they cite. */
export function paragraphOf(lines: readonly SceneLine[]): SceneLine {
  return {
    text: lines.map((line) => line.text).join(" "),
    sourceRecordIds: [
      ...new Set(lines.flatMap((line) => line.sourceRecordIds)),
    ],
  };
}
