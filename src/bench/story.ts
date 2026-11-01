import { ageOnDate } from "../core2/kernel/dates";
import { composeScene } from "../director/scene";
import { purposeScene, replyInScene } from "../director/purpose-scene";
import type { SceneTalkLine, TreeNode } from "../director/scene-talk";
import { shipped } from "../english/scene-talk-words";
import { hasBackdrop } from "./backdrop-places";
import {
  homeOf,
  orgPlace,
  backdropFor,
  pictureFor,
  stagePeople,
  type StageReason,
} from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "../director/ledger";

const SETTINGS = scenePlaces.sceneSettings as Record<string, string[]>;
const SITUATIONS = scenePlaces.situationPlaces as Record<string, string[]>;
const SCHOOLS = scenePlaces.schoolPlacesByAge;

/** A line of a scene with a purpose, as the screen shows it. */
function shownLine(line: SceneTalkLine) {
  return {
    speaker: line.speaker,
    ...(line.speakerId ? { speakerId: line.speakerId } : {}),
    role: line.role,
    text: line.text,
    // The pieces that said it, so a grade in play reaches them.
    parts: line.parts,
    // A piece held until the owner grades it, shown only in the grading view.
    held: !line.parts.every(shipped),
  };
}
type ShownNode = {
  lines: ReturnType<typeof shownLine>[];
  replies: { line: ReturnType<typeof shownLine>; next: ShownNode | null }[];
  end?: { outcome: string; close?: ReturnType<typeof shownLine> };
};
function shownNode(node: TreeNode): ShownNode {
  return {
    lines: node.lines.map(shownLine),
    replies: node.replies.map((reply) => ({
      line: shownLine(reply.line),
      next: reply.next ? shownNode(reply.next) : null,
    })),
    ...(node.end
      ? {
          end: {
            outcome: node.end.outcome,
            ...(node.end.close ? { close: shownLine(node.end.close) } : {}),
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
  /** The grading view: a scene with a purpose may say lines still held. */
  options: { held?: boolean } = {},
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
  );
  if (!scene) throw new Error("This moment has no scene.");
  const person = core.people.get(personId)!;
  const age = ageOnDate(person.birthDate, core.date);
  const steps = [
    ...(SITUATIONS[`${scene.typeKey}:${scene.setting.kind}`] ?? []),
    ...(scene.setting.kind === "school"
      ? (SCHOOLS.find((row) => age < row.underAge)?.places ?? [])
      : []),
    ...(SETTINGS[scene.setting.kind] ?? ["@home"]),
  ];
  const place =
    steps
      .map((step) =>
        step === "@home"
          ? homeOf(core, personId, minuteOfDay)
          : step === "@org"
            ? orgPlace(core, scene.setting.recordId)
            : step,
      )
      .find((row): row is string => !!row && hasBackdrop(row)) ??
    homeOf(core, personId, minuteOfDay);
  // The town's own picture of that kind of place, at this hour's light.
  const pictured = pictureFor(
    core,
    place,
    scene.setting.recordId ?? scene.setting.kind,
    minuteOfDay,
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
  const cast = [
    personId,
    ...scene.presentIds.filter(
      (id) =>
        id !== personId &&
        core.people.get(id)?.alive &&
        // A speech heard is on the screen at home, not in the room.
        id !== scene.speech?.speakerId,
    ),
  ].map((id) => {
    const row = core.people.get(id)!;
    return {
      id,
      name: `${row.givenName} ${row.familyName}`,
      reason: reasonOf(id),
    };
  });
  const speaker = scene.speech
    ? core.people.get(scene.speech.speakerId)
    : undefined;
  const talk =
    purpose?.kind === "composed"
      ? {
          // The exchange the player's replies name: a scene, or one of the
          // bills the day's sitting took in.
          typeKey: purpose.scene.unit ?? purpose.scene.typeKey,
          purpose: purpose.scene.purpose,
          askerId: purpose.scene.askerId,
          opening: [
            ...(purpose.scene.talk.open ? [purpose.scene.talk.open] : []),
            purpose.scene.talk.state,
          ].map(shownLine),
          tree: shownNode(purpose.scene.talk.tree),
          // Why it is happening: the record that fired it and every fact said.
          why: { cause: purpose.scene.cause, facts: purpose.scene.facts },
        }
      : null;
  const backdrop = backdropFor(core, pictured, minuteOfDay, personId);
  return {
    momentId,
    place: pictured,
    backdrop,
    people: stagePeople(core, backdrop.file, cast).people,
    // One narrator: a scene with a purpose opens on its own narration, the
    // same voice that speaks between its lines; the situation's paragraph is
    // for a moment with no exchange (the plan of Oct 28, section 1: "Two
    // narrators per scene ... One narrator, the director's").
    narration:
      purpose?.kind === "composed" && purpose.scene.talk.narration.length
        ? purpose.scene.talk.narration.map((line) => ({
            text: line.text,
            parts: line.parts,
            held: !line.parts.every(shipped),
          }))
        : scene.narration,
    talkToId: scene.talkToId,
    // A speech heard plays in its speaker's own words, from its record.
    ...(scene.speech ? { speech: scene.speech } : {}),
    talk,
    ...(purpose?.kind === "skipped" ? { talkSkipped: purpose.reason } : {}),
    names: Object.fromEntries([
      ...cast.map((row) => [row.id, row.name]),
      ...(scene.speech && speaker
        ? [[speaker.id, `${speaker.givenName} ${speaker.familyName}`]]
        : []),
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
