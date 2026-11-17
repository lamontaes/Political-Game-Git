/**
 * A witness catches the player after a committee hearing (brief V, stage 1;
 * pool item scene-hearing-witness-after-the-hearing). A state or territory
 * chamber with committees hears the player's bill; the legislature's
 * `committee-hearing` record names the witnesses, each one's side and what the
 * bill reaches in their own life (their job, their lease or mortgage, a child
 * at home, their own age, or only a view). The director casts one of them in
 * the hallway; they say what the bill does to them, never a figure; the
 * player's reply is time on their tie, and the witness's own vote reads that
 * tie. Places are drawn from all 56 on a seed nobody chose until one has a
 * state chamber of three whose committees hear the player's bill; each place
 * passed over is named, and the test fails by name if none has.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  scheduleVote,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 12;
/** Bills the player drafts, one on each question the chamber can pass, so one is heard. */
const BILLS = 6;
const LIVES = new Set([
  "paid-under-the-floor",
  "works-where-it-binds",
  "works",
  "rents",
  "owns",
  "children-at-home",
  "own-age-health",
  "believes",
]);

/** Plays one drawn place; the reason it lacks the case, or undefined once every check passed there. */
function attempt(
  place: ReturnType<typeof drawPlace>,
  where: string,
): string | undefined {
  {
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    // The town's seat in the state's lower chamber: a chamber with committees.
    const body = [
      ...new Map(
        townSeats(api)
          .filter(
            (row) =>
              row.office.level === "state" &&
              row.office.kind.startsWith("legislature-") &&
              full(row.office.id).length > 2,
          )
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ].sort((a, b) => full(b.id).length - full(a.id).length)[0];
    if (!body) return "no state chamber of three members";
    const player = full(body!.id)[0]! as PersonId;
    core.playerId = player;
    director.watch(core, player);
    // The player drafts a bill on each question the chamber can pass and the
    // legislature puts each on its next sitting, its committee a week ahead.
    const billIds: string[] = [];
    for (const question of seatView(core, player).questions) {
      if (billIds.length >= BILLS) break;
      const drafted = seatAct(core, player, {
        kind: "draft",
        officeId: body!.id,
        question,
        value: 1,
      }) as { id: string };
      if (billOf(api, drafted.id)?.authority.some((row) => !row.allowed))
        continue;
      scheduleVote(api, drafted.id);
      billIds.push(drafted.id);
    }
    const calendar = api.moduleCalendar(LEGISLATURE_MODULE_ID);
    const hearings = billIds
      .map((id) => calendar.get(`committee:${id}`)?.date)
      .filter((date): date is string => !!date)
      .sort();
    if (!hearings.length)
      return "no committee day was set for the player's bills";
    // The world runs to the eve of the hearings; the player lives the days.
    advanceCore(core, addDays(makeIsoDate(hearings[0]!), -1));
    let packet: ReturnType<typeof advancePlayerV1> | undefined =
      advancePlayerV1(core, {
        controlledPersonId: player,
        through: {
          date: addDays(makeIsoDate(hearings[hearings.length - 1]!), 2),
          minuteOfDay: 0,
        },
      });
    while (packet && packet.kind !== "complete")
      packet =
        packet.kind === "stop"
          ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
          : resumePlayerV1(core, {
              kind: "choice",
              pauseId: packet.pauseId,
              offerId: packet.offers[0]!.offerId,
            });

    const book = director.ledger.people.get(player)!;
    const entry = book.schedule.find((row) =>
      row.bindings.some((binding) => binding.typeKey === "hearing-witness"),
    );
    expect(entry, `${where}: the witness scene is staged`).toBeTruthy();
    const moment = book.momentsById.get(entry!.momentId)!;
    const record = core.durableLog.get(moment.causeId);
    expect(record?.kind, where).toBe("committee-hearing");
    expect(billIds, where).toContain(record!.facts!.billId);
    const witnesses = record!.facts!.witnessIds!.split(",");
    const lives = record!.facts!.witnessLives!.split(",");
    expect(lives.length, where).toBe(witnesses.length);
    for (const life of lives)
      expect(LIVES.has(life), `${where}: ${life}`).toBe(true);

    const result = purposeScene(core, director, player, entry!, {
      typeKey: "hearing-witness",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return undefined;
    const talk = result.scene.talk;
    // The one who testified opens, with what the bill does to them.
    expect(witnesses, where).toContain(talk.askerId);
    expect(talk.state.speakerId, where).toBe(talk.askerId);
    // Two turns past the opening and endings that differ.
    expect(talk.depth, where).toBeGreaterThanOrEqual(2);
    expect(new Set(talk.endings).size, where).toBeGreaterThanOrEqual(2);
    // Said as it feels, never a figure (rule 101).
    const said: string[] = [];
    const walk = (node: typeof talk.tree | null) => {
      if (!node) return;
      for (const line of node.lines) said.push(line.text);
      for (const reply of node.replies) {
        said.push(reply.line.text);
        walk(reply.next);
      }
    };
    walk(talk.tree);
    for (const text of [talk.state.text, ...said])
      expect(text, `${where}: no figure`).not.toMatch(/\d/);
    process.stdout.write(
      `WITNESS ${where} ${moment.causeId}: ${[...talk.narration, talk.state].map((line) => line.text).join(" / ")} / choices: ${talk.tree.replies.map((reply) => reply.line.text).join(" | ")}\n`,
    );

    // A reply is time on the tie, which the witness's own vote reads.
    const disagree = talk.tree.replies.findIndex(
      (reply) => reply.line.move === "disagree",
    );
    expect(disagree, where).toBeGreaterThanOrEqual(0);
    const replyId = replyInScene(core, director, player, entry!, [disagree], {
      typeKey: "hearing-witness",
    });
    expect(replyId, `${where}: the reply is recorded`).toBeTruthy();
    expect(core.durableLog.get(replyId!)?.facts?.causeId, where).toBe(
      moment.causeId,
    );
    const tie = [...(core.relationshipsByPerson.get(player) ?? [])]
      .map((id) => core.relationships.get(id)!)
      .find(
        (rel) => rel.actorId === talk.askerId || rel.otherId === talk.askerId,
      );
    expect(tie, `${where}: a tie with the witness`).toBeTruthy();
    expect(tie!.lastContactDate >= moment.date, where).toBe(true);
    return undefined;
  }
}

it("a witness catches the player after the hearing on their bill and says what it does to them", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "hearing-witness");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const why = attempt(place, where);
    if (!why) {
      process.stdout.write(
        `HEARING WITNESS passed at ${where}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    passed.push(`${place.name} (${why})`);
  }
  throw new Error(
    `No drawn place had a state chamber that heard the bill: ${passed.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
