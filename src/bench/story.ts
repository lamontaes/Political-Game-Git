import { ageOnDate } from "../core2/kernel/dates";
import { composeScene } from "../director/scene";
import { purposeScene, replyInScene } from "../director/purpose-scene";
import {
  playedNode,
  type SceneTalkLine,
  type TreeNode,
} from "../director/scene-talk";
import { dateSaid } from "../english/day-words";
import { shipped, wordPiece, type Fact } from "../english/scene-talk-words";
import { bodyPicture } from "./legislature";
import { officeWords } from "../english/said-as";
import { scenePicture } from "./scene-picture";
import { addressMontage, namedInParts, partLevels } from "./montage";
import { backdropFor, peopleHere, type StageReason } from "./scene";
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "../director/ledger";

/**
 * Dev mode's "why this reply": the scene's facts with the records each cites,
 * read once per scene, so a line's placing names its records.
 */
interface WhyPlaced {
  facts: ReadonlyMap<string, { text: string; recordIds: readonly string[] }>;
  seed: string;
  momentKey: string;
}

/** Why the English engine placed a line (scene-talk-words.ts `Placed`), by record. */
function placedShown(line: SceneTalkLine, why: WhyPlaced) {
  const placed = line.placed;
  if (!placed) return undefined;
  const cited = (key: string) => ({
    key,
    recordIds: [...(why.facts.get(key)?.recordIds ?? [])],
  });
  const facts: Record<string, Fact> = Object.fromEntries(
    [...why.facts].map(([key, row]) => [
      key,
      { text: row.text, sourceRecordIds: [...row.recordIds] },
    ]),
  );
  return {
    needs: [...placed.needs, ...placed.onlyWhen].map(cited),
    rulesOut: [...placed.rulesOut],
    ...(placed.after ? { after: placed.after } : {}),
    ties: placed.ties.map((key) => ({
      key,
      text:
        wordPiece({
          key,
          facts,
          seed: why.seed,
          speakerId: line.speakerId ?? "",
          momentKey: why.momentKey,
        }) ?? key,
    })),
  };
}

/** A line of a scene with a purpose, as the screen shows it. */
function shownLine(line: SceneTalkLine, why?: WhyPlaced) {
  const placed = why && placedShown(line, why);
  return {
    speaker: line.speaker,
    ...(line.speakerId ? { speakerId: line.speakerId } : {}),
    role: line.role,
    text: line.text,
    // The pieces that said it, so a grade in play reaches them.
    parts: line.parts,
    // A piece held until the owner grades it, shown only in the grading view.
    held: !line.parts.every(shipped),
    // Dev mode only: why this wording was placed here.
    ...(placed ? { placed } : {}),
  };
}
type ShownNode = {
  lines: ReturnType<typeof shownLine>[];
  replies: { line: ReturnType<typeof shownLine>; next: ShownNode | null }[];
  end?: { outcome: string; close?: ReturnType<typeof shownLine> };
};
function shownNode(branched: TreeNode, why?: WhyPlaced): ShownNode {
  // After a lie, the outcome the records give (caught or believed).
  const node = playedNode(branched);
  const shown = (line: SceneTalkLine) => shownLine(line, why);
  return {
    lines: node.lines.map(shown),
    replies: node.replies.map((reply) => ({
      line: shown(reply.line),
      next: reply.next ? shownNode(reply.next, why) : null,
    })),
    ...(node.end
      ? {
          end: {
            outcome: node.end.outcome,
            ...(node.end.close ? { close: shown(node.end.close) } : {}),
          },
        }
      : {}),
  };
}

/** How the stage shows a person the director cast, by the role's fill that cast them. */
const STAGE_REASON: Readonly<Record<string, StageReason>> = {
  subject: "you",
  household: "household",
  "household-stake": "household",
  authority: "household",
  coworkers: "coworker",
  "former-coworkers": "coworker",
};

/** A big moment, staged: its setting's picture, the people there, the narration. */
export function storyScene(
  core: CoreState,
  director: Director,
  personId: string,
  momentId: string,
  minuteOfDay: number,
  /**
   * The grading view: a scene with a purpose may say lines still held. Dev
   * mode: each line says why it was placed (`placed`).
   */
  options: { held?: boolean; dev?: boolean } = {},
) {
  const book = director.ledger.people.get(personId);
  const entry = book?.schedule.find((row) => row.momentId === momentId);
  if (!entry) throw new Error("No scheduled moment with that id.");
  // A scene with a purpose plays as its exchange: the asker's open and
  // statement, the replies the player taps, the answers, to its close. Its
  // situation is the one staged (a filing's household at home, not the clerk).
  const purpose = purposeScene(core, director, personId as PersonId, entry, {
    ...(options.held ? { includeHeld: true } : {}),
    next: true,
  });
  const lead =
    purpose?.kind === "composed"
      ? entry.bindings.find((row) => row.typeKey === purpose.scene.typeKey)
      : undefined;
  const scene = composeScene(
    core,
    director,
    personId,
    lead
      ? {
          ...entry,
          bindings: [lead, ...entry.bindings.filter((row) => row !== lead)],
        }
      : entry,
    undefined,
    minuteOfDay,
  );
  if (!scene) throw new Error("This moment has no scene.");
  const person = core.people.get(personId)!;
  const age = ageOnDate(person.birthDate, core.date);
  // A scene in a body's chamber shows that body's own room, as the body
  // scene does (agreements/3-4.md).
  const chamber =
    scene.setting.kind === "chamber" && scene.setting.recordId
      ? bodyPicture(core, personId, scene.setting.recordId)
      : null;
  const variant =
    purpose?.kind === "composed" ? purpose.scene.variant?.purpose : undefined;
  const pictured = scenePicture(
    core,
    personId,
    {
      typeKey: scene.typeKey,
      variant,
      setting: scene.setting.kind,
      seat: scene.setting.seat,
      recordId: scene.setting.recordId,
      presentIds: scene.presentIds,
      age,
    },
    minuteOfDay,
    chamber,
  );
  // Who stands in the room is the director's cast, each for the reason the
  // director recorded (the role that cast them); this view decides no one
  // (the plan of Oct 28, section 3: "One cast, decided once, in the director").
  const reasonOf = (id: string): StageReason => {
    if (id === personId) return "you";
    const fill = scene.presentReasons[id as PersonId] ?? "";
    // Whoever is at a place: the household at home, coworkers at work.
    if (fill === "present")
      return scene.setting.kind === "workplace" ? "coworker" : "household";
    return STAGE_REASON[fill] ?? "moment";
  };
  const speaker = scene.speech
    ? core.people.get(scene.speech.speakerId)
    : undefined;
  // A speaker of an address is named by their office first ("Governor Lori
  // Lopez", "Chair Sara Mullen"), from the record's said-as office key.
  const speakerTitle = officeWords(scene.speech?.office)?.before;
  const speakerName = speaker
    ? `${speakerTitle ? `${speakerTitle} ` : ""}${speaker.givenName} ${speaker.familyName}`
    : "";
  const cast = [
    personId,
    ...scene.presentIds.filter(
      (id) =>
        id !== personId &&
        core.people.get(id)?.alive &&
        // An address heard is on the screen at home, not in the room: the
        // narrator says how it was heard; a floor or stump speech is given
        // by someone standing in it.
        (id !== scene.speech?.speakerId || scene.speech.inRoom),
    ),
  ].map((id) => {
    const row = core.people.get(id)!;
    return {
      id,
      name:
        id === speaker?.id ? speakerName : `${row.givenName} ${row.familyName}`,
      reason: reasonOf(id),
    };
  });
  const why: WhyPlaced | undefined =
    options.dev && purpose?.kind === "composed"
      ? {
          facts: new Map(
            purpose.scene.facts.map((row) => [
              row.key,
              { text: row.text, recordIds: row.recordIds },
            ]),
          ),
          seed: core.seed,
          momentKey: momentId,
        }
      : undefined;
  const talk =
    purpose?.kind === "composed"
      ? {
          // The exchange the player's replies name: a scene, or one of the
          // bills the day's sitting took in.
          typeKey: purpose.scene.unit ?? purpose.scene.typeKey,
          purpose: purpose.scene.purpose,
          askerId: purpose.scene.askerId,
          // A floor speech the scene plays is the speaker's opening line,
          // so the exchange after it opens on the player's reply.
          opening: [
            ...(purpose.scene.talk.open ? [purpose.scene.talk.open] : []),
            ...(scene.speech?.opens ? [] : [purpose.scene.talk.state]),
          ].map((line) => shownLine(line, why)),
          tree: shownNode(purpose.scene.talk.tree, why),
          // Why it is happening: the record that fired it and every fact said.
          why: { cause: purpose.scene.cause, facts: purpose.scene.facts },
        }
      : null;
  const backdrop = backdropFor(core, pictured, minuteOfDay, personId);
  const apart =
    scene.setting.kind === "phone" || scene.setting.kind === "letter";
  return {
    momentId,
    place: pictured,
    backdrop,
    // A call or a letter is between two people who are not in one room: the
    // one who rings or writes is heard or read, never staged standing beside
    // the player (owner, Nov 16, N16-44). They stay in `names` for their lines.
    // `apart` tells the talk box too, which would otherwise stand the caller on
    // its strip by their card's face.
    apart,
    people: peopleHere(
      core,
      backdrop.file,
      apart ? cast.filter((row) => row.id === personId) : cast,
    ).people,
    // One narrator: a scene with a purpose opens on its own narration, the
    // same voice that speaks between its lines; the situation's paragraph is
    // for a moment with no exchange (the plan of Oct 28, section 1: "Two
    // narrators per scene ... One narrator, the director's").
    // Every scene's first line names the day, the place and the person
    // (owner, Nov 8): a purpose's own setup that already names the day
    // (the filing counter) keeps its own.
    narration:
      purpose?.kind === "composed" && purpose.scene.talk.narration.length
        ? [
            ...(scene.arrival &&
            !purpose.scene.talk.narration.some((line) =>
              line.text.includes(dateSaid(core.date)),
            )
              ? [
                  {
                    text: scene.arrival.text,
                    parts: scene.arrival.parts ?? [],
                    held: false,
                  },
                ]
              : []),
            ...purpose.scene.talk.narration.map((line) => ({
              text: line.text,
              parts: line.parts,
              held: !line.parts.every(shipped),
            })),
          ]
        : scene.narration,
    talkToId: scene.talkToId,
    // A speech heard plays in its speaker's own words, from its record.
    ...(scene.speech ? { speech: scene.speech } : {}),
    // The address plays as a montage: one picture and cast per part (owner,
    // Oct 29 02:35).
    ...(scene.speech?.montage
      ? {
          beats: addressMontage(
            core,
            personId,
            scene.speech.speakerId,
            partLevels(
              director.ledger.opening?.address.sentences ?? [],
              scene.speech.parts?.length || 1,
            ),
            minuteOfDay,
            namedInParts(
              core,
              director.ledger.opening?.address.sentences ?? [],
              scene.speech.parts?.length || 1,
              scene.speech.speakerId,
            ),
          ),
        }
      : {}),
    talk,
    ...(purpose?.kind === "skipped" ? { talkSkipped: purpose.reason } : {}),
    names: Object.fromEntries([
      ...cast.map((row) => [row.id, row.name]),
      ...(scene.speech && speaker ? [[speaker.id, speakerName]] : []),
    ]),
  };
}

/**
 * The reply the player chose in a scene with a purpose, by its path through
 * the tree: the game keeps it as a record the core's own writer reads.
 */
export function storyReply(
  core: CoreState,
  director: Director,
  personId: string,
  momentId: string,
  path: readonly number[],
  options: { held?: boolean; typeKey?: string } = {},
) {
  const entry = director.ledger.people
    .get(personId)
    ?.schedule.find((row) => row.momentId === momentId);
  if (!entry) throw new Error("No scheduled moment with that id.");
  const recordId = replyInScene(
    core,
    director,
    personId as PersonId,
    entry,
    path,
    {
      ...(options.held ? { includeHeld: true } : {}),
      // The scene the reply was said in, so the next one of the moment
      // does not take its place partway through.
      ...(options.typeKey ? { typeKey: options.typeKey } : {}),
    },
  );
  if (!recordId) throw new Error("Not a reply the scene offers.");
  return { recordId };
}
