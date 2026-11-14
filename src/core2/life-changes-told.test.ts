/**
 * A change in a person's life is told to their stance (SG-GOV-views-stand-in,
 * cut 2): the engines that act on the day a stance moves (the stance
 * listeners) hear of a job lost on the day it is lost, and of every other
 * change (a hire among them) at the first of the next month; and what a
 * candidate says on a question starts from the same reading a voter's view
 * does, their own circumstances included. Pinned to a named place and world
 * seed so it never passes or fails by the draw.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { candidateStance } from "./campaign-stances";
import { personStance } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { fullLifeStake } from "./life-stakes";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { layOffWorker } from "./modules/jobs";
import {
  lifeShift,
  openingRecord,
  stanceOn,
  viewOf,
  VIEWS_DATA,
} from "./modules/views";
import { registerStanceListener } from "./stance-listeners";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, PersonId, PersonState } from "./types";

// The place the life-stakes test draws (base seed lv5, purpose "life-stakes"):
// full workers who lose work, and full people out of work who find it, in the
// first six weeks.
const MARSHFIELD = {
  name: "Marshfield, Massachusetts",
  key: "2538820",
  seed: "75d9b7ad36560f47b03a252ae33001b88ec529e8f4871fa480acf053c7642a78",
};
const WORK_RULE =
  "us-policy-positions:health-human-services.medicaid-work-requirement";
const RENT = "us-policy-positions:housing-land-use.rent-stabilization";
const where = `${MARSHFIELD.name} (${MARSHFIELD.key}), seed ${MARSHFIELD.seed}`;

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

/** Every stance move the listeners hear, by person and question: the days it was heard. */
const heard = new Map<string, string[]>();
let watching: CoreState | undefined;
registerStanceListener((api: CoreAPI, personId: PersonId, topic: string) => {
  if (api.state !== watching) return;
  const key = `${personId}|${topic}`;
  heard.set(key, [...(heard.get(key) ?? []), api.state.date]);
});

const openJob = (core: CoreState, person: Readonly<PersonState>) => {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  return !!job && job.endsAt === undefined;
};
const firstOfNextMonth = (date: string) =>
  addDays(makeIsoDate(`${date.slice(0, 7)}-01`), 32).slice(0, 7) + "-01";

describe("a life change is told to the person's stance", () => {
  let core: CoreState;
  let api: CoreAPI;
  let town: string;
  /** Working-age full townspeople with a view, read at the opening. */
  let adults: PersonState[];
  const opening = new Map<string, { working: boolean }>();
  /** The first day each was seen with or without work, read each day. */
  const changedOn = new Map<string, { lost?: string; found?: string }>();

  beforeAll(() => {
    const built = buildBenchWorld(MARSHFIELD.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: MARSHFIELD.key,
    });
    core = built.core as CoreState;
    api = coreAPI(core);
    watching = core;
    town = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as { townPlaceId: string }
    ).townPlaceId;
    adults = [...core.people.values()].filter((person) => {
      const age = ageOnDate(person.birthDate, core.date);
      return (
        person.alive &&
        person.placeId === town &&
        age >= 18 &&
        age < 65 &&
        !!viewOf(api, person.id)
      );
    });
    for (const person of adults) {
      // Reading their circumstances is what the stance is first told.
      fullLifeStake(core, person);
      opening.set(person.id, { working: openJob(core, person) });
    }
    const end = addDays(makeIsoDate(core.date), 45);
    while (core.date < end) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const person of adults) {
        const now = core.people.get(person.id);
        if (!now?.alive) continue;
        const was = opening.get(person.id)!;
        const working = openJob(core, now);
        const seen = changedOn.get(person.id) ?? {};
        if (was.working && !working && !seen.lost) seen.lost = core.date;
        if (!was.working && working && !seen.found) seen.found = core.date;
        changedOn.set(person.id, seen);
      }
    }
  }, 180_000);

  it("work lost is heard by the first of the next month", () => {
    const lost = [...changedOn].filter(
      ([, seen]) =>
        seen.lost && firstOfNextMonth(seen.lost) <= core.date.slice(0, 10),
    );
    expect(lost.length, where).toBeGreaterThan(0);
    for (const [id, seen] of lost) {
      const days = heard.get(`${id}|${WORK_RULE}`) ?? [];
      const by = firstOfNextMonth(seen.lost!);
      expect(
        days.some((day) => day >= seen.lost! && day <= by),
        `${where}: ${id} lost work on ${seen.lost}, heard ${days.join(", ") || "never"}`,
      ).toBe(true);
    }
  });

  it("a layoff is heard the day it happens", () => {
    // Layoffs of full townspeople are rare in six weeks; one is staged
    // through the business's own layoff (dev mode's path), which writes the
    // same record and lost-job event as its review does.
    // A worker who played their day is let go the next day instead
    // (`layOffWorker`): the first who did not work today is picked.
    const workers = adults.filter((person) => {
      const now = core.people.get(person.id);
      return !!now?.alive && openJob(core, now);
    });
    let worker: PersonState | undefined;
    const passed: string[] = [];
    for (const person of workers) {
      const out = layOffWorker(api, core.people.get(person.id)!.jobId!);
      if (out && out !== "worked-today") {
        worker = person;
        break;
      }
      passed.push(`${person.id}: ${out}`);
    }
    expect(
      worker,
      `${where} on ${core.date}: no worker could be let go (${passed.join("; ")})`,
    ).toBeDefined();
    expect(
      heard.get(`${worker!.id}|${WORK_RULE}`) ?? [],
      `${where}: ${worker!.id} laid off on ${core.date}`,
    ).toContain(core.date);
  });

  it("work found is heard by the first of the next month", () => {
    const found = [...changedOn].filter(
      ([, seen]) =>
        seen.found && firstOfNextMonth(seen.found) <= core.date.slice(0, 10),
    );
    expect(found.length, where).toBeGreaterThan(0);
    for (const [id, seen] of found) {
      const days = heard.get(`${id}|${WORK_RULE}`) ?? [];
      const by = firstOfNextMonth(seen.found!);
      expect(
        days.some((day) => day >= seen.found! && day <= by),
        `${where}: ${id} found work on ${seen.found}, heard ${days.join(", ") || "never"}`,
      ).toBe(true);
    }
  });

  it("a candidate speaks from their own circumstances, as a voter's view does", () => {
    // Without a party, a candidate's stance is their own: their lean on the
    // question's axis, their faith and degree, their own circumstances, and
    // what they have heard.
    const people = adults.filter(
      (person) =>
        core.people.get(person.id)?.alive &&
        Math.abs(lifeShift(api, person.id, RENT)) > 0.01,
    );
    expect(people.length, where).toBeGreaterThan(5);
    const leanMax = VIEWS_DATA.parameters.leanMax!.value;
    for (const person of people.slice(0, 10)) {
      const lean = Math.max(
        -1,
        Math.min(1, viewOf(api, person.id)!.lean / leanMax),
      );
      const expected =
        personStance(lean, RENT) +
        (openingRecord(api, person.id, RENT)?.total ?? 0) +
        lifeShift(api, person.id, RENT) +
        stanceOn(api, person.id, RENT);
      expect(
        candidateStance(api, person.id, null, RENT),
        `${where}: ${person.id}`,
      ).toBeCloseTo(Math.max(-1, Math.min(1, expected)), 12);
    }
  });
});
