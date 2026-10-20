import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import { remarksOn } from "../core2/modules/meetings";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { votesOf } from "../core2/modules/record";
import { wordVenueSpeech } from "../english/venue-speech";
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
  settings: Readonly<Record<string, Variant[]>>;
  present: Variant[];
  /** The day, as the narrator opens: "It's a Tuesday in March." */
  frame: Variant[];
  /** What is happening, by the staged situation's type. */
  leads: readonly { typeKey: string; variants: Variant[] }[];
  causes: readonly { labelPrefix: string; variants: Variant[] }[];
}
/** `data/scene-rows.json`: the scene's structure, holding no sentences. */
export interface SceneRows {
  version: string;
  and: string;
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
   * The narrator's opening: one short paragraph (the day, the setting, who is
   * there, what led here), then the characters play the scene out.
   */
  narration: SceneLine[];
  /** The person who opens the scene and whom the conversation is with. */
  talkToId?: PersonId;
  /**
   * What the speaker says at a public hearing, in the register of public
   * comment, from the remark the record holds for them (their question and
   * which way they spoke).
   */
  speech?: SceneLine & { speakerId: PersonId };
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
  const sentences: SceneLine[] = [];
  const dayAt = new Date(`${moment.date}T00:00:00Z`);
  const frame = render(
    "scene-frame",
    words.frame,
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
    `scene-setting:${kind}`,
    words.settings[kind],
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
    if (line) sentences.push(line);
  }

  // What is happening, from the staged situation's type. It names only
  // someone the scene places in the room: not the person a funeral is for.
  const talkToId =
    opener?.personIds.find((id) => id !== personId) ??
    moment.counterpartIds.find((id) => binding.presentIds.includes(id));
  const lead = words.leads.find((row) => row.typeKey === binding.typeKey);
  if (lead) {
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
    const line = render(
      `scene-lead:${lead.typeKey}`,
      lead.variants,
      facts,
      `${moment.id}:lead`,
      other ? "other" : "alone",
    );
    if (line) sentences.push(line);
  }

  // What led here, from the moment's cause.
  const cause = words.causes.find((row) =>
    moment.label.startsWith(row.labelPrefix),
  );
  if (cause) {
    const facts: Record<string, Fact> = {};
    const otherId = moment.counterpartIds[zero];
    const other = otherId ? who(otherId) : null;
    if (other) facts.other = other;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    const org = core.jobs.get(moment.causeId)
      ? core.organizations.get(core.jobs.get(moment.causeId)!.organizationId)
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
    const line = render(
      `scene-cause:${cause.labelPrefix}`,
      cause.variants,
      facts,
      `${moment.id}:cause`,
      moment.counterpartIds.length ? "other" : "self",
    );
    if (line) sentences.push(line);
  }

  // The sentences are one paragraph, so the narrator sets the scene before
  // anyone speaks (owner, Oct 15: two short lines do not set a scene).
  const narration: SceneLine[] = sentences.length
    ? [
        {
          text: sentences.map((line) => line.text).join(" "),
          sourceRecordIds: [
            ...new Set(sentences.flatMap((line) => line.sourceRecordIds)),
          ],
        },
      ]
    : [];
  // At a public hearing the speaker says their piece: the remark the record
  // holds for them, worded in the register of public comment.
  let speech: Scene["speech"];
  if (binding.typeKey === "public-hearing") {
    const speakerId = binding.roles.find((row) => row.role === "speaker")
      ?.personIds[zero];
    const billId = core.durableLog.get(moment.causeId)?.facts?.billId;
    const api = coreAPI(core as CoreState);
    const remark =
      speakerId && billId
        ? remarksOn(api, billId).find((row) => row.personId === speakerId)
        : undefined;
    const said = remark
      ? wordVenueSpeech(api, {
          speakerId: remark.personId,
          venue: "public-comment",
          question: remark.question,
          position: remark.position,
          recordIds: [remark.id, billId!],
        })
      : null;
    if (said && speakerId)
      speech = {
        text: said.text,
        sourceRecordIds: said.sourceRecordIds,
        speakerId,
      };
  }
  // A floor vote: the member says their piece in the register of their
  // chamber, on the question and the way they voted, from their own vote
  // record. A body with no floor register (a town council) says nothing here.
  if (binding.typeKey === "floor-vote") {
    const speakerId = binding.roles.find((row) => row.role === "member")
      ?.personIds[zero];
    const facts = core.durableLog.get(moment.causeId)?.facts;
    const api = coreAPI(core as CoreState);
    const office = facts?.chamber
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(facts.chamber) as { kind?: string } | undefined)
      : undefined;
    const venue =
      office?.kind === "us-house"
        ? "house-floor"
        : office?.kind === "us-senate"
          ? "senate-floor"
          : office?.kind?.startsWith("legislature-")
            ? "state-floor"
            : undefined;
    const vote =
      speakerId && facts?.number
        ? votesOf(api, speakerId).find(
            (row) =>
              row.measureId === facts.number && row.body === facts.chamber,
          )
        : undefined;
    const said =
      speakerId && venue && vote
        ? wordVenueSpeech(api, {
            speakerId,
            venue,
            question: vote.stance.question,
            position: vote.stance.position,
            recordIds: [vote.id, moment.causeId],
          })
        : null;
    if (said && speakerId)
      speech = {
        text: said.text,
        sourceRecordIds: said.sourceRecordIds,
        speakerId,
      };
  }
  // The night of the count: the winner claims it and the loser concedes, in
  // the words of those registers, citing the election's result record.
  if (binding.typeKey === "race-won" || binding.typeKey === "race-lost") {
    const speakerId = binding.roles.find((row) => row.role === "candidate")
      ?.personIds[zero];
    const winnerId = core.durableLog.get(moment.causeId)?.facts?.winnerId;
    const api = coreAPI(core as CoreState);
    const said = speakerId
      ? wordVenueSpeech(api, {
          speakerId,
          venue: binding.typeKey === "race-won" ? "victory" : "concession",
          recordIds: [moment.causeId],
          ...(binding.typeKey === "race-lost" &&
          winnerId &&
          core.people.has(winnerId as PersonId)
            ? { opponentId: winnerId }
            : {}),
        })
      : null;
    if (said && speakerId)
      speech = {
        text: said.text,
        sourceRecordIds: said.sourceRecordIds,
        speakerId,
      };
  }
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
