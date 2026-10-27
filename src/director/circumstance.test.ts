import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { fileForOffice } from "../bench/government";
import { answerJobOffer, jobsView } from "../bench/jobs";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { openContests } from "../core2/modules/elections";
import { advanceCore } from "../core2/life";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { CIRCUMSTANCES, sceneWebRows } from "./circumstance";
import type { Director } from "./ledger";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";
import { SITUATION_LIBRARY } from "./scheduling";

// Scenes from circumstance (owner, Oct 27, 01:30 Eastern: "if the
// circumstances are right in the simulation, they should be callable"). A
// played year in a drawn place as the town's new adult (the ordinary player),
// another as a sitting member of a council or board, another as the new adult
// filed for the soonest race once they turn 18, and another as a member of the
// state legislature, each played through the player clock as the bench plays
// it. Each scene from circumstance is
// checked at its stop: its record was written that day and, unless the row
// follows a sitting, does not name the player; the person cast is someone
// else and stands in the scene; the scene composes; and a scene with a
// purpose is answered with its first reply, whose record the core writes and
// whose time together the relationship engine records. Across the worlds,
// each family of circumstance the owner named calls at least one scene.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 365;
const DRAWS = 3;

/** The families of circumstance (owner, Oct 27) and the rows of each. */
const FAMILIES: Readonly<Record<string, readonly string[]>> = {
  "a law passed or in force": [
    "vote-read-street",
    "law-reached-street",
    "law-news-street",
  ],
  "a printed story": ["story-read-home"],
  "a price change": ["price-moved-street", "rent-news-street"],
  "a death": ["death-known-street"],
  "a national event in the news": [
    "national-news-work",
    "national-news-street",
  ],
  "a rival in the player's own race": ["rival-message"],
  "a hallway at the capitol": ["hallway-colleague", "hallway-reporter"],
  "a hallway after a sitting": [
    "hallway-colleague",
    "hallway-reporter",
    "meeting-colleague",
    "meeting-reporter",
  ],
};

/** The families each way of playing can show; a way is played only while one is unfired. */
const SHOWS: Readonly<
  Record<"resident" | "member" | "candidate" | "legislator", readonly string[]>
> = {
  resident: [
    "a printed story",
    "a price change",
    "a death",
    "a national event in the news",
  ],
  member: ["a law passed or in force", "a hallway after a sitting"],
  candidate: ["a rival in the player's own race", "a law passed or in force"],
  legislator: ["a hallway at the capitol"],
};

interface Fired {
  where: string;
  row: string;
  date: string;
  recordId: string;
  castId: string;
  typeKey: string;
  /** The reply's record, when the scene has a purpose that composed. */
  replyId?: string;
}

/**
 * Plays as the bench plays: the player clock runs to each stop; a job offer
 * is taken (the offer card's Take it, `src/bench/jobs.ts`); a scene from
 * circumstance is opened and, when it has a purpose, answered with its first
 * reply on its own day; a choice takes its first offer.
 */
function playYear(
  core: CoreState,
  director: Director,
  personId: PersonId,
  where: string,
): Fired[] {
  // Followed as play follows the person it controls: their records are kept.
  core.focusPersonIds.add(personId);
  director.watch(core, personId);
  const book = director.ledger.people.get(personId)!;
  const fired: Fired[] = [];
  const open = (momentId: string) => {
    const entry = book.schedule.find((row) => row.momentId === momentId);
    const moment = book.momentsById.get(momentId);
    if (!entry || !moment?.label.startsWith("circumstance:")) return;
    const record = core.durableLog.get(moment.causeId);
    // A cause is a logged record, or a core record read directly (a job, a
    // household member).
    expect(
      record ??
        core.jobs.get(moment.causeId) ??
        core.people.get(moment.causeId as PersonId),
      moment.id,
    ).toBeTruthy();
    const row = CIRCUMSTANCES.rows.find(
      (item) => `circumstance:${item.id}` === moment.label,
    )!;
    if (record) {
      expect(record.date, moment.id).toBe(moment.date);
      if (!row.playerNamed)
        expect(record.personIds, moment.id).not.toContain(personId);
    }
    const castId = moment.counterpartIds[0]!;
    expect(castId, moment.id).not.toBe(personId);
    const binding = entry.bindings[0]!;
    expect(binding.typeKey, moment.id).toBe(row.typeKey);
    expect(
      binding.roles.some((role) => role.personIds.includes(castId)),
      `${moment.id}: the cast is in the scene`,
    ).toBe(true);
    expect(
      composeScene(core, director, personId, entry),
      moment.id,
    ).toBeTruthy();
    const purpose = purposeScene(core, director, personId, entry, {
      includeHeld: true,
    });
    let replyId: string | undefined;
    if (purpose?.kind === "composed") {
      replyId =
        replyInScene(core, director, personId, entry, [P.zero], {
          includeHeld: true,
        }) ?? undefined;
      expect(replyId, `${moment.id}: the first reply is recorded`).toBeTruthy();
      expect(core.durableLog.get(replyId!)?.facts?.causeId).toBe(
        moment.causeId,
      );
    }
    fired.push({
      where,
      row: row.id,
      date: moment.date,
      recordId: moment.causeId,
      castId,
      typeKey: binding.typeKey,
      ...(replyId ? { replyId } : {}),
    });
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
        const offer = jobsView(core, personId).offers.find((item) =>
          stop.recordId.startsWith(`${item.id}:`),
        );
        if (offer) answerJobOffer(core, personId, offer.id, "accept");
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
  // A reply is time together: the relationship engine records the contact.
  for (const row of fired.filter((item) => item.replyId)) {
    const tie = [...(core.relationshipsByPerson.get(personId) ?? [])]
      .map((id) => core.relationships.get(id)!)
      .find((rel) => rel.actorId === row.castId || rel.otherId === row.castId);
    expect(tie, `${row.replyId}: a tie with the cast`).toBeTruthy();
    expect(tie!.lastContactDate >= row.date, row.replyId).toBe(true);
  }
  // Spaced: never two on one day.
  const days = fired.map((row) => row.date);
  expect(new Set(days).size).toBe(days.length);
  return fired;
}

/**
 * A sitting member of a body (a council, a board: an office with other
 * members) who is a full person in town, or null. An office held alone (an
 * assessor, a mayor) sits on no body and has no hallway after a sitting.
 */
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
 * A sitting member of the state's legislature, a full person wherever they
 * live (playing as anyone, owner, Oct 26), or null.
 */
function stateLegislator(core: CoreState): PersonId | null {
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  const terms = coreAPI(core)
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[];
  const seated = terms
    .filter(
      (term) =>
        /legislature/.test(term.officeId) &&
        core.people.get(term.personId as PersonId)?.alive === true,
    )
    .sort(
      (a, b) =>
        a.officeId.localeCompare(b.officeId) || a.id.localeCompare(b.id),
    );
  return (seated[0]?.personId as PersonId | undefined) ?? null;
}

/**
 * The new adult filed for the soonest race the town's records let them enter,
 * once they turn 18 (the golden path's filing step), or null when none is
 * open to them. The days before 18 run as the world's own.
 */
function fileNewAdult(
  world: ReturnType<typeof buildBenchWorld>,
): PersonId | null {
  const { core, playerId } = world;
  const born = core.people.get(playerId as PersonId)!.birthDate;
  const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
  const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
  if (eighteen > core.date) advanceCore(core, eighteen);
  const filed = [...openContests(coreAPI(core))]
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    )
    .find(
      (contest) =>
        (
          fileForOffice(core, playerId!, contest.id) as {
            filing?: { status?: string };
          }
        ).filing?.status === "on-ballot",
    );
  return filed ? (playerId as PersonId) : null;
}

it(`a record anywhere in the world calls a scene where the player is (seed ${seed})`, () => {
  setBookkeeping(false);
  const fired: Fired[] = [];
  const tried: string[] = [];
  const unfired = () =>
    Object.entries(FAMILIES)
      .filter(([, rows]) => !fired.some((row) => rows.includes(row.row)))
      .map(([family]) => family);
  for (let draw = 0; draw < DRAWS && unfired().length; draw += 1) {
    for (const as of [
      "resident",
      "member",
      "candidate",
      "legislator",
    ] as const) {
      if (!SHOWS[as].some((family) => unfired().includes(family))) continue;
      const place = drawPlace(seed, `circumstance-${as}:${draw}`);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const personId =
        as === "resident"
          ? (world.playerId as PersonId)
          : as === "member"
            ? localMember(world.core)
            : as === "candidate"
              ? fileNewAdult(world)
              : stateLegislator(world.core);
      const where = `${place.name} (${place.key}), seed ${place.seed}, as ${
        as === "resident"
          ? "the new adult"
          : as === "member"
            ? "a sitting member"
            : as === "candidate"
              ? "the new adult, filed"
              : "a member of the state legislature"
      }`;
      tried.push(personId ? where : `${where}: no full-person member or race`);
      if (personId)
        fired.push(...playYear(world.core, world.director, personId, where));
    }
  }
  const byRow = new Map<string, Fired[]>();
  for (const row of fired)
    byRow.set(row.row, [...(byRow.get(row.row) ?? []), row]);
  process.stdout.write(
    `circumstance scenes in ${tried.join("; ")}:\n` +
      CIRCUMSTANCES.rows
        .map((row) => {
          const list = byRow.get(row.id) ?? [];
          const first = list[0];
          return `  ${row.id}: ${list.length}${
            first
              ? ` (first ${first.date} in ${first.where.split(" (")[0]}, record ${first.recordId}, cast ${first.castId}${first.replyId ? `, reply ${first.replyId}` : ""})`
              : ""
          }`;
        })
        .join("\n") +
      "\n",
  );
  expect(unfired(), tried.join("; ")).toEqual([]);
  // Up to six played years, each about a minute: the budget for all of them.
}, 1_800_000);

it("gives every circumstance a situation type cause and a scene-web row", () => {
  const labels = new Set(
    SITUATION_LIBRARY.types.flatMap((type) =>
      type.causes.flatMap((cause) =>
        cause.match?.label ? [`${type.key}|${cause.match.label}`] : [],
      ),
    ),
  );
  for (const row of CIRCUMSTANCES.rows)
    expect(labels.has(`${row.typeKey}|circumstance:${row.id}`), row.id).toBe(
      true,
    );
  // One scene-web row for every live cause of every situation type.
  const live = SITUATION_LIBRARY.types.reduce(
    (sum, type) => sum + type.causes.filter((cause) => cause.match).length,
    0,
  );
  expect(sceneWebRows()).toHaveLength(live);
  for (const row of sceneWebRows()) {
    expect(row.triggerRecordKinds.length, row.id).toBeGreaterThan(0);
    for (const kind of row.triggerRecordKinds)
      expect(kind, row.id).toBeTruthy();
    expect(row.placeKinds.length, row.id).toBeGreaterThan(0);
    expect(row.castRule, row.id).toBeTruthy();
    expect(row.outcomeRecord, row.id).toBeTruthy();
  }
});
