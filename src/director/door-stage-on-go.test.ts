import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { campaignDay } from "../bench/campaign";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { CAMPAIGNS_MODULE_ID, type CauseRow } from "../core2/modules/campaigns";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { townSeats } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { corePlaceByKey } from "../core2/place-lookup";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { ScheduleEntry } from "./scheduling";
import { townResidentsByCash } from "../core2/resident-adults-test-kit";

// Go on Knock on doors stages the day's porch scene at once (P41): the
// director's door-ask moment exists on the day of the outing, before the day
// closes, so the outing can end in the porch talk instead of waiting for night.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 52;
const DAYS = 10;
const LABELS = [
  "circumstance:door-first",
  "circumstance:door-again",
  "circumstance:door-petition",
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

it(`a doors outing stages its porch scene on the day it is knocked (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `door-stage:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const local = () =>
      openContests(coreAPI(core)).some(
        (row) => row.level !== "federal" && row.level !== "state",
      );
    for (let week = 0; week < WEEKS && !local(); week += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const start = makeIsoDate(core.date);
    const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
    const adults = townResidentsByCash(core, coreAPI(core)).filter(
      (row) =>
        row.alive &&
        row.placeId === town &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), start) >= 35,
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
    const doorToday = () =>
      book.schedule.find(
        (row) =>
          row.date === core.date &&
          LABELS.includes(book.momentsById.get(row.momentId)?.label ?? ""),
      );
    let packet = advancePlayerV1(core, {
      controlledPersonId: personId,
      through: { date: addDays(start, DAYS), minuteOfDay: P.zero },
    });
    let canvassedOn = "";
    let staged: ScheduleEntry | undefined;
    while (packet.kind !== "complete" && !staged) {
      if (canvassedOn !== core.date) {
        canvassedOn = core.date;
        const knocked = campaignDay(core, personId, {
          filingId: filing.id,
          kind: "canvass",
        });
        // Nothing is staged by the knock alone: the day has not closed.
        expect(
          doorToday(),
          `${where}: staged before the outing was told`,
        ).toBeUndefined();
        director.stageDoors(core);
        if (knocked.doorsKnocked > 0) staged = doorToday();
      }
      if (staged) break;
      packet = resumePlayerV1(core, {
        kind: packet.kind === "stop" ? "stop" : "own-choice",
        pauseId: packet.pauseId,
      } as never);
    }
    if (!staged) {
      tried.push(`${where}: canvassed ${DAYS} days, no door staged on its day`);
      continue;
    }
    const moment = book.momentsById.get(staged.momentId)!;
    const cause = coreAPI(core)
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("causes")
      .get(moment.causeId) as unknown as CauseRow;
    expect(cause?.act, where).toBe("door");
    expect(staged.date, where).toBe(core.date);
    return;
  }
  throw new Error(
    `No drawn place staged a door on its day: ${tried.join("; ")}`,
  );
}, 600_000);
