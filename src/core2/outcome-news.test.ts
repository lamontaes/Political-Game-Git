/**
 * The town hears what the outcome web moved. A month's record names the
 * measures engines read that moved since the month before; the press prints
 * it by its size; residents hear it on their own days and hold it as a
 * known fact that cites the web record; the electorate's town reading counts
 * a measure only once a story with it has reached someone in town; and each
 * reader the story reached takes the moved condition as a reason for the
 * side their own view already holds on the question it ties to. Played in
 * the bench world, in a place drawn from all 56 on a seed nobody chose: a
 * year as the engines play it, a world whose rent is shifted once, and a twin
 * where nothing moved.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  NEWS_MODULE_ID,
  newsKey,
  storyDelivered,
  storyOfReadEvent,
} from "./modules/news";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { PRESS_MODULE_ID } from "./modules/press";
import {
  registerStanceListener,
  viewOf,
  viewOn,
  VIEWS_MODULE_ID,
  type Stance,
} from "./modules/views";
import {
  conditionQuestion,
  OUTCOME_MONTH_KIND,
  NEWS_MEASURES,
  webFactKey,
} from "./outcome-news";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.OUTCOME_NEWS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "outcome-news");
const RENT = "housing.rent";
const RENT_QUESTION = conditionQuestion(NEWS_MEASURES[RENT]!.topic)!;

/**
 * Each stance move on a condition's question as the views engine stored it: the
 * causes recorded that day (a reader in the player's circle keeps every
 * source's latest, so older ones ride along), whether the person knew each
 * one's record, and their view on the question at that moment.
 */
interface Move {
  readonly personId: string;
  readonly topic: string;
  readonly date: string;
  readonly stance: Stance;
  readonly today: readonly (Stance["causes"][number] & {
    readonly knewSource: boolean;
    /** They hold, from reading it, which outlet printed the story: what the director's bring-it-up lists. */
    readonly rememberedPrint: boolean;
  })[];
  readonly viewNow: number;
}
const MOVES = new WeakMap<object, Move[]>();
const CONDITION_QUESTIONS = new Set(
  Object.values(NEWS_MEASURES)
    .map((spec) => conditionQuestion(spec.topic))
    .filter((question): question is string => question !== null),
);
registerStanceListener((api, personId, topic) => {
  if (!CONDITION_QUESTIONS.has(topic)) return;
  const moves = MOVES.get(api.state) ?? [];
  MOVES.set(api.state, moves);
  const stance = api
    .moduleState(VIEWS_MODULE_ID)
    .table("stances")
    .get(`${personId}:${topic}`) as unknown as Stance;
  const view = viewOf(api, personId);
  moves.push({
    personId,
    topic,
    date: api.state.date,
    stance,
    today: stance.causes
      .filter((cause) => cause.date === api.state.date)
      .map((cause) => ({
        ...cause,
        knewSource:
          !!cause.learnedFrom && !!api.knows(personId, cause.learnedFrom),
        rememberedPrint: [
          ...((api.state as CoreState).knowledgeByPerson
            .get(personId)
            ?.values() ?? []),
        ].some(
          (fact) =>
            fact.key.startsWith("printed:") &&
            fact.key.endsWith(":story") &&
            fact.value === storyOfReadEvent(cause.eventId) &&
            fact.access === "perceived",
        ),
      })),
    viewNow: view ? viewOn(api, personId, topic, view.lean) : 0,
  });
});

/** The month's outcome record a printed story was made from, if any. */
const monthWireOf = (api: ReturnType<typeof coreAPI>, storyId: string) => {
  const story = api
    .moduleState(PRESS_MODULE_ID)
    .table("stories")
    .get(storyId) as { wireId?: string } | undefined;
  return story?.wireId?.startsWith(`${OUTCOME_MONTH_KIND}:`)
    ? story.wireId
    : null;
};

function play(
  shiftRent: boolean,
  untilDays?: number,
  at: { seed: string; key: string } = { seed, key: place.key },
) {
  const opening = gameStartDate();
  const world = buildBenchWorld(at.seed, opening, {
    twoLevel: true,
    placeKey: at.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const town = core.people.get(core.playerId!)!.placeId;
  let shifted: WebMonth | null = null;
  let day = makeIsoDate(opening);
  // A story is forgotten after a month, so stop while this one is fresh:
  // the shifted month, the month record on the next 3rd, then 25 days.
  const stop = () =>
    untilDays !== undefined
      ? day >= addDays(makeIsoDate(opening), untilDays)
      : shiftRent
        ? shifted && day >= addDays(makeIsoDate(shifted.date), 58)
        : day >= addDays(makeIsoDate(opening), 100);
  while (!stop()) {
    day = addDays(day, 1);
    advanceCore(core, day);
    // The web's own rows are written on the 3rd: shift the first one after
    // the opening, so the next month reads rent back at its level. A law
    // taking effect that month makes the web write the month's row again, so
    // the shift is laid again until the next month's row is written.
    const rows = months.rows() as unknown as WebMonth[];
    const row = rows.find(
      (r) => r.placeId === town && r.date === day && r.date > opening,
    );
    if (shiftRent && !shifted && row && row.values[RENT] !== undefined)
      shifted = row;
    const current = shifted
      ? rows.find((r) => r.id === shifted!.id && r.placeId === town)
      : undefined;
    const nextWritten =
      shifted &&
      rows.some((r) => r.placeId === town && r.month > shifted!.month);
    if (
      current &&
      !nextWritten &&
      current.values[RENT] !== shifted!.values[RENT]! * 0.9
    )
      months.put({
        ...current,
        values: { ...current.values, [RENT]: shifted!.values[RENT]! * 0.9 },
      } as never);
  }
  return { core, api, town, shifted, moves: MOVES.get(core) ?? [] };
}

describe(`the town hears the outcome web's month (${place.name}, seed ${seed})`, () => {
  it("lists only measures an engine reads", () => {
    for (const [measure, spec] of Object.entries(NEWS_MEASURES)) {
      expect(spec.topic.length, measure).toBeGreaterThan(0);
      if (spec.readBy === null) {
        expect(spec.stopgapId, measure).toBeTruthy();
        continue;
      }
      const text = readFileSync(spec.readBy, "utf8");
      expect(text, measure).toContain(`"${measure}"`);
    }
  });

  it("records a month's moves, prints them, spreads them across days and holds them as known facts", () => {
    const { core, api, town, shifted } = play(true);
    expect(shifted, "a web row was shifted").toBeTruthy();
    const next = `${shifted!.month.slice(0, 5)}${String(Number(shifted!.month.slice(5)) + 1).padStart(2, "0")}`;
    const eventId = `${OUTCOME_MONTH_KIND}:${town}:${next}`;
    const event = core.durableLog.get(eventId);
    expect(event, `month record ${eventId}`).toBeTruthy();
    expect(event!.publicRecord).toBe(true);
    const f = event!.facts!;
    const webId = `web:${town}:${next}`;
    expect(f[webFactKey(RENT)]).toBeTruthy();
    expect(f[`${webFactKey(RENT)}:record`]).toBe(webId);
    expect(f[`${webFactKey(RENT)}:was`]).toBe(
      String(shifted!.values[RENT]! * 0.9),
    );
    expect(Number(f.magnitude)).toBeGreaterThan(0);

    // The press printed it.
    const printed = api
      .moduleState(PRESS_MODULE_ID)
      .table("stories")
      .query("byWire", [eventId]) as unknown as { id: string }[];
    expect(printed.length, "outlets that printed the month").toBeGreaterThan(0);
    const storyId = printed[0]!.id;

    // Named residents heard it, on different days, and hold the fact.
    const heard = (
      api.moduleState(NEWS_MODULE_ID).table("heard").rows() as unknown as {
        personId: string;
        storyId: string;
        date: string;
      }[]
    ).filter((row) => printed.some((p) => p.id === row.storyId));
    const people = new Set(heard.map((row) => row.personId));
    const days = new Set(heard.map((row) => row.date));
    expect(people.size).toBeGreaterThanOrEqual(2);
    expect(days.size).toBeGreaterThanOrEqual(2);
    const known = [...people].map((id) =>
      core.knowledgeByPerson.get(id)?.get(`${webFactKey(RENT)}:record`),
    );
    for (const fact of known) {
      expect(fact?.value).toBe(webId);
      // Read in print, or passed on by someone who had (the source is then
      // the relationship they were told through).
      expect(["public", "told"]).toContain(fact?.access);
      if (fact?.access === "public")
        expect(printed.some((p) => p.id === fact.sourceId)).toBe(true);
    }
    expect(
      known.some((fact) => fact?.access === "public"),
      "someone read it in print",
    ).toBe(true);
    expect(storyDelivered(api, town, RENT)?.storyId).toBeTruthy();
    console.log(
      `outcome news: ${place.name}, seed ${seed}: ${eventId} -> ${storyId}; ${people.size} residents on ${days.size} days (${[...days].sort().join(", ")})`,
    );
  }, 900_000);

  it("says nothing of rent when nothing moved, and no reader's rent stance moves from a story about it", () => {
    const { core, api, town, moves } = play(false);
    const ids = [...(core.logByKind.get(OUTCOME_MONTH_KIND) ?? [])];
    for (const id of ids)
      expect(
        core.durableLog.get(id)?.facts?.[webFactKey(RENT)],
        id,
      ).toBeUndefined();
    expect(storyDelivered(api, town, RENT)).toBeNull();
    const fromStories = moves.filter(
      (move) =>
        move.topic === RENT_QUESTION &&
        move.stance.causes.some((cause) => {
          const storyId = storyOfReadEvent(cause.eventId);
          return storyId !== null && monthWireOf(api, storyId) !== null;
        }),
    );
    expect(
      fromStories.map((move) => move.personId),
      "rent stances moved by a story about the town's conditions",
    ).toEqual([]);
  }, 900_000);

  it("moves a reader's rent stance toward the side they already hold, by what they read, over a played year", () => {
    const { api, town, shifted, moves } = play(true, 365);
    expect(shifted, "a web row was shifted").toBeTruthy();
    const next = `${shifted!.month.slice(0, 5)}${String(Number(shifted!.month.slice(5)) + 1).padStart(2, "0")}`;
    const wireId = `${OUTCOME_MONTH_KIND}:${town}:${next}`;
    const printed = api
      .moduleState(PRESS_MODULE_ID)
      .table("stories")
      .query("byWire", [wireId]) as unknown as { id: string }[];
    expect(printed.length, "outlets that printed the month").toBeGreaterThan(0);
    const storyIds = new Set(printed.map((story) => story.id));
    // Moves whose cause that day is a reading of that month's story.
    const read = moves
      .filter((move) => move.topic === RENT_QUESTION)
      .flatMap((move) =>
        move.today
          .filter((cause) =>
            storyIds.has(storyOfReadEvent(cause.eventId) ?? ""),
          )
          .map((cause) => ({ ...move, cause })),
      );
    expect(
      read.length,
      `readers moved by ${[...storyIds].join(", ")}`,
    ).toBeGreaterThan(0);
    for (const { personId, date, stance, cause, viewNow } of read) {
      const storyId = storyOfReadEvent(cause.eventId)!;
      // `news.read:<story>:<date>:<side>:<question>`.
      const side = /:\d{4}-\d{2}-\d{2}:(enact|repeal):/.exec(
        cause.eventId,
      )?.[1];
      const where = `${personId} on ${date} by ${cause.eventId}`;
      // Read in print: the cause names the story's news record, which the
      // reader knew when their stance moved.
      expect(cause.learnedFrom, where).toBe(newsKey(storyId));
      expect(cause.knewSource, where).toBe(true);
      expect(cause.rememberedPrint, `${where}: remembers who printed it`).toBe(
        true,
      );
      expect(cause.change, where).toBeGreaterThan(0);
      // Toward the side their own view held: the stance and the view sit on
      // the side the read event carried.
      expect(["enact", "repeal"], where).toContain(side);
      expect(stance.desiredChange, where).toBe(side);
      expect(Math.sign(viewNow), where).toBe(side === "enact" ? 1 : -1);
    }
    const first = read[0]!;
    console.log(
      `outcome news stance: ${place.name}, seed ${seed}: ${wireId} printed as ${[...storyIds].join(", ")}; ${new Set(read.map((r) => r.personId)).size} readers moved on ${RENT_QUESTION}, e.g. ${first.personId} by ${first.cause.eventId} (${first.cause.change.toFixed(4)}, learned from ${first.cause.learnedFrom})`,
    );
  }, 1_500_000);
  it("moves a reader's view through an ordinary year's condition stories: producer, month record, printed story, reader", () => {
    // No shift: whatever the engines move in a played year is what is heard.
    // A place where no condition story reached a reader is drawn again, a
    // bounded number of times.
    const tried: string[] = [];
    let at = { seed, key: place.key, name: `${place.name}, ${place.state}` };
    for (let draw = 0; draw < 3; draw += 1) {
      if (draw) {
        const next = drawPlace(`${seed}-ordinary-${draw}`, "outcome-news");
        at = {
          seed: `${seed}-ordinary-${draw}`,
          key: next.key,
          name: `${next.name}, ${next.state}`,
        };
      }
      const { api, shifted, moves } = play(false, 365, at);
      expect(shifted, "nothing was shifted").toBeNull();
      const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
      const read = moves.flatMap((move) =>
        move.today.flatMap((cause) => {
          const storyId = storyOfReadEvent(cause.eventId);
          const wire = storyId ? monthWireOf(api, storyId) : null;
          return storyId && wire ? [{ ...move, cause, storyId, wire }] : [];
        }),
      );
      if (!read.length) {
        tried.push(`${at.name} (${at.seed})`);
        continue;
      }
      for (const {
        personId,
        date,
        topic,
        stance,
        cause,
        viewNow,
        storyId,
        wire,
      } of read) {
        const where = `${at.name}, seed ${at.seed}: ${personId} on ${date} by ${cause.eventId}`;
        // The month record the story was made from reports a moved
        // condition that ties to this question, and stands on a web month
        // the engines wrote.
        const [, placeId, month] = wire.split(":");
        const row = months.get(`web:${placeId}:${month}`) as unknown as
          WebMonth | undefined;
        expect(row, `${where}: web month for ${wire}`).toBeTruthy();
        const tied = Object.keys(NEWS_MEASURES).filter(
          (measure) =>
            conditionQuestion(NEWS_MEASURES[measure]!.topic) === topic &&
            row!.values[measure] !== undefined,
        );
        expect(
          tied.length,
          `${where}: a condition of ${topic}`,
        ).toBeGreaterThan(0);
        expect(cause.learnedFrom, where).toBe(newsKey(storyId));
        expect(cause.knewSource, `${where}: knew the story`).toBe(true);
        expect(
          cause.rememberedPrint,
          `${where}: remembers who printed it`,
        ).toBe(true);
        expect(cause.change, where).toBeGreaterThan(0);
        expect(Math.sign(viewNow), where).toBe(
          stance.desiredChange === "enact" ? 1 : -1,
        );
      }
      const first = read[0]!;
      const [, placeId, month] = first.wire.split(":");
      const row = months.get(`web:${placeId}:${month}`) as unknown as WebMonth;
      const sources = Object.entries(row.engineSources)
        .filter(([, id]) => id)
        .map(([measure, id]) => `${measure} from ${id}`);
      console.log(
        `outcome news ordinary: ${at.name}, seed ${at.seed}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}: ${read.length} moves by ${new Set(read.map((r) => r.personId)).size} readers on ${[...new Set(read.map((r) => r.topic))].join(", ")}; e.g. ${first.personId} on ${first.topic} by ${first.cause.eventId} (${first.cause.change.toFixed(4)}), story ${first.storyId}, month record ${first.wire}, web month ${row.id} (${sources.slice(0, 3).join("; ")})`,
      );
      return;
    }
    throw new Error(
      `no condition story reached a reader in a year in 3 draws (${tried.join("; ")})`,
    );
  }, 2_400_000);
});
