import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { campaignDay } from "../bench/campaign";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import {
  ELECTIONS_MODULE_ID,
  standing,
  playerContests,
  type FilingRow,
} from "../core2/modules/elections";
import { advanceCore } from "../core2/life";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { CAMPAIGNS_MODULE_ID } from "../core2/modules/campaigns";
import { SCHOOL_MODULE_ID } from "../core2/school-measures";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { CIRCUMSTANCES } from "./circumstance";
import type { Director } from "./ledger";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";
import { SITUATION_LIBRARY } from "./scheduling";
import { gatherSignatures } from "../core2/campaign-petition-kit";

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
const DRAWS = 2;
/** Days between the filed player's canvasses (the bench's campaign day, once a week). */
const DOOR_DAYS = 7;

/**
 * The families of circumstance (owner, Oct 27) that every drawn year
 * carries, and the rows of each. A price change (price-moved-street,
 * rent-news-street), a death known to the player (death-known-street), a hire
 * (new-coworker), a rival's message (rival-message) and a lobbyist after a
 * lobbying visit to the player (lobbyist-hallway) are counted and
 * printed, not asserted: a year in one town carries one or none, so whether
 * any comes is the draw's, not the producer's
 * (director-circumstance-rare-families-asserted).
 */
const FAMILIES: Readonly<Record<string, readonly string[]>> = {
  "a law passed or in force": [
    "vote-read-street",
    "law-reached-street",
    "law-news-street",
  ],
  "a printed story": ["story-read-home"],
  "a national event in the news": [
    "national-news-work",
    "national-news-street",
  ],
  "a hallway at the capitol": ["hallway-colleague", "hallway-reporter"],
  "a hallway after a sitting": [
    "hallway-colleague",
    "hallway-reporter",
    "meeting-colleague",
    "meeting-reporter",
  ],
};

/** The families each way of playing can show; after the first draw, a way is played only while one is unfired. */
const SHOWS: Readonly<
  Record<"resident" | "member" | "candidate" | "legislator", readonly string[]>
> = {
  resident: ["a printed story", "a national event in the news"],
  member: ["a law passed or in force", "a hallway after a sitting"],
  candidate: ["a law passed or in force"],
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
  options: { canvass?: boolean } = {},
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
    // household member, a school year's result, a door the campaign knocked).
    const result = (coreAPI(core)
      .moduleState(SCHOOL_MODULE_ID)
      .table("results")
      .get(moment.causeId) ??
      coreAPI(core)
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .get(moment.causeId)) as unknown as { date: string } | undefined;
    expect(
      record ??
        core.jobs.get(moment.causeId) ??
        core.people.get(moment.causeId as PersonId) ??
        result,
      moment.id,
    ).toBeTruthy();
    const row = CIRCUMSTANCES.rows.find(
      (item) => `circumstance:${item.id}` === moment.label,
    )!;
    if (result)
      expect(
        addDays(makeIsoDate(result.date), row.afterDays ?? 0),
        moment.id,
      ).toBe(moment.date);
    if (record) {
      // Its record is the day's own, or a row's days after it (the morning
      // after the count).
      expect(
        addDays(makeIsoDate(record.date), row.afterDays ?? 0),
        moment.id,
      ).toBe(moment.date);
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
    // A door on the player's canvass is the player asking for the vote: the
    // narrator sets the door, the player's request opens, the resident answers.
    if (row.id.startsWith("door-")) {
      expect(purpose?.kind, `${moment.id}: the door is a scene`).toBe(
        "composed",
      );
      // Only while the race is still to come: never after the count.
      const contestId = (
        coreAPI(core)
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("impressions")
          .get(`${castId}|${personId}`) as unknown as
          { contestId?: string } | undefined
      )?.contestId;
      const electionDate = (
        coreAPI(core)
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .get(contestId ?? "") as unknown as
          { electionDate?: string } | undefined
      )?.electionDate;
      expect(electionDate! > moment.date, `${moment.id}: before the vote`).toBe(
        true,
      );
      if (purpose?.kind === "composed") {
        const talk = purpose.scene.talk;
        expect(talk.narration.length, moment.id).toBeGreaterThan(0);
        expect(talk.state.move, moment.id).toBe("request");
        expect(talk.tree.lines[0]?.speakerId, moment.id).toBe(castId);
        process.stdout.write(
          `DOOR ${where}: ${[...talk.narration, talk.state, ...talk.tree.lines].map((line) => line.text).join(" / ")} / choices: ${talk.tree.replies.map((reply) => reply.line.text).join(" | ")}\n`,
        );
      }
    }
    // A resident who read that a law took effect has something to say about
    // it: the law in force, by the laws engine (a stop with no line for a
    // state law was skipped, Mount Horeb, Wisconsin, Oct 30).
    if (row.id === "law-news-street")
      expect(purpose?.kind, `${moment.id}: ${JSON.stringify(purpose)}`).toBe(
        "composed",
      );
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
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: personId,
      through: {
        date: addDays(makeIsoDate(core.date), DAYS),
        minuteOfDay: P.zero,
      },
    },
  );
  // A candidate knocks doors as the bench's campaign day lets them: at a
  // stop, once a week, while their race is still to come.
  let canvassedOn: string | undefined;
  const canvass = () => {
    if (!options.canvass) return;
    if (canvassedOn && addDays(makeIsoDate(canvassedOn), DOOR_DAYS) > core.date)
      return;
    const api = coreAPI(core);
    const filing = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byPerson", [personId]) as unknown as FilingRow[]
    ).find(
      (row) =>
        standing(row) &&
        ((
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .get(row.contestId) as unknown as
            { electionDate: string } | undefined
        )?.electionDate ?? "") > core.date,
    );
    if (!filing) return;
    campaignDay(core, personId, { filingId: filing.id, kind: "canvass" });
    canvassedOn = core.date;
  };
  // A life can end inside the year: the clock refuses a person who has died,
  // and the played year ends with them.
  const resume = (input: Parameters<typeof resumePlayerV1>[1]) => {
    try {
      return resumePlayerV1(core, input);
    } catch (error) {
      if (core.people.get(personId)?.alive) throw error;
      return undefined;
    }
  };
  while (packet && packet.kind !== "complete") {
    if (packet.kind === "stop") {
      canvass();
      for (const stop of packet.stop.modules) {
        open(stop.recordId);
      }
      packet = resume({ kind: "stop", pauseId: packet.pauseId });
    } else
      packet = resume({
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
  // A reply to an override's sponsor is kept by the legislature as a favor or
  // a strain the member's next vote on the sponsor's bills reads.
  for (const row of fired.filter(
    (item) => item.row === "override-whip" && item.replyId,
  ))
    expect(
      coreAPI(core)
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("replies")
        .get(row.replyId!),
      `${row.replyId}: the legislature keeps the reply`,
    ).toBeTruthy();
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
  // A town's own body first: it meets in the evening, a county board by day.
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const county = (term: TermRow) =>
    (offices.get(term.officeId) as unknown as { kind: string } | undefined)
      ?.kind === "county-board"
      ? P.one
      : P.zero;
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
        county(a) - county(b) ||
        a.officeId.localeCompare(b.officeId) ||
        a.id.localeCompare(b.id),
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
 * The new adult filed for a race the town's records let them enter (one with
 * a rival filed first, else the soonest; with `inYear`, only one held inside
 * the played year), once they turn 18 (the golden path's filing step), or
 * null when none is open to them. The days before 18 run as the world's own.
 */
function fileNewAdult(
  world: ReturnType<typeof buildBenchWorld>,
  inYear = false,
): PersonId | null {
  const { core, playerId } = world;
  const born = core.people.get(playerId as PersonId)!.birthDate;
  const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
  const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
  if (eighteen > core.date) advanceCore(core, eighteen);
  // A race someone else has already filed in comes first, so there is a
  // rival; then the soonest.
  const rivals = new Map<string, number>();
  for (const row of coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .rows() as unknown as FilingRow[])
    if (row.personId !== playerId)
      rivals.set(row.contestId, (rivals.get(row.contestId) ?? 0) + 1);
  const filed = [...playerContests(coreAPI(core))]
    .filter((contest) => !inYear || contest.electionDate <= lastDayOfRace())
    .sort(
      (a, b) =>
        Number(rivals.has(b.id)) - Number(rivals.has(a.id)) ||
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
  if (!filed) return null;
  // Filing is a petition: the new candidate canvasses for signatures until
  // the clerk's check, and stands only where it puts them on the ballot.
  const filingId = `filing:${filed.id}:${playerId}`;
  gatherSignatures(core, filingId);
  const kept = coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
  return kept?.status === "on-ballot" ? (playerId as PersonId) : null;
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
      // Every way of playing plays once; a later draw only for a family
      // still unfired.
      if (draw && !SHOWS[as].some((family) => unfired().includes(family)))
        continue;
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
        fired.push(
          ...playYear(world.core, world.director, personId, where, {
            canvass: as === "candidate",
          }),
        );
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
  // Each played test fails by its own limit, with its seed in its name, well
  // inside CI's 45-minute unit job: the two together fit it.
}, 1_200_000);

/** The last day a race may be held and still have its morning after inside the played year. */
const lastDayOfRace = () => addDays(makeIsoDate(gameStartDate()), DAYS - 2);

/** Places the morning-after test may build before one holds a race the new adult can enter that year. */
const MORNING_TRIES = 12;

// The morning after the player's own race (owner's "Morning after"): a
// place is drawn until one holds a race after the new adult turns 18 and
// inside the year (read from its contests, before anything is played; many
// places hold none that year), the new adult files, and the year is played.
// The day after the count, someone who worked the campaign or lives with
// them comes by, cited to the result, and the reply is kept.
it(`the morning after the player's race is a scene, cited to the count (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let at = 0; at < MORNING_TRIES; at += 1) {
    const place = drawPlace(seed, `circumstance-morning:${at}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const born = world.core.people.get(world.playerId as PersonId)!.birthDate;
    const eighteen = `${Number(born.slice(0, 4)) + 18}${born.slice(4)}`;
    const ahead = (
      coreAPI(world.core)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as { electionDate: string }[]
    ).some(
      (row) =>
        row.electionDate > eighteen && row.electionDate <= lastDayOfRace(),
    );
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const personId = ahead ? fileNewAdult(world, true) : null;
    if (!personId) {
      tried.push(`${where}: no race to enter that year`);
      continue;
    }
    const fired = playYear(world.core, world.director, personId, where).filter(
      (row) => row.row === "morning-after",
    );
    expect(fired.length, `${where}: no morning after`).toBeGreaterThan(0);
    for (const row of fired) {
      const result = world.core.durableLog.get(row.recordId)!;
      expect(result.kind).toBe("election-result");
      expect(row.date).toBe(addDays(makeIsoDate(result.date), 1));
      expect(row.replyId, `${row.recordId}: the reply is kept`).toBeTruthy();
    }
    process.stdout.write(
      `MORNING AFTER ${where}${tried.length ? ` after ${tried.join("; ")}` : ""}: ${fired.map((row) => `${row.date} ${row.recordId}, cast ${row.castId}, reply ${row.replyId}`).join("; ")}\n`,
    );
    return;
  }
  throw new Error(
    `no place in ${MORNING_TRIES} draws held a race the new adult could enter that year: ${tried.join("; ")}`,
  );
}, 720_000);

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
});
