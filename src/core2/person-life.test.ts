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
import { canReturnToCounts, demoteHousehold } from "./modules/counted-demotion";
import { residentsRuntime } from "./modules/residents";
import { openWholePast } from "./modules/people";
import { lifeOf, lifeSummary, REMEMBERED_RECORD_KINDS } from "./person-life";
import table from "./data/life/remembered.json" with { type: "json" };
import parameters from "./data/life/parameters.json" with { type: "json" };
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
import type {
  CoreEventInput,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
} from "./types";
import { keepsWhy } from "./why-kept";
import { ELECTION_CHIEF_POST } from "./modules/executive";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "person-life");
const placeKey = process.env.LIFE_PLACE_KEY ?? drawn.key;
const DAYS = 60;
const CAP = parameters.lifeRememberedMost.value;
const OVER = 25;
/** A town with fewer adults than this is too small for "under a twentieth" to mean anyone. */
const SMALL_TOWN_ADULTS = 100;
/** The most people with no life yet that a town of under 100 adults may hold. */
const ROLE_HOLDERS_MOST = 4;
/** How many counted households a search may fill in before it gives up. */
const FILL_IN_MOST = 40;

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

/**
 * A full living person outside the player's circle who fits. Where the town
 * has none (a very small town can be all circle and officials), its counted
 * households are filled in one at a time, as the game does when the player
 * comes across someone, until one fits.
 */
function strangerWho(
  fits: (row: PersonState) => boolean,
): PersonState | undefined {
  const full = strangers().find((row) => row.tier !== "husk" && fits(row));
  if (full) return full;
  const rt = residentsRuntime(core as CoreState);
  if (!rt) return undefined;
  const heads: PersonId[] = [];
  for (const h of rt.store.liveHouseholds()) {
    if (h.placeId !== world.placeId || h.quarters) continue;
    const member = rt.store.countedMembers(h)[0];
    if (member !== undefined) heads.push(rt.store.ids[member]! as PersonId);
  }
  for (const id of heads.sort().slice(0, FILL_IN_MOST)) {
    const made = fillInPerson(core as CoreState, id);
    if (made.alive && !keepsWhy(core, made.id) && fits(made)) return made;
  }
  return undefined;
}

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
    // People an engine made for a role with no past of their own (a newspaper's owner): their
    // life is empty until the whole-life past gives them one (SG-PEOPLE-role-people-have-no-past).
    const pastless: string[] = [];
    for (const person of adults) {
      const life = lifeOf(core, person.id);
      if (!life.length) {
        expect(
          (person.pastFacts ?? []).length,
          `${where}: ${person.id} has past facts and no life`,
        ).toBe(0);
        pastless.push(person.id);
        continue;
      }
      for (const event of life) {
        events++;
        const label = `${where}: ${person.id} ${event.id}`;
        expect(event.id, label).not.toBe("");
        expect(event.date <= core.date, `${label} ${event.date}`).toBe(true);
        expect(allPairs.has(`${event.life}/${event.what}`), label).toBe(true);
      }
    }
    process.stdout.write(
      `person-life 1: ${where}; ${adults.length} adults, ${events} events at ${core.date}; made without a past: ${pastless.length} ${JSON.stringify(pastless.slice(0, 3))}\n`,
    );
    expect(adults.length, where).toBeGreaterThan(0);
    expect(events, where).toBeGreaterThan(0);
    // The people with no life yet are few: the holders of a role an engine fills (a paper's
    // owner), and someone very old whose whole life lies before the years the past covers
    // (Kapolei, Hawaii: a woman of 99 living alone; the whole-life past gives her one when
    // her card is opened). Under a twentieth of the adults in a town of any size, and in a
    // town too small for a twentieth to be one person, no more than a handful.
    // The whole-life past closes that gap when a person is opened: after their card's own
    // call, every one of them has a life.
    const stillEmpty = pastless.filter((id) => {
      openWholePast(core as CoreState, id as PersonId);
      return lifeOf(core, id as PersonId).length === 0;
    });
    process.stdout.write(
      `person-life 1: ${where}; after opening their whole past: ${pastless.map((id) => `${id} ${lifeOf(core, id as PersonId).length} events`).join(", ") || "nobody had none"}\n`,
    );
    expect(
      stillEmpty,
      `${where}: no life even after their whole past was opened`,
    ).toEqual([]);
    if (adults.length >= SMALL_TOWN_ADULTS)
      expect(
        pastless.length,
        `${where}: ${pastless.length} of ${adults.length} adults: ${pastless.join(", ")}`,
      ).toBeLessThan(adults.length / 20);
    else
      expect(
        pastless.length,
        `${where}: ${pastless.length} of ${adults.length} adults: ${pastless.join(", ")}`,
      ).toBeLessThanOrEqual(ROLE_HOLDERS_MOST);
  }, 600_000);

  it("2: three kinds of event about a stranger are on their list though the log keeps none of them", () => {
    const person = strangerWho(() => true)!;
    expect(
      person,
      `${where}: no person outside the player's circle, full or counted`,
    ).toBeDefined();
    const job = `event:work.job-lost:${core.date}:job-of-${person.id}`;
    const split = `family.separated:link-of-${person.id}:${core.date}`;
    const ill = `health.serious-illness:${person.id}:${core.date}`;
    // A second stranger for the other side of the separation.
    const other = strangerWho((row) => row.id !== person.id)!;
    expect(
      other,
      `${where}: no second person outside the circle`,
    ).toBeDefined();
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

  it("2b: a vote names every candidate; the winner remembers winning it and the others remember losing it", () => {
    const [winner, loser] = strangers();
    expect(winner && loser, `${where}: two strangers`).toBeTruthy();
    const id = `election-result:test-${winner!.id}`;
    emit(
      {
        id,
        kind: "election-result",
        personIds: [winner!.id, loser!.id],
        publicRecord: true,
        news: true,
        facts: {
          contestId: "contest-test",
          office: "Council Member",
          winnerId: winner!.id,
          totals: JSON.stringify({ [winner!.id]: 120, [loser!.id]: 80 }),
        },
      },
      winner!.id,
    );
    const won = lifeOf(core, winner!.id).find((event) => event.id === id);
    expect([won?.life, won?.what], `${where}: ${winner!.id}`).toEqual([
      "politics",
      "won",
    ]);
    expect(won?.facts?.office, where).toBe("Council Member");
    // The loser does not remember winning: the same vote is on their list as a loss.
    const lost = lifeOf(core, loser!.id).find((event) => event.id === id);
    expect(
      [lost?.life, lost?.what],
      `${where}: ${loser!.id} lost and remembers losing, not winning`,
    ).toEqual(["politics", "lost"]);
    expect(lost?.facts?.office, where).toBe("Council Member");
    // Their own count and the winner's, not the whole count.
    expect(lost?.facts, where).toMatchObject({
      votes: "80",
      winnerVotes: "120",
    });
    expect(lost?.facts?.totals, where).toBeUndefined();
  }, 600_000);

  it("3: a death is a loss for every living family member and the person's own last event", () => {
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
    // The dead person's own list holds the death once, as `death`/`died` with its cause.
    const own = lifeOf(core, dead!.id).filter((event) => event.id === id);
    expect(own.length, `${where}: ${id} on ${dead!.id}'s own list`).toBe(1);
    expect([own[0]!.life, own[0]!.what], where).toEqual(["death", "died"]);
    expect(own[0]!.facts?.causeOfDeath, where).toBe("heart-disease");
    expect(lifeOf(core, dead!.id).length, where).toBe(before + 1);
    for (const kinId of kin)
      expect(
        lifeOf(core, kinId).filter((event) => event.id === id).length,
        `${where}: ${kinId} says the loss once`,
      ).toBe(1);
    console.log(
      `person-life 3: ${where}; ${kin.length} living kin of ${dead!.id} each hold the loss`,
    );
  }, 600_000);

  // What the person's own list holds: the jobs read from the jobs engine's change records are not on it.
  const isRemembered = (event: { from: string; record: string }) =>
    event.from === "played" && !event.record.startsWith("job-change:");

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
        if (isRemembered(event) && !seen.has(event.id)) {
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
    const played = lifeOf(core, person!.id).filter(isRemembered);
    const summary = lifeSummary(core, person!.id);
    const folded = Object.values(summary).reduce((n, count) => n + count, 0);
    // Exactly the cap, also when one of the engine's own records of the same
    // kind falls on a day this test wrote one (Seville, Ohio, seed
    // 8e2ff1bb8253966b): two records are two events.
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
    const partnerOf = (row: PersonState) =>
      (row.pastFacts ?? []).find(
        (fact) => fact.kind === "family:partner" && fact.facts?.otherPersonId,
      )?.facts?.otherPersonId as PersonId | undefined;
    // Everyone built or recorded with a partner, wherever they live: someone
    // who partnered in play holds both the fact and the remembered record.
    const partnered = [...core.people.values()].filter(
      (row) => row.alive && partnerOf(row),
    );
    if (!partnered.length) {
      const filled = strangerWho((row) => Boolean(partnerOf(row)));
      if (filled) partnered.push(filled);
    }
    expect(
      partnered.length,
      `${where}: nobody, full or among ${FILL_IN_MOST} counted households filled in, has a partner`,
    ).toBeGreaterThan(0);
    let inPlay = 0;
    for (const person of partnered) {
      const partner = partnerOf(person)!;
      const told = lifeOf(core, person.id).filter(
        (event) => event.life === "partner" && event.withIds.includes(partner),
      );
      const byWhat = new Map<string, number>();
      for (const event of told)
        byWhat.set(event.what, (byWhat.get(event.what) ?? 0) + 1);
      for (const [what, n] of byWhat)
        expect(n, `${where}: ${person.id} ${what} with ${partner}`).toBe(1);
      expect(told.length, `${where}: ${person.id}`).toBeGreaterThanOrEqual(1);
      if (told.some((event) => event.from === "played")) inPlay += 1;
    }
    process.stdout.write(
      `person-life 5: ${where}; ${partnered.length} people with a partner, each told once (${inPlay} partnered in play)\n`,
    );
  }, 600_000);

  it("6: someone who goes back to the counts keeps their list when filled in again", () => {
    // A full person outside the player's circle whose household can go back
    // today. Where the town has no such full household (a very small town can
    // have none), one of its counted households is filled in first, as the
    // game does when the player comes across someone. A household whose
    // member worked today cannot go back until a day off, so the search steps
    // on a day at a time, up to a week.
    const find = () =>
      strangerWho((row) => canReturnToCounts(api, row.householdId).ok);
    let person = find();
    for (let day = 0; !person && day < 7; day += 1) {
      nextDay();
      person = find();
    }
    expect(
      person,
      `${where}: no household outside the player's circle, full or counted, could go back to the counts on any of eight days`,
    ).toBeDefined();
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
    process.stdout.write(
      `person-life 6: ${where}; ${person!.id}; ${before.length} events before demotion, ${after.length} after the fill-in`,
    );
  }, 600_000);

  it("7: a person made to hold a role, opened, has a birthplace and the work that led to the role", () => {
    // The state's election chief: drawn from the world's seed, placed in the
    // state, which keeps no business of its own (executive.ts seatElectionChief).
    // Pinned: the stopgap's own repro, Hewitt, Wisconsin (5534250), seed
    // b8f4c36df5632058, whatever place the other cases drew.
    const pinned = drawPlace("b8f4c36df5632058", "person-life");
    const pinnedWorld = buildBenchWorld(pinned.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: pinned.key,
    });
    const pcore = pinnedWorld.core;
    const where = `${pinnedWorld.place.displayName} (${pinned.key}), seed b8f4c36df5632058`;
    const chief = [...pcore.people.values()].find(
      (person) =>
        person.alive && person.jobId?.includes(`:${ELECTION_CHIEF_POST}:`),
    );
    expect(chief, `${where}: no election chief`).toBeDefined();
    const role = pcore.jobs.get(chief!.jobId!);
    expect(role, `${where}: ${chief!.id} holds no job`).toBeDefined();
    openWholePast(pcore as CoreState, chief!.id);
    const life = lifeOf(pcore, chief!.id);
    const label = `${where}: ${chief!.id} ${life.map((e) => `${e.life}/${e.what}`).join(", ")}`;
    expect(life.length, label).toBeGreaterThanOrEqual(4);
    // Born where they live, as every opening resident's birthplace defaults to home.
    expect(
      life.some((event) => event.life === "born"),
      label,
    ).toBe(true);
    expect(
      chief!.pastFacts?.find((row) => row.kind === "birthplace")?.facts
        ?.placeId,
      label,
    ).toBe(chief!.placeId);
    // Work before the role: an earlier post at the same organization, left for the role.
    const earlier = life.filter(
      (event) =>
        event.life === "work" &&
        event.what === "job-started" &&
        event.facts?.organizationId === role!.organizationId &&
        event.facts?.end === "moved-on",
    );
    expect(earlier.length, label).toBeGreaterThan(0);
    // The same life when opened again.
    openWholePast(pcore as CoreState, chief!.id);
    expect(
      lifeOf(pcore, chief!.id).map((event) => event.id),
      label,
    ).toEqual(life.map((event) => event.id));
    process.stdout.write(
      `person-life 7: ${where}; ${chief!.id}: ${life.map((e) => `${e.life}/${e.what}@${e.date}`).join(", ")}\n`,
    );
  }, 600_000);

  it("every record kind the people module listens for is a row of the table", () => {
    // A kind can have more than one row (a vote is won by one and lost by the rest).
    expect([...REMEMBERED_RECORD_KINDS].sort()).toEqual(
      [...new Set(table.events.map((row) => row.record))].sort(),
    );
  });
});
