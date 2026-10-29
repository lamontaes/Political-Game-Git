import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { campaignDay } from "../bench/campaign";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { CAMPAIGNS_MODULE_ID, type CauseRow } from "../core2/modules/campaigns";
import {
  fileCandidacy,
  openContests,
  petitionSignerIds,
} from "../core2/modules/elections";
import { townSeats } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { corePlaceByKey } from "../core2/place-lookup";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";

// A door the player's own canvass knocks, where the resident's agreement is
// the day's strongest, plays as the player's ask: the player asks for their
// vote and the resident answers from where the knock left them (the campaign
// engine's warmth after the knock), through the one scene builder. While the
// player's petition circulates, the player asks for a signature instead, and
// the resident answers from the petition record: signed or not. The player's
// ask is written back as the resident's answer, with the ending the purpose
// names.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 52;
const DAYS = 10;
const LABELS = [
  "circumstance:door-first",
  "circumstance:door-again",
  "circumstance:door-petition",
];

/** Every end of a tree. */
const ends = (node: TreeNode): TreeNode[] => [
  ...(node.end ? [node] : []),
  ...node.replies.flatMap((reply) => (reply.next ? ends(reply.next) : [])),
];

/** A local filing by a resident who holds no seat, from the open contests. */
function fileLocal(core: CoreState, personId: string) {
  const api = coreAPI(core);
  if (townSeats(api).some((s) => s.holder?.personId === personId)) return null;
  for (const contest of openContests(api)) {
    if (contest.level === "federal" || contest.level === "state") continue;
    const filed = fileCandidacy(api, {
      personId,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (
      filed.status !== "refused" &&
      ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    )
      return filed.filing;
  }
  return null;
}

it(`a door the player knocks plays as the player's ask, answered from the knock or the petition (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `door-ask:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The town's weeks go by until a local race opens for filing.
    const local = () =>
      openContests(coreAPI(core)).some(
        (row) => row.level !== "federal" && row.level !== "state",
      );
    for (let week = 0; week < WEEKS && !local(); week += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const start = makeIsoDate(core.date);
    // The town's own residents (officials living elsewhere cannot file here).
    const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
    const adults = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.placeId === town &&
          row.tier !== "husk" &&
          ageOnDate(makeIsoDate(row.birthDate), start) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    let filing: ReturnType<typeof fileLocal> = null;
    let personId: PersonId | undefined;
    for (const row of adults.slice(0, 60)) {
      core.playerId = row.id;
      filing = fileLocal(core, row.id);
      if (filing) {
        personId = row.id;
        break;
      }
    }
    if (!filing || !personId) {
      tried.push(`${where}: no local race to file for by ${start}`);
      continue;
    }
    core.focusPersonIds.add(personId);
    director.watch(core, personId);
    const book = director.ledger.people.get(personId)!;
    // The player's clock: at the day's first pause the candidate knocks
    // doors, as the campaign day lets them, until a door is asked.
    let entry: ScheduleEntry | undefined;
    const open = () => {
      entry ??= book.schedule.find((row) =>
        LABELS.includes(book.momentsById.get(row.momentId)?.label ?? ""),
      );
    };
    let canvassedOn = "";
    let packet = advancePlayerV1(core, {
      controlledPersonId: personId,
      through: { date: addDays(start, DAYS), minuteOfDay: P.zero },
    });
    while (packet.kind !== "complete" && !entry) {
      open();
      if (entry) break;
      if (canvassedOn !== core.date) {
        campaignDay(core, personId, { filingId: filing.id, kind: "canvass" });
        canvassedOn = core.date;
      }
      packet = resumePlayerV1(core, {
        kind: packet.kind === "stop" ? "stop" : "own-choice",
        pauseId: packet.pauseId,
      } as never);
    }
    open();
    if (!entry) {
      tried.push(
        `${where}: canvassed ${DAYS} days as ${personId}, no door asked`,
      );
      continue;
    }
    const moment = book.momentsById.get(entry.momentId)!;
    const cause = coreAPI(core)
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("causes")
      .get(moment.causeId) as unknown as CauseRow;
    expect(cause?.act, where).toBe("door");
    const result = purposeScene(core, director, personId, entry);
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    // The player asks; the resident the knock reached answers.
    expect(scene.playerAsks, where).toBe(true);
    expect(scene.askedId, where).toBe(personId);
    expect(scene.askerId, where).toBe(cause.voterId);
    expect(scene.talk.state.speakerId, where).toBe(personId);
    const first = scene.talk.tree.lines[0]!;
    expect(first.speakerId, where).toBe(cause.voterId);
    // Asked to sign, from the petition record; asked for a vote, from where
    // the knock left them. For the player, a yes; otherwise no.
    const petition = moment.label === "circumstance:door-petition";
    const signed = petitionSignerIds(coreAPI(core), filing.id).has(
      cause.voterId,
    );
    expect(result.scene.purpose, where).toBe(
      petition ? "ask-signature" : "ask-support",
    );
    expect(
      first.move,
      `${where}: ${petition ? `signed ${signed}` : `warmth ${cause.warmthAfter}`}`,
    ).toBe((petition ? signed : cause.warmthAfter > 0) ? "agree" : "decline");
    // Every end is one the purpose names, by the one ending decider.
    const named = ends(scene.talk.tree).map((node) => node.end?.ending?.id);
    expect(named.every(Boolean), `${where}: ${named.join(", ")}`).toBe(true);
    // The player's first ask is written back as the resident's answer.
    const replyId = replyInScene(core, director, personId, entry, [0]);
    expect(replyId, where).toBeTruthy();
    const reply = core.durableLog.get(replyId!)!;
    const answer =
      scene.talk.tree.replies[0]!.next?.lines.find(
        (row) => row.speakerId === cause.voterId,
      )?.move ?? first.move;
    expect(reply.facts?.move, where).toBe(answer);
    expect(reply.facts?.ending, where).toBe(
      scene.talk.tree.replies[0]!.next?.end?.ending?.id ??
        scene.talk.tree.end?.ending?.id,
    );
    process.stdout.write(
      [
        `DOOR ASK ${where}, run seed ${seed}: ${moment.label}, cause ${cause.id}, filing ${filing.id}, ${petition ? `signed ${signed}` : `warmth after ${cause.warmthAfter.toFixed(2)}`}`,
        ...scene.talk.narration.map((line) => `Narrator: ${line.text}`),
        `${scene.talk.state.speaker}: ${scene.talk.state.text}`,
        `${first.speaker}: ${first.text}`,
        ...scene.talk.tree.replies.map(
          (row) =>
            `  [${row.line.move}] ${row.line.text} -> ${row.next?.lines.map((l) => l.text).join(" ") ?? ""} (${row.next?.end?.ending?.id})`,
        ),
        `reply ${replyId}: move ${reply.facts?.move}, ending ${reply.facts?.ending}`,
      ].join("\n") + "\n",
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 900_000);
