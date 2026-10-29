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
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import type { Director } from "./ledger";
import type { Moment } from "./types";
import { purposeScene, replyInScene, typeForCause } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";

// A word in the hallway (situation type `hallway`, purpose `hallway-word`).
// The three causes that fire it, each with its own key so the speaker comes
// for a reason of their own: a colleague after a sitting
// (circumstance:meeting-colleague), a reporter after a sitting
// (circumstance:meeting-reporter) and a lobbyist who made a group's case to
// the member (circumstance:lobbyist-hallway). A sitting member of a body is
// played through a year in a drawn place, as the bench plays it; every
// hallway scene that year is composed from its cause record. The scene's
// four root replies are four different moves, the same speaker says the same
// thing twice and opposite speakers say it differently, the reply is written
// back as a record, and each of the three keys is composed with the cast the
// year found.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 6;
const DAYS = 365;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "hallway",
) as unknown as PurposeType;
const LABELS: Readonly<Record<string, string>> = {
  "colleague-word": "circumstance:meeting-colleague",
  "reporter-word": "circumstance:meeting-reporter",
  "lobbyist-word": "circumstance:lobbyist-hallway",
};
const PROFILE = [
  "personality-v1:facet-friendly",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-hostile",
  "personality-v1:facet-persistent",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-sensitive",
];

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

/**
 * Plays the member's year as the bench plays it. The first hallway moment is
 * handed to `onHallway` at its stop, while the director still holds it; every
 * one is counted. Returns the count.
 */
function hallways(
  core: CoreState,
  director: Director,
  personId: PersonId,
  onHallway: (entry: ScheduleEntry, moment: Moment) => void,
): number {
  core.focusPersonIds.add(personId);
  director.watch(core, personId);
  const book = director.ledger.people.get(personId)!;
  let found = P.zero;
  const open = (momentId: string) => {
    const entry = book.schedule.find((row) => row.momentId === momentId);
    const moment = book.momentsById.get(momentId);
    if (
      entry &&
      moment &&
      entry.bindings.some((row) => row.typeKey === "hallway")
    ) {
      if (!found) onHallway(entry, moment);
      found += P.one;
    }
  };
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: {
      date: addDays(makeIsoDate(core.date), DAYS),
      minuteOfDay: P.zero,
    },
  });
  while (packet.kind !== "complete") {
    if (packet.kind === "stop") {
      for (const stop of packet.stop.modules) {
        open(stop.recordId);
      }
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    } else
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[P.zero]!.offerId,
      });
  }
  return found;
}

it(`a word in the hallway has a purpose, a reason of its own for each cause and a reply that is kept (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `hallway:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const personId = localMember(core);
    if (!personId) {
      tried.push(`${where}: no sitting member who is a full person`);
      continue;
    }
    let summary = "";
    const count = hallways(core, director, personId, (entry, moment) => {
      summary = check(where, core, director, personId, entry, moment);
    });
    if (!count) {
      tried.push(`${where}: no hallway scene in the year`);
      continue;
    }
    process.stdout.write(
      `HALLWAY ${where}${tried.length ? ` after ${tried.join("; ")}` : ""}: ${count} hallway scene(s) in the year, the first ${summary}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a hallway scene for a sitting member: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);

/** Checks one hallway scene at its stop and returns what to log about it. */
function check(
  where: string,
  core: CoreState,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  moment: Moment,
): string {
  {
    const record = core.durableLog.get(moment.causeId);
    expect(record, `${where}: the cause record`).toBeTruthy();
    expect(Object.values(LABELS), where).toContain(moment.label);
    const sceneKey = Object.entries(LABELS).find(
      ([, label]) => label === moment.label,
    )![0];

    const result = purposeScene(core, director, personId, entry, {
      typeKey: "hallway",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return "";
    const { scene } = result;
    expect(scene.purpose, where).toBe("hallway-word");
    expect(scene.cause.id, where).toBe(moment.causeId);
    expect(scene.askerId, where).not.toBe(personId);
    expect(
      scene.talk.lines.every((row) => row.key === sceneKey),
      `${where}: every line carries ${sceneKey}`,
    ).toBe(true);

    // Every line is plain words: no id, kind, ISO date, raw number or slot.
    const walk = (node: typeof scene.talk.tree): { text: string }[] => [
      ...node.lines,
      ...(node.end?.close ? [node.end.close] : []),
      ...node.replies.flatMap((reply) => [
        reply.line,
        ...(reply.next ? walk(reply.next) : []),
      ]),
    ];
    for (const row of [...scene.talk.lines, ...walk(scene.talk.tree)])
      expect(row.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
      );

    // Four replies, four stances: four different moves, four different lines.
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expect(new Set(root.map((row) => row.move)), where).toEqual(
      new Set(["tell", "ask", "promise", "refuse"]),
    );
    expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);

    // The reply is written back: a record that names the cause, and the tie.
    const replyId = replyInScene(core, director, personId, entry, [P.zero], {
      typeKey: "hallway",
    });
    expect(replyId, `${where}: the first reply is recorded`).toBeTruthy();
    const kept = core.durableLog.get(replyId!);
    expect(kept?.kind, where).toBe("scene.reply");
    expect(kept?.facts?.causeId, where).toBe(moment.causeId);
    expect(kept?.facts?.typeKey, where).toBe("hallway");

    // Each of the three causes speaks for its own reason, from the same cast:
    // the same speaker says the same thing twice, an opposite speaker says it
    // differently.
    const facts: Record<string, Fact> = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    facts.cause ??= {
      text: "the minimum wage",
      sourceRecordIds: [moment.causeId],
    };
    const lines: string[] = [];
    const seen = new Set<string>();
    for (const [key, label] of Object.entries(LABELS)) {
      const typed = typeForCause(TYPE, label);
      expect(typed.tag?.key, label).toBe(key);
      const sayWith = (level: number) =>
        composeSceneTalk(
          core,
          director,
          { askerId: scene.askerId, askedId: scene.askedId },
          typed,
          facts,
          {
            askerTraits: Object.fromEntries(
              PROFILE.map((id, k) => [id, k % 2 ? -level : level]),
            ),
          },
        );
      const text = (level: number) => {
        const out = sayWith(level);
        expect(out.kind, `${where}: ${key}`).toBe("composed");
        return out.kind === "composed"
          ? out.talk.lines.map((row) => row.text).join("|")
          : "";
      };
      expect(text(2), `${where}: ${key}`).toBe(text(2));
      expect(text(2), `${where}: ${key}`).not.toBe(text(-2));
      const out = sayWith(2);
      if (out.kind !== "composed") continue;
      expect(
        out.talk.lines.every((row) => row.key === key),
        `${where}: ${key}`,
      ).toBe(true);
      const rootReplies = out.talk.tree.replies.map((row) => row.line);
      expect(new Set(rootReplies.map((row) => row.move)), key).toEqual(
        new Set(["tell", "ask", "promise", "refuse"]),
      );
      expect(new Set(rootReplies.map((row) => row.text)).size, key).toBe(
        rootReplies.length,
      );
      // Each cause's narration, statement and replies are its own.
      const own = new Set(
        out.talk.lines
          .filter((row) => ["narrate", "open", "state"].includes(row.step))
          .map((row) => row.parts[0]),
      );
      for (const part of own) expect(seen.has(part ?? ""), key).toBe(false);
      for (const part of own) seen.add(part ?? "");
      lines.push(
        `  ${key} (speaks ${out.talk.lines.length} lines; a hostile, argumentative speaker): ${text(-2)}\n  ${key} (a friendly, affectionate speaker): ${text(2)}`,
      );
    }

    return `${moment.date} ${moment.label}, cause record ${moment.causeId}, asker ${scene.askerId}, reply ${replyId}\n${scene.talk.lines.map((row) => `  ${row.speaker}: ${row.text}`).join("\n")}\n${lines.join("\n")}`;
  }
}
