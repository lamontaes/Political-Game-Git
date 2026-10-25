import { composeScene } from "../director/scene";
import { purposeScene, replyInScene } from "../director/purpose-scene";
import type { SceneTalkLine, TreeNode } from "../director/scene-talk";
import { shipped } from "../english/scene-talk-words";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  backdropFile,
  homeOf,
  orgPlace,
  stagePeople,
  type StageReason,
} from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "../director/ledger";

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);
const SETTINGS = scenePlaces.sceneSettings as Record<string, string[]>;
const SITUATIONS = scenePlaces.situationPlaces as Record<string, string[]>;
const SCHOOLS = scenePlaces.schoolPlacesByAge;

/** Whole years of age on a date. */
function ageOn(birthDate: string, date: string): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

/** A line of a scene with a purpose, as the screen shows it. */
function shownLine(line: SceneTalkLine) {
  return {
    speaker: line.speaker,
    ...(line.speakerId ? { speakerId: line.speakerId } : {}),
    role: line.role,
    text: line.text,
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
  const purpose = purposeScene(
    core,
    director,
    personId as PersonId,
    entry,
    options.held ? { includeHeld: true } : {},
  );
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
  const age = ageOn(person.birthDate, core.date);
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
      .find((row): row is string => !!row && PICTURED.has(row)) ??
    homeOf(core, personId, minuteOfDay);
  // Who stands in the room needs a reason on record (owner, Oct 24): the
  // people the moment is about (who opened it, whom it names, who asks), and
  // at home the household who live there. Anyone else the situation listed
  // is not drawn.
  const moment = book?.momentsById.get(momentId);
  const about = new Set<string>([
    ...(moment?.counterpartIds ?? []),
    ...(scene.talkToId ? [scene.talkToId] : []),
    ...(purpose?.kind === "composed" ? [purpose.scene.askerId] : []),
  ]);
  const household = new Set(
    scene.setting.kind === "home"
      ? (core.households.get(core.people.get(personId)!.householdId)
          ?.memberIds ?? [])
      : [],
  );
  const reasonOf = (id: string): StageReason | null =>
    id === personId
      ? "you"
      : about.has(id)
        ? "moment"
        : household.has(id)
          ? "household"
          : null;
  const cast = [
    personId,
    ...scene.presentIds.filter(
      (id) => id !== personId && core.people.get(id)?.alive,
    ),
  ].flatMap((id) => {
    const reason = reasonOf(id);
    const row = core.people.get(id)!;
    return reason
      ? [{ id, name: `${row.givenName} ${row.familyName}`, reason }]
      : [];
  });
  const talk =
    purpose?.kind === "composed"
      ? {
          typeKey: purpose.scene.typeKey,
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
  return {
    momentId,
    place,
    backdrop: backdropFile(place, minuteOfDay),
    people: stagePeople(core, place, cast).people,
    narration: [
      ...scene.narration,
      ...(purpose?.kind === "composed"
        ? purpose.scene.talk.narration.map((line) => ({
            text: line.text,
            held: !line.parts.every(shipped),
          }))
        : []),
    ],
    talkToId: scene.talkToId,
    talk,
    ...(purpose?.kind === "skipped" ? { talkSkipped: purpose.reason } : {}),
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
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
  options: { held?: boolean } = {},
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
    options.held ? { includeHeld: true } : {},
  );
  if (!recordId) throw new Error("Not a reply the scene offers.");
  return { recordId };
}
