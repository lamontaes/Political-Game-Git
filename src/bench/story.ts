import { composeScene } from "../director/scene";
import { purposeScene } from "../director/purpose-scene";
import {
  shipped,
  type SceneTalkLine,
  type TreeNode,
} from "../director/scene-talk";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, homeOf, orgPlace, stagePeople } from "./scene";
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
  const ids = [
    personId,
    ...scene.presentIds.filter(
      (id) => id !== personId && core.people.get(id)?.alive,
    ),
  ];
  const cast = ids.map((id) => {
    const row = core.people.get(id)!;
    return { id, name: `${row.givenName} ${row.familyName}` };
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
