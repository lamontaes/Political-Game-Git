import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { playerContests } from "../core2/modules/elections";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import type { Director } from "./ledger";
import type { Moment } from "./types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";

// The day after a race is counted, someone the player knows who is tied to a
// candidate tells who won (situation type `race-told`, purpose `race-told`,
// circumstance `race-result-known`, cause record `election-result`). A
// drawn place is played for a year as the bench plays it, as the new adult
// filed for the soonest race that year and as the town's new adult who did
// not; every race-told moment is composed from its count. The scene's state
// names the winner and cites the count, the four root replies are four
// different moves, the same speaker says the same thing twice and opposite
// speakers say it differently, and a reply is written back as a record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;
const DAYS = 365;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "race-told",
) as unknown as PurposeType;
const PROFILE = [
  "personality-v1:facet-friendly",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-hostile",
  "personality-v1:facet-persistent",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-sensitive",
];

/** The last day a race may be held and still have its day after inside the played year. */
const lastDayOfRace = () => addDays(makeIsoDate(gameStartDate()), DAYS - 2);

/** The new adult filed for the soonest race held inside the year once they turn 18, or false. */
function fileNewAdult(world: ReturnType<typeof buildBenchWorld>): boolean {
  const { core, playerId } = world;
  const born = core.people.get(playerId as PersonId)!.birthDate;
  const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
  const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
  if (eighteen > core.date) advanceCore(core, eighteen);
  const filed = [...playerContests(coreAPI(core))]
    .filter((contest) => contest.electionDate <= lastDayOfRace())
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    )
    .find((contest) =>
      ["petitioning", "on-ballot"].includes(
        (
          fileForOffice(core, playerId!, contest.id) as {
            filing?: { status?: string };
          }
        ).filing?.status ?? "",
      ),
    );
  if (!filed) return false;
  // Filing is a petition: the new adult canvasses for signatures until the
  // clerk's check, and stands only where it puts them on the ballot.
  const petition = gatherSignatures(core, `filing:${filed.id}:${playerId}`);
  return (
    !petition || (!!petition.check && petition.check.valid >= petition.needed)
  );
}

/**
 * Plays the person's year as the bench plays it. Every race-told moment is
 * handed to `onTold` at its stop, while the director still holds it; every
 * one is counted. Returns the count.
 */
function told(
  core: CoreState,
  director: Director,
  personId: PersonId,
  onTold: (entry: ScheduleEntry, moment: Moment) => void,
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
      entry.bindings.some((row) => row.typeKey === "race-told")
    ) {
      onTold(entry, moment);
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

it(`the day after a count, someone tied to a candidate tells who won, and the reply is kept (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `race-told:${attempt}`);
    const as = attempt % 2 ? "the new adult" : "the new adult, filed";
    const where = `${place.name} (${place.key}), seed ${place.seed}, as ${as}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    if (!(attempt % 2) && !fileNewAdult(world)) {
      tried.push(`${where}: no race to enter that year`);
      continue;
    }
    const { core, director } = world;
    const personId = world.playerId as PersonId;
    let summary = "";
    const count = told(core, director, personId, (entry, moment) => {
      if (!summary)
        summary = check(where, core, director, personId, entry, moment);
    });
    if (!count) {
      tried.push(`${where}: no race told in the year`);
      continue;
    }
    process.stdout.write(
      `RACE TOLD ${where}${tried.length ? ` after ${tried.join("; ")}` : ""}: ${count} told in the year, the first ${summary}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a race told in the year: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);

/** Checks one race-told scene at its stop and returns what to log about it. */
function check(
  where: string,
  core: CoreState,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  moment: Moment,
): string {
  const record = core.durableLog.get(moment.causeId);
  expect(record?.kind, `${where}: the cause record`).toBe("election-result");
  expect(moment.label, where).toBe("circumstance:race-result-known");
  expect(moment.date, where).toBe(addDays(makeIsoDate(record!.date), P.one));

  const result = purposeScene(core, director, personId, entry, {
    typeKey: "race-told",
  });
  expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe("composed");
  if (result?.kind !== "composed") return "";
  const { scene } = result;
  expect(scene.purpose, where).toBe("race-told");
  expect(scene.cause.id, where).toBe(moment.causeId);
  expect(scene.askerId, where).not.toBe(personId);

  // The state names the winner, cited to the count.
  const winnerFact = scene.facts.find((row) => row.key === "winner");
  expect(winnerFact, `${where}: the winner fact`).toBeTruthy();
  expect(winnerFact!.recordIds, where).toContain(moment.causeId);
  const winnerId = record!.facts!.winnerId as PersonId;
  const won = core.people.get(winnerId)!;
  expect(winnerFact!.text, where).toBe(`${won.givenName} ${won.familyName}`);
  const state = scene.talk.lines.find((row) => row.step === "state");
  expect(state, `${where}: the asker states the result`).toBeTruthy();
  // A winner who tells it themselves says "I won"; anyone else names the winner.
  if (winnerId === scene.askerId)
    expect(
      scene.facts.some((row) => row.key === "bearer-won"),
      where,
    ).toBe(true);
  else expect(state!.text, where).toContain(winnerFact!.text);
  // Who ran is said only from the count's own people.
  const ran = (record!.personIds as readonly string[]).includes(scene.askerId);
  expect(
    scene.facts.some((row) => row.key === "bearer-ran"),
    where,
  ).toBe(ran);

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
    new Set(["ask", "comfort", "tell", "deflect"]),
  );
  expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);

  // The reply is written back: a record that names the cause, and the tie.
  const replyId = replyInScene(core, director, personId, entry, [P.zero], {
    typeKey: "race-told",
  });
  expect(replyId, `${where}: the first reply is recorded`).toBeTruthy();
  const kept = core.durableLog.get(replyId!);
  expect(kept?.kind, where).toBe("scene.reply");
  expect(kept?.facts?.causeId, where).toBe(moment.causeId);
  expect(kept?.facts?.typeKey, where).toBe("race-told");

  // The same speaker says the same thing twice; opposite speakers say it
  // differently.
  const facts: Record<string, Fact> = Object.fromEntries(
    scene.facts.map((row) => [
      row.key,
      { text: row.text, sourceRecordIds: row.recordIds } as Fact,
    ]),
  );
  const sayWith = (level: number) => {
    const out = composeSceneTalk(
      core,
      director,
      { askerId: scene.askerId, askedId: scene.askedId },
      TYPE,
      facts,
      {
        askerTraits: Object.fromEntries(
          PROFILE.map((id, k) => [id, k % 2 ? -level : level]),
        ),
      },
    );
    expect(out.kind, where).toBe("composed");
    return out.kind === "composed" ? out.talk : null;
  };
  const text = (level: number) =>
    sayWith(level)!
      .lines.map((row) => `${row.speaker}: ${row.text}`)
      .join("\n");
  expect(text(2), where).toBe(text(2));
  expect(text(2), where).not.toBe(text(-2));

  const log = `${moment.date} ${moment.label}, cause record ${moment.causeId}, asker ${scene.askerId} (${[...scene.facts.map((row) => row.key).filter((key) => /^(bearer|you)-|^(kin|acquainted|stranger)$/.test(key))].join(", ") || "no ran facts"}), reply ${replyId}\nREPLIES: ${root.map((row) => `${row.move}: ${row.text}`).join(" | ")}\nA friendly, affectionate speaker:\n${text(2)}\nA hostile, argumentative speaker:\n${text(-2)}\n`;
  if (process.env.SCENE_LOG)
    appendFileSync(process.env.SCENE_LOG, `${where}\n${log}\n`);
  return log;
}
