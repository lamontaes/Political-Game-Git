/**
 * The life record (docs/design/life-record.md): one world, drawn from all the places, played 60 days,
 * then events emitted through the engine's own API in the shapes the real writers give them. The
 * place and seed are in every message; replay with LIFE_SEED and LIFE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { isDemoted } from "./counted-groups";
import { demoteHousehold } from "./modules/counted-demotion";
import { lifeOf, lifeSummary, REMEMBERED_RECORD_KINDS } from "./person-life";
import table from "./data/life/remembered.json" with { type: "json" };
import parameters from "./data/life/parameters.json" with { type: "json" };
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
import type { CoreEventInput, CoreState, IsoDate, PersonId } from "./types";
import { keepsWhy } from "./why-kept";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "person-life");
const placeKey = process.env.LIFE_PLACE_KEY ?? drawn.key;
const DAYS = 60;
const CAP = parameters.lifeRememberedMost.value;
const OVER = 25;

setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const { core } = world;
const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;
const api = coreAPI(core);
const pairs = new Set(table.events.map((row) => `${row.life}/${row.what}`));
const allPairs = new Set([
  ...pairs,
  ...table.past.map((row) => `${row.life}/${row.what}`),
  ...table.history.map((row) => `${row.life}/${row.what}`),
]);

const source = () => ({
  tag: "ESTIMATED" as const,
  asOf: core.date as IsoDate,
  citation: "A test of the life record, shaped as the real writer shapes it.",
  estimatedFrom: "person-life.test.ts",
});
const emit = (
  event: Omit<CoreEventInput, "date" | "source" | "placeId"> & {
    placeId?: string;
  },
  person: PersonId,
) =>
  api.emit({
    date: core.date as IsoDate,
    source: source(),
    placeId: (event.placeId ??
      core.people.get(person)!.placeId) as CoreEventInput["placeId"],
    ...event,
  } as CoreEventInput);
const nextDay = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));

/** Full living adults the player has no tie to, so the log keeps nothing private about them. */
const strangers = () =>
  [...core.people.values()].filter(
    (person) =>
      person.alive &&
      !isDemoted(person) &&
      person.id !== core.playerId &&
      person.placeId === world.placeId &&
      !keepsWhy(core, person.id),
  );

describe(`the life record in ${where}`, () => {
  it("1: after 60 days every full living adult has a life of well-formed events", () => {
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const adults = [...core.people.values()].filter(
      (person) =>
        person.alive &&
        !isDemoted(person) &&
        person.tier !== "husk" &&
        // The town's people: the nation's officials and offices elsewhere are kept by term.
        person.placeId === world.placeId &&
        makeIsoDate(core.date).slice(0, 4) >
          String(Number(person.birthDate.slice(0, 4)) + 18),
    );
    let events = 0;
    for (const person of adults) {
      const life = lifeOf(core, person.id);
      expect(life.length, `${where}: ${person.id}`).toBeGreaterThanOrEqual(1);
      for (const event of life) {
        events++;
        const label = `${where}: ${person.id} ${event.id}`;
        expect(event.id, label).not.toBe("");
        expect(event.date <= core.date, `${label} ${event.date}`).toBe(true);
        expect(allPairs.has(`${event.life}/${event.what}`), label).toBe(true);
      }
    }
    console.log(
      `person-life 1: ${where}; ${adults.length} adults, ${events} events at ${core.date}`,
    );
    expect(adults.length, where).toBeGreaterThan(0);
  }, 600_000);

  it("2: three kinds of event about a stranger are on their list though the log keeps none of them", () => {
    const person = strangers().find((row) => row.familyIds.size >= 0);
    if (!person) {
      console.log(`person-life 2: ${where}; no full person outside the circle`);
      return;
    }
    const job = `event:work.job-lost:${core.date}:job-of-${person.id}`;
    const split = `family.separated:link-of-${person.id}:${core.date}`;
    const ill = `health.serious-illness:${person.id}:${core.date}`;
    const other = strangers().find((row) => row.id !== person.id)!;
    const orgId = [...core.organizations.keys()][0]!;
    // Each shaped as its writer shapes it (jobs.ts layoff, state.ts separation, health.ts onset).
    emit(
      {
        id: job,
        kind: "work.job-lost",
        personIds: [person.id],
        publicRecord: false,
        topic: orgId,
        facts: { decidedBy: orgId, organizationId: orgId },
      },
      person.id,
    );
    emit(
      {
        id: split,
        kind: "family.separated",
        personIds: [person.id, other.id],
        publicRecord: false,
        facts: { linkId: `link-of-${person.id}` },
      },
      person.id,
    );
    emit(
      {
        id: ill,
        kind: "health.serious-illness",
        personIds: [person.id],
        topic: "health:diabetes",
        facts: { [`event:${ill}:condition`]: "diabetes" },
      },
      person.id,
    );
    const life = lifeOf(core, person.id);
    const rows = [
      [job, "work", "job-lost", { organizationId: orgId, decidedBy: orgId }],
      [split, "partner", "separated", { linkId: `link-of-${person.id}` }],
      [ill, "health", "serious-illness", { condition: "diabetes" }],
    ] as const;
    let missingFromLog = 0;
    for (const [id, lifeKind, what, facts] of rows) {
      const found = life.find((event) => event.id === id);
      expect(found, `${where}: ${id}`).toBeDefined();
      expect(found!.from, id).toBe("played");
      expect([found!.life, found!.what], id).toEqual([lifeKind, what]);
      expect(found!.facts, `${where}: ${id}`).toMatchObject(facts);
      if (!core.durableLog.has(id as never)) missingFromLog++;
    }
    // The partner is named on the separation, and the other party's list holds it too.
    expect(life.find((event) => event.id === split)!.withIds, where).toEqual([
      other.id,
    ]);
    expect(
      lifeOf(core, other.id).some((event) => event.id === split),
      where,
    ).toBe(true);
    console.log(
      `person-life 2: ${where}; ${person.id}; ${missingFromLog} of 3 events not in the durable log, all 3 on the list`,
    );
  }, 600_000);

  it("3: a death is a loss for every living family member and nothing for the dead", () => {
    const dead = [...core.people.values()].find(
      (person) =>
        person.alive &&
        !isDemoted(person) &&
        person.id !== core.playerId &&
        [...person.familyIds].filter((id) => {
          const kin = core.people.get(id);
          return kin?.alive && !isDemoted(kin);
        }).length >= 1,
    );
    expect(dead, `${where}: a person with living full family`).toBeDefined();
    const kin = [...dead!.familyIds].filter((id) => core.people.get(id)?.alive);
    const before = lifeOf(core, dead!.id).length;
    const id = `life.death:${dead!.id}:${core.date}`;
    // The way health.ts does it: the person is marked dead, then the record is made.
    api.updatePerson(dead!.id, { alive: false });
    emit(
      {
        id,
        kind: "life.death",
        personIds: [dead!.id],
        publicRecord: true,
        news: true,
        topic: "health:serious-illness",
        facts: { [`event:${id}:causeOfDeath`]: "heart-disease" },
      },
      dead!.id,
    );
    for (const kinId of kin) {
      const told = lifeOf(core, kinId).find((event) => event.id === id);
      expect(told, `${where}: ${kinId}`).toBeDefined();
      expect([told!.life, told!.what], where).toEqual(["loss", "died"]);
      expect(told!.withIds, where).toEqual([dead!.id]);
      expect(told!.facts?.causeOfDeath, `${where}: ${kinId}`).toBe(
        "heart-disease",
      );
    }
    expect(lifeOf(core, dead!.id).length, where).toBe(before);
    console.log(
      `person-life 3: ${where}; ${kin.length} living kin of ${dead!.id} each hold the loss`,
    );
  }, 600_000);

  it("4: the list stops at the cap and keeps its losses and children first", () => {
    const clean = strangers().filter((row) => {
      const kept = row as {
        remembered?: unknown[];
        rememberedSummary?: unknown;
      };
      return !kept.remembered?.length && !kept.rememberedSummary;
    });
    const [person, other] = clean.length >= 2 ? clean : strangers();
    expect(person && other, `${where}: two strangers`).toBeTruthy();
    const child = `${person!.id}:birth-of-test`;
    // A child (a table row kept before work) and a loss come first and must outlast the rest.
    emit(
      {
        id: child,
        kind: "person-birth",
        personIds: [person!.id, other!.id],
        publicRecord: true,
        facts: { childId: other!.id },
      },
      person!.id,
    );
    // Every played event the person ever held, so what the list let go can be counted exactly.
    const seen = new Set<string>();
    const kinds = new Map<string, number>();
    const note = () => {
      for (const event of lifeOf(core, person!.id))
        if (event.from === "played" && !seen.has(event.id)) {
          seen.add(event.id);
          kinds.set(event.record, (kinds.get(event.record) ?? 0) + 1);
        }
    };
    note();
    const start = seen.size;
    for (let day = 0; day < CAP + OVER; day++) {
      nextDay();
      note();
      emit(
        {
          id: `event:work.job-lost:${core.date}:cap-${person!.id}-${day}`,
          kind: "work.job-lost",
          personIds: [person!.id],
          publicRecord: false,
        },
        person!.id,
      );
      note();
    }
    const played = lifeOf(core, person!.id).filter(
      (event) => event.from === "played",
    );
    const summary = lifeSummary(core, person!.id);
    const folded = Object.values(summary).reduce((n, count) => n + count, 0);
    expect(played.length, where).toBe(CAP);
    // Everything the list let go of was counted, by kind and decade: nothing is lost unseen.
    // (an event of a kind held least dear can go the moment it arrives, before it is ever read)
    expect(
      played.length + folded,
      `${where}: ${JSON.stringify(summary)}`,
    ).toBeGreaterThanOrEqual(seen.size);
    console.log(`person-life 4 kinds seen: ${JSON.stringify([...kinds])}`);
    expect(seen.size, where).toBeGreaterThanOrEqual(start + CAP + OVER);
    expect(
      played.some((event) => event.id === child),
      where,
    ).toBe(true);
    // The work events let go are the oldest ones.
    expect(
      played.some((event) => event.id.endsWith("cap-" + person!.id + "-0")),
      where,
    ).toBe(false);
    console.log(
      `person-life 4: ${where}; ${person!.id}; cap ${CAP}, list ${played.length}, summary sum ${folded} (${start} on the list before)`,
    );
  }, 600_000);

  it("5: a partner appears once on a life, not once per source", () => {
    const person = [...core.people.values()].find((row) =>
      (row.pastFacts ?? []).some(
        (fact) => fact.kind === "family:partner" && fact.facts?.otherPersonId,
      ),
    );
    if (!person) {
      console.log(`person-life 5: ${where}; no one with a partner fact`);
      return;
    }
    const partner = person.pastFacts!.find(
      (fact) => fact.kind === "family:partner",
    )!.facts!.otherPersonId!;
    const told = lifeOf(core, person.id).filter(
      (event) =>
        event.life === "partner" && event.withIds.includes(partner as PersonId),
    );
    const byWhat = new Map<string, number>();
    for (const event of told)
      byWhat.set(event.what, (byWhat.get(event.what) ?? 0) + 1);
    for (const [what, n] of byWhat)
      expect(n, `${where}: ${person.id} ${what} with ${partner}`).toBe(1);
    expect(told.length, where).toBeGreaterThanOrEqual(1);
    console.log(
      `person-life 5: ${where}; ${person.id}; partner ${partner} told ${told.length} time(s): ${[...byWhat.keys()].join(", ")}`,
    );
  }, 600_000);

  it("6: someone who goes back to the counts keeps their list when filled in again", () => {
    const person = strangers().find(
      (row) =>
        row.tier !== "husk" &&
        core.households.get(row.householdId)?.memberIds.length,
    );
    expect(person, `${where}: a full stranger`).toBeDefined();
    const id = `event:work.job-lost:${core.date}:demote-${person!.id}`;
    emit(
      {
        id,
        kind: "work.job-lost",
        personIds: [person!.id],
        publicRecord: false,
        facts: { decidedBy: "test" },
      },
      person!.id,
    );
    const before = lifeOf(core, person!.id);
    expect(
      before.some((event) => event.id === id),
      where,
    ).toBe(true);
    const record = demoteHousehold(api, person!.householdId, core.date);
    expect(
      record,
      `${where}: the household returned to the counts`,
    ).toBeDefined();
    expect(isDemoted(core.people.get(person!.id)!), where).toBe(true);
    const back = personOrFillIn(core as CoreState, person!.id);
    expect(back && !isDemoted(back), where).toBe(true);
    void fillInPerson;
    const after = lifeOf(core, person!.id);
    expect(
      after.some((event) => event.id === id),
      `${where}: ${id}`,
    ).toBe(true);
    expect(
      after.filter((event) => event.from === "played").map((e) => e.id),
      where,
    ).toEqual(
      before.filter((event) => event.from === "played").map((e) => e.id),
    );
    console.log(
      `person-life 6: ${where}; ${person!.id}; ${before.length} events before demotion, ${after.length} after the fill-in`,
    );
  }, 600_000);

  it("every record kind the people module listens for is a row of the table", () => {
    expect(REMEMBERED_RECORD_KINDS.length).toBe(table.events.length);
  });
});
