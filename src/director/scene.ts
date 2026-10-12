/**
 * Scenes on the new core (M4-03): when the director stages a moment, the
 * scene is built from blocks, not written: where you are (the setting's
 * record), who is there (the binding's present people), and what led here
 * (the moment's cause), narrated in second person by the English engine.
 * The scene then hands off to a conversation with the person who opens it.
 */
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishKnowledge,
  type GroundedEnglishPacket,
} from "../presentation/grounded-english";
import sceneJson from "./data/scene-words.json" with { type: "json" };
import { JOURNAL_DATA } from "./journal";
import type { Director } from "./ledger";
import type { SceneBinding, ScheduleEntry } from "./scheduling";
import { directorStopgap } from "./stopgaps";
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
  stopgapId: string;
  and: string;
  settings: Readonly<Record<string, Variant[]>>;
  present: Variant[];
  causes: readonly { labelPrefix: string; variants: Variant[] }[];
}
export const SCENE_WORDS = sceneJson as SceneWords;

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
  narration: SceneLine[];
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
  const binding: SceneBinding | undefined = entry.bindings[zero];
  const book = director.ledger.people.get(personId);
  const moment = book?.momentsById.get(entry.momentId);
  const person = core.people.get(personId);
  if (!binding || !moment || !person) return null;
  directorStopgap(words.stopgapId, director.ledger.stopgapHits);

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
    const row = lifePlaceByJurisdictionId(id as never);
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

  // Who is there.
  const present = binding.presentIds
    .filter((id) => id !== personId && core.people.get(id)?.alive)
    .map(who)
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
    );
    if (line) narration.push(line);
  }

  const opener = binding.roles.find((row) => row.role === binding.opener);
  const talkToId =
    opener?.personIds.find((id) => id !== personId) ??
    moment.counterpartIds.find((id) => binding.presentIds.includes(id));
  return {
    momentId: moment.id,
    typeKey: binding.typeKey,
    setting: binding.setting,
    presentIds: binding.presentIds,
    narration,
    ...(talkToId ? { talkToId } : {}),
  };
}
