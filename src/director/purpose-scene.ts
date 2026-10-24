/**
 * A scene with a purpose, as play meets it, fired by the records. The director
 * has already fired the moment from its cause record and cast it (scheduling.ts);
 * this reads that binding, takes the facts the exchange may say from the cause
 * record and the cast, and has the exchange engine (scene-talk.ts) word it as
 * a tree the player taps through. It words nothing itself, and it says why:
 * the cause record, its kind and date, and every fact with the records it
 * came from.
 */
import { P } from "../core2/parameters";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "./ledger";
import type { Fact } from "./render";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
} from "./scene-talk";
import { spoken } from "./words";

export interface PurposeScene {
  typeKey: string;
  purpose: string;
  askerId: PersonId;
  askedId: PersonId;
  /** Why it is happening: the record that fired it. */
  cause: {
    id: string;
    kind: string;
    label: string;
    date: string;
    facts: Readonly<Record<string, string>>;
  };
  /** What the exchange may say, each with the records it came from. */
  facts: { key: string; text: string; recordIds: string[] }[];
  talk: SceneTalk;
}

export type PurposeSceneResult =
  | { kind: "composed"; scene: PurposeScene }
  | { kind: "skipped"; reason: string };

const TYPES = new Map(
  SITUATION_LIBRARY.types.map((row) => [row.key, row as unknown]),
);

/**
 * The exchange for a scheduled moment whose situation type has a purpose, or
 * null when the moment has none. `includeHeld` is the grading view: it
 * composes from the lines held until the owner grades them, as the review
 * page does; play leaves it off, so a scene whose words are all held is
 * skipped with why.
 */
export function purposeScene(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  options: { includeHeld?: boolean } = {},
): PurposeSceneResult | null {
  const moment = director.ledger.people
    .get(personId)
    ?.momentsById.get(entry.momentId);
  if (!moment) return null;
  const binding = entry.bindings.find(
    (row) => (TYPES.get(row.typeKey) as PurposeType | undefined)?.purpose,
  );
  if (!binding) return null;
  const type = TYPES.get(binding.typeKey) as PurposeType;
  const cast = (role: string | undefined) =>
    binding.roles.find((row) => row.role === role)?.personIds[P.zero];
  const askerId = cast(type.asker);
  const askedId = cast(type.asked) ?? personId;
  if (!askerId)
    return { kind: "skipped", reason: `no ${type.asker} on record` };
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked)
    return { kind: "skipped", reason: "the cast is not on record" };

  const record = core.durableLog.get(moment.causeId);
  const said = (record?.facts ?? {}) as Readonly<Record<string, string>>;
  const facts: Record<string, Fact> = {
    name: {
      text: `${asker.givenName} ${asker.familyName}`,
      sourceRecordIds: [askerId],
    },
    first: { text: asked.givenName, sourceRecordIds: [askedId] },
  };
  const town = corePlaceByJurisdictionId(asked.placeId as never);
  if (town)
    facts.place = { text: spoken(town), sourceRecordIds: [asked.placeId] };
  if (said.office)
    facts.office = {
      text: said.office,
      sourceRecordIds: [
        moment.causeId,
        ...(said.contestId ? [said.contestId] : []),
      ],
    };
  // In a race the asked lost, the winner is the opponent the scene may name.
  const winner = said.winnerId
    ? core.people.get(said.winnerId as PersonId)
    : undefined;
  if (winner && winner.id !== askedId)
    facts.opponent = {
      text: `${winner.givenName} ${winner.familyName}`,
      sourceRecordIds: [moment.causeId, winner.id],
    };

  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId },
    type,
    facts,
    {},
    options.includeHeld ? { includeHeld: true } : {},
  );
  if (result.kind !== "composed") return result;
  return {
    kind: "composed",
    scene: {
      typeKey: binding.typeKey,
      purpose: result.talk.purpose,
      askerId,
      askedId,
      cause: {
        id: moment.causeId,
        kind: moment.causeKind,
        label: moment.label,
        date: moment.date,
        facts: said,
      },
      facts: Object.entries(facts).map(([key, fact]) => ({
        key,
        text: fact.text,
        recordIds: [...fact.sourceRecordIds],
      })),
      talk: result.talk,
    },
  };
}
