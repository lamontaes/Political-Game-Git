import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { playerClockFrontierV1 } from "../core2/player-stops-v1";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import rules from "./data/scene-talk-rules.json" with { type: "json" };
import type { Director } from "./ledger";
import { purposeScene, type PurposeScene } from "./purpose-scene";
import type { SceneTalkLine, TreeNode } from "./scene-talk";

// A scene says what hour it is only when its own hour makes it true
// (words-scene-time-of-day-words). A sitting member of a body with other
// members is played day by day to each evening, as the bench plays them; each
// scene with a purpose is composed at its stop and again that evening, as a
// scene left waiting is opened later, both at the player's clock. Its
// marks follow the clock (morning or afternoon in the daytime, else the
// evening), and no line anywhere in its tree is a piece held back at that
// hour: no "Thanks for your time tonight." at ten in the morning, no "I'm
// vetoing it this afternoon." after five, no "Morning." after noon.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 3;
const MIN_DAYS = 60;
const MAX_DAYS = 240;
const AFTERNOON = rules.timeOfDay.afternoonFromMinute.value;
const EVENING = rules.timeOfDay.eveningFromMinute.value;
/** How far into the evening each day is played: an hour. */
const LATER = 60;
const MARKS = ["morning", "afternoon", "daytime", "evening"];

/** Each piece's key and the marks it is held back at. */
const HELD = new Map(
  (
    sceneTalkBank.parts as {
      key: string;
      text: string;
      uses: { excludesFacts?: string[] }[];
    }[]
  ).map((part) => [
    part.key,
    {
      text: part.text,
      marks: MARKS.filter((mark) =>
        part.uses.every((use) => use.excludesFacts?.includes(mark)),
      ),
    },
  ]),
);

/** A sitting member of a body with other members, a full person in town, or null. */
function localMember(core: CoreState): PersonId | null {
  const api = coreAPI(core);
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const town = core.people.get(core.playerId!)?.placeId;
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[];
  const local = terms
    .filter((term) => {
      const person = core.people.get(term.personId as PersonId);
      return (
        person?.alive === true &&
        person.placeId === town &&
        members(api, term.officeId).length > 1
      );
    })
    .sort(
      (a, b) =>
        a.officeId.localeCompare(b.officeId) || a.id.localeCompare(b.id),
    );
  return (local[0]?.personId as PersonId | undefined) ?? null;
}

/** Every line a scene can say: the setup, the whole tree and the close. */
function everyLine(scene: PurposeScene): SceneTalkLine[] {
  const walk = (node: TreeNode): SceneTalkLine[] => [
    ...node.lines,
    ...(node.end?.close ? [node.end.close] : []),
    ...node.replies.flatMap((reply) => [
      reply.line,
      ...(reply.next ? walk(reply.next) : []),
    ]),
    ...(node.branches ?? []).flatMap((branch) => walk(branch.node)),
  ];
  const talk = scene.talk;
  return [
    ...talk.narration,
    ...(talk.open ? [talk.open] : []),
    ...talk.intro,
    talk.state,
    ...walk(talk.tree),
    ...(talk.close ? [talk.close] : []),
  ];
}

interface Seen {
  minute: number;
  typeKey: string;
  causeId: string;
  marks: string[];
  lines: number;
  /** A line held back in the daytime that the scene may say, if one fits. */
  evening?: string;
}

/** Composes every scene with a purpose at a stop, at the player's clock. */
function scenesAtStop(
  core: CoreState,
  director: Director,
  personId: PersonId,
  recordIds: readonly string[],
  where: string,
): Seen[] {
  const book = director.ledger.people.get(personId);
  const now = playerClockFrontierV1(core, personId);
  if (!book || !now || now.date !== core.date) return [];
  const seen: Seen[] = [];
  for (const recordId of recordIds) {
    const entry = book.schedule.find((row) => row.momentId === recordId);
    if (!entry) continue;
    const result = purposeScene(core, director, personId, entry);
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    const marks = scene.facts
      .map((fact) => fact.key)
      .filter((key) => MARKS.includes(key))
      .sort();
    const at = `${where}, ${core.date} minute ${now.minuteOfDay}, ${scene.typeKey} from ${scene.cause.id}`;
    const want =
      now.minuteOfDay >= EVENING
        ? ["evening"]
        : now.minuteOfDay >= AFTERNOON
          ? ["afternoon", "daytime"]
          : ["daytime", "morning"];
    expect(marks, `${at}: the marks follow the clock`).toEqual(want);
    const lines = everyLine(scene);
    const evening = lines.find((line) =>
      line.parts.some((key) => HELD.get(key)?.marks.includes("daytime")),
    );
    for (const line of lines)
      for (const key of line.parts) {
        const held = HELD.get(key);
        const wrong = held?.marks.filter((mark) => marks.includes(mark));
        expect(
          wrong ?? [],
          `${at}: "${line.text}" (${key}) is held back at this hour`,
        ).toEqual([]);
      }
    seen.push({
      minute: now.minuteOfDay,
      typeKey: scene.typeKey,
      causeId: scene.cause.id,
      marks,
      lines: lines.length,
      ...(evening ? { evening: evening.text } : {}),
    });
  }
  return seen;
}

it(`a scene says what hour it is only when its own hour makes it true (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `time-of-day:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const personId = localMember(core);
    if (!personId) {
      tried.push(`${where}: no sitting member who is a full person`);
      continue;
    }
    core.focusPersonIds.add(personId);
    director.watch(core, personId);
    const seen: Seen[] = [];
    const start = makeIsoDate(core.date);
    // Each day is played to its evening. A scene is checked at its stop, and
    // the day's scenes are opened again that evening, as a scene left waiting
    // is opened later in the day.
    for (
      let day = P.zero;
      day < MAX_DAYS &&
      (day < MIN_DAYS ||
        !(
          seen.some((row) => row.marks.includes("evening")) &&
          seen.some((row) => row.marks.includes("daytime"))
        ));
      day += P.one
    ) {
      const today: string[] = [];
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: { date: addDays(start, day), minuteOfDay: EVENING + LATER },
      });
      while (packet.kind !== "complete") {
        if (packet.kind === "stop") {
          const ids = packet.stop.modules.map((stop) => stop.recordId);
          today.push(...ids);
          seen.push(...scenesAtStop(core, director, personId, ids, where));
          packet = resumePlayerV1(core, {
            kind: "stop",
            pauseId: packet.pauseId,
          });
        } else
          packet = resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[P.zero]!.offerId,
          });
      }
      seen.push(...scenesAtStop(core, director, personId, today, where));
    }
    const evening = seen.filter((row) => row.marks.includes("evening"));
    const daytime = seen.filter((row) => row.marks.includes("daytime"));
    if (!seen.length) {
      tried.push(`${where}: no scene with a purpose at a stop`);
      continue;
    }
    const show = (row: Seen) =>
      `${row.typeKey} at minute ${row.minute} from ${row.causeId} (${row.lines} lines${row.evening ? `, among them "${row.evening}"` : ""})`;
    const said = evening.find((row) => row.evening);
    process.stdout.write(
      `TIME-OF-DAY ${where}${tried.length ? ` after ${tried.join("; ")}` : ""}: ${seen.length} scene(s) checked, ${daytime.length} in the daytime, ${evening.length} in the evening; first daytime ${daytime[0] ? show(daytime[0]) : "none"}; first evening ${evening[0] ? show(evening[0]) : "none"}; first evening line said ${said ? show(said) : "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place played a scene with a purpose for a sitting member: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
