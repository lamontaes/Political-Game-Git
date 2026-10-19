import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "../core2/life";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { comparePlayerMomentsV1 } from "../core2/player-stops-v1";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import type { PlayerPacketV1 } from "../core2/player-v1";
import type {
  CoreInput,
  CoreModule,
  CoreState,
  PersonInput,
  Source,
} from "../core2/types";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { createDirector, DEFAULT_DIRECTOR_DATA } from "./ledger";
import {
  paceOf,
  scheduleMoment,
  SITUATION_LIBRARY,
  type SituationLibrary,
} from "./scheduling";
import { DIRECTOR_STOPGAPS, openDirectorStopgapCount } from "./stopgaps";
import type { DirectorData } from "./types";

const startedAt = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation: "Controlled small director-contract input, not observed people.",
  estimatedFrom: "Authored fixture identities, jobs and contacts.",
};
const risk = "people-mind-v1:risk";
const sociability = "people-mind-v1:sociability";
const employer = "organization:director-fixture-store";

function person(
  id: string,
  placeId: string,
  overrides: Partial<PersonInput> = {},
): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1970-01-01",
    placeId,
    countyId: `${placeId}:county`,
    householdId: `household:${id}`,
    tier: "daily",
    traits: {},
    liquidMinor: P.zero,
    livingCostDailyMinor: P.zero,
    familyIds: [],
    knownIds: [],
    source,
    ...overrides,
  };
}

/** A worker, a spouse sharing her household, a neighbor, and an old classmate. */
function town(placeId: string): CoreInput {
  const worker = person("person:worker", placeId, {
    householdId: "household:worker",
    traits: { [risk]: -1, [sociability]: 0 },
    jobId: "job:worker",
    familyIds: ["person:spouse"],
    knownIds: ["person:spouse", "person:classmate"],
    knownIdSources: {
      "person:classmate": {
        sourceFactId: "fact:worker:high-school",
        learnedAt: "1984-08-27",
      },
    },
    pastFacts: [
      {
        id: "fact:worker:high-school",
        date: "1984-08-27",
        kind: "school:cohort-estimate",
        summary: "High school cohort",
        source,
      },
      {
        id: "fact:worker:era",
        date: "2008-12-01",
        kind: "era:public-context",
        summary: "Public economic context",
        source,
      },
    ],
  });
  const spouse = person("person:spouse", placeId, {
    householdId: "household:worker",
    traits: { [risk]: 1 },
    familyIds: ["person:worker"],
    knownIds: ["person:worker"],
  });
  const neighbor = person("person:neighbor", placeId);
  const classmate = person("person:classmate", placeId, {
    knownIds: ["person:worker"],
  });
  return {
    seed: "p13-director-contract",
    startedAt,
    people: [worker, spouse, neighbor, classmate],
    households: [
      {
        id: "household:worker",
        placeId,
        memberIds: [worker.id, spouse.id],
        source,
      },
      {
        id: neighbor.householdId,
        placeId,
        memberIds: [neighbor.id],
        source,
      },
      {
        id: classmate.householdId,
        placeId,
        memberIds: [classmate.id],
        source,
      },
    ],
    jobs: [
      {
        id: "job:worker",
        personId: worker.id,
        organizationId: employer,
        title: "Cashier",
        wageDailyMinor: P.minorPerDollar * P.percent,
        hoursDaily: P.zero,
        source,
      },
    ],
    organizations: [
      {
        id: employer,
        name: "Fixture store",
        kind: "employer",
        placeId,
        liquidMinor: P.zero,
        source,
      },
    ],
    familyLinks: [
      {
        id: "link:partner",
        kind: "partner",
        personIds: [worker.id, spouse.id],
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

/**
 * The fixture world, not the director: on a chosen date the store closes and
 * the core's public event names its worker. Contact comes from the core's own
 * decisions.
 */
function fixtureWorld(placeId: string): CoreModule {
  return {
    id: "fixture-world",
    onAfterDay(api) {
      if (api.state.date === "2021-01-10") {
        const job = api.state.jobs.get("job:worker")!;
        (job as { endsAt?: string }).endsAt = api.state.date;
        delete (api.state.people.get("person:worker") as { jobId?: string })
          .jobId;
        api.emit({
          id: `fixture-closed:${api.state.date}`,
          date: api.state.date,
          kind: "organization.closed",
          personIds: ["person:worker"],
          placeId,
          publicRecord: true,
          source,
        });
      }
    },
  };
}

function run(placeId: string, withDirector: boolean, data?: DirectorData) {
  const director = createDirector({
    watch: ["person:worker", "person:spouse", "person:neighbor"],
    ...(data ? { data } : {}),
  });
  const core = createLifeCore(town(placeId), {
    scheduledWork: false,
    modules: [
      // The director runs after the fixture world, as it runs after the core's own modules.
      fixtureWorld(placeId),
      ...(withDirector ? [director.module] : []),
    ],
  });
  if (withDirector) director.start(core);
  advanceCore(core, "2021-01-15");
  return { core, director };
}

function coreFingerprint(core: CoreState): string {
  const people = [...core.people.values()].map((row) => ({
    id: row.id,
    affect: row.affect,
    liquid: row.liquidMinor,
    job: row.jobId,
    acts: row.actCount,
    last: row.lastChoice,
  }));
  const ties = [...core.relationships.values()].map((row) => ({ ...row }));
  return createHash("sha256")
    .update(
      JSON.stringify({
        people,
        ties,
        events: [...core.eventIds].sort(),
        log: [...core.durableLog.keys()].sort(),
        stopgaps: [...core.stopgapHits].sort(),
      }),
    )
    .digest("hex");
}

describe("story director on the new core", () => {
  it("reads the core without changing it", () => {
    const place = "place:director-fixture";
    expect(coreFingerprint(run(place, true).core)).toBe(
      coreFingerprint(run(place, false).core),
    );
  });

  it("sizes a store closure by each person's traits and fans it out as a broad event", () => {
    const { director } = run("place:director-fixture", true);
    const worker = director.ledger.people.get("person:worker")!;
    const spouse = director.ledger.people.get("person:spouse")!;
    const neighbor = director.ledger.people.get("person:neighbor")!;
    const loss = worker.moments.find((row) => row.causeKind === "job-ended")!;
    // 0.47 x all of the household's pay x (1 + (-1/3) x (-0.25)).
    expect(loss.impact).toBeCloseTo(0.47 * (1 + 0.25 / 3), 6);
    expect(loss.broadEventId).toBe("fixture-closed:2021-01-10");
    const shared = spouse.moments.find((row) => row.causeKind === "job-ended")!;
    expect(shared.impact).toBeCloseTo(0.47 * (1 - 0.25 / 3), 6);
    expect(shared.counterpartIds).toEqual(["person:worker"]);
    expect(neighbor.moments).toHaveLength(0);
    const record = director.ledger.broadEvents.get(
      "fixture-closed:2021-01-10",
    )!;
    expect(
      Object.fromEntries(
        record.reached.map((row) => [row.personId, row.reach]),
      ),
    ).toEqual({
      "person:worker": "named",
      "person:spouse": "household",
      "person:neighbor": "place",
    });
    for (const book of [worker, spouse, neighbor])
      expect(
        book.backdrop.some(
          (row) => row.sourceId === "fixture-closed:2021-01-10",
        ),
      ).toBe(true);
  });

  it("keeps an old classmate as a known fact and renews the thread without a stored moment", () => {
    const { director } = run("place:director-fixture", true);
    const worker = director.ledger.people.get("person:worker")!;
    const fact = worker.keptFacts.get(
      "knew-each-other:person:classmate:person:worker",
    )!;
    expect(fact).toMatchObject({ since: "1984-08-27", sinceBasis: "recorded" });
    const thread = worker.threads.get("person:classmate")!;
    // The first contact in 37 years renews the thread; it is too small to store.
    expect(thread.turns[0]?.turn).toBe("renewed");
    expect(thread.lastContact).toBeDefined();
    expect(worker.belowFloor.get("tie:contact:contact")).toBeGreaterThan(0);
    expect(
      worker.moments.some((row) =>
        row.counterpartIds.includes("person:classmate"),
      ),
    ).toBe(false);
    expect(
      worker.backdrop.some((row) => row.sourceId === "fact:worker:era"),
    ).toBe(true);
  });

  it("starts a housemate's thread at the opening, not at the younger one's birth", () => {
    const place = "place:director-fixture";
    const base = town(place);
    const lodger = person("person:lodger", place, {
      householdId: "household:worker",
      birthDate: "1999-01-01",
    });
    const input: CoreInput = {
      ...base,
      people: [...base.people, lodger],
      households: base.households.map((row) =>
        row.id === "household:worker"
          ? { ...row, memberIds: [...row.memberIds, lodger.id] }
          : row,
      ),
    };
    const director = createDirector({ watch: ["person:worker"] });
    const meet: CoreModule = {
      id: "fixture-meeting",
      onAfterDay(api) {
        if (api.state.date === "2021-01-03")
          api.relationship(
            "person:lodger",
            "person:worker",
            "contact",
            api.parameter("relationContactGain"),
          );
      },
    };
    const core = createLifeCore(input, {
      scheduledWork: false,
      modules: [meet, director.module],
    });
    director.start(core);
    advanceCore(core, "2021-01-04");
    const worker = director.ledger.people.get("person:worker")!;
    expect(
      worker.keptFacts.get("knew-each-other:person:lodger:person:worker"),
    ).toMatchObject({ since: startedAt, sinceBasis: "opening" });
    expect(worker.threads.get("person:lodger")!.turns[0]?.turn).toBe("started");
    expect(
      worker.moments
        .flatMap((row) => row.echoes)
        .filter((row) => row.otherId === "person:lodger"),
    ).toEqual([]);
  });

  it("reads an event's feeling once, averaging the core's mood and stress signals", () => {
    const place = "place:director-fixture";
    const director = createDirector({ watch: ["person:neighbor"] });
    const news: CoreModule = {
      id: "fixture-news",
      onAfterDay(api) {
        if (api.state.date === "2021-01-02")
          api.emit({
            id: "fixture-news:2021-01-02",
            date: api.state.date,
            kind: "fixture.news",
            personIds: ["person:neighbor"],
            placeId: place,
            moodImpulse: -0.63,
            stressImpulse: 0.63,
            source,
          });
      },
    };
    const core = createLifeCore(town(place), {
      scheduledWork: false,
      modules: [news, director.module],
    });
    director.start(core);
    advanceCore(core, "2021-01-03");
    const [moment] = director.ledger.people.get("person:neighbor")!.moments;
    expect(moment).toMatchObject({
      label: "feeling:event:fixture.news",
      causeId: "fixture-news:2021-01-02",
    });
    expect(moment!.impact).toBeCloseTo(0.63, 6);
  });

  it("stores no moment on quiet days", () => {
    const { director } = run("place:director-fixture", true);
    const neighbor = director.ledger.people.get("person:neighbor")!;
    expect(neighbor.observedDays).toBe(14);
    expect(neighbor.quietDays).toBe(14);
  });

  it("gives family a standing tie and fades a friend faster than kin", () => {
    const { director } = run("place:director-fixture", true);
    const thread = director.ledger.people
      .get("person:worker")!
      .threads.get("person:spouse")!;
    expect(thread.kin).toEqual(["partner"]);
    expect(
      director.ledger.people
        .get("person:worker")!
        .keptFacts.get("knew-each-other:person:spouse:person:worker"),
    ).toMatchObject({ since: startedAt, sinceBasis: "opening" });
    expect(thread.tie).toBeCloseTo(0.79 + 0.3, 6);
    const later = "2022-07-01";
    expect(
      director.fading("person:worker", "person:classmate", later),
    ).toBeGreaterThan(director.fading("person:worker", "person:spouse", later));
  });

  it("ends a lie the day its deceived person learns the fact it denies", () => {
    const data: DirectorData = {
      ...DEFAULT_DIRECTOR_DATA,
      keptFactKinds: DEFAULT_DIRECTOR_DATA.keptFactKinds.map((row) =>
        row.id === "lie" ? { ...row, producedBy: ["fixture.lie-told"] } : row,
      ),
    };
    const director = createDirector({ watch: ["person:worker"], data });
    const place = "place:director-fixture";
    const liar: CoreModule = {
      id: "fixture-liar",
      onAfterDay(api) {
        const at = (kind: string, facts?: Record<string, string>) =>
          api.emit({
            id: `${kind}:${api.state.date}`,
            date: api.state.date,
            kind,
            personIds:
              kind === "fixture.lie-told"
                ? ["person:spouse", "person:worker"]
                : ["person:worker"],
            placeId: place,
            topic: "fixture:debt",
            source,
            ...(facts ? { facts } : {}),
          });
        if (api.state.date === "2021-01-03") at("fixture.lie-told");
        if (api.state.date === "2021-01-08")
          at("fixture.record-found", { "fixture:debt": "owed" });
      },
    };
    const core = createLifeCore(town(place), {
      scheduledWork: false,
      modules: [liar, director.module],
    });
    director.start(core);
    advanceCore(core, "2021-01-10");
    const lie = director.ledger.people
      .get("person:worker")!
      .keptFacts.get("lie:fixture.lie-told:2021-01-03")!;
    expect(lie).toMatchObject({
      holderId: "person:spouse",
      otherId: "person:worker",
      endedAt: "2021-01-08",
      endedBy: "fixture.record-found:2021-01-08",
    });
  });

  it("applies one rule in all 56 places", () => {
    const places = corePlaceStateIdentities().map((state) => state.usps);
    expect(places).toHaveLength(56);
    const shape = (placeId: string) => {
      const { director } = run(`place:${placeId}`, true);
      return [...director.ledger.people.values()].map((book) => ({
        id: book.personId,
        moments: book.moments.map((row) => [row.date, row.label, row.impact]),
        backdrop: book.backdrop.map((row) => row.reach),
        quiet: book.quietDays,
      }));
    };
    const first = shape(places[0]!);
    for (const placeId of places.slice(1))
      expect(shape(placeId)).toEqual(first);
  });

  it("registers every stopgap it marks and keeps numbers in data", () => {
    const ids = new Set(DIRECTOR_STOPGAPS.map((row) => row.id));
    for (const row of Object.values(DEFAULT_DIRECTOR_DATA.parameters)) {
      expect(["SOURCED", "ESTIMATED", "TUNABLE"]).toContain(row.tag);
      if (row.tag === "TUNABLE")
        expect(row.stopgapId && row.checkRange).toBeTruthy();
      if (row.stopgapId) expect(ids.has(row.stopgapId)).toBe(true);
    }
    // A resolved row says how it was resolved; the rest stay open.
    const resolved = DIRECTOR_STOPGAPS.filter(
      (row) => row.status === "resolved",
    );
    for (const row of resolved) expect(row.why).toMatch(/Resolved/);
    expect(openDirectorStopgapCount()).toBe(
      DIRECTOR_STOPGAPS.length - resolved.length,
    );
    const folder = join(process.cwd(), "src", "director");
    const literals: string[] = [];
    for (const name of readdirSync(folder)) {
      if (
        !name.endsWith(".ts") ||
        name.endsWith(".test.ts") ||
        name.includes("config")
      )
        continue;
      const text = readFileSync(join(folder, name), "utf8");
      const file = ts.createSourceFile(
        name,
        text,
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        if (ts.isNumericLiteral(node))
          literals.push(`${name}:${node.getText(file)}`);
        ts.forEachChild(node, visit);
      };
      visit(file);
      for (const marker of text.matchAll(/directorStopgap\("([^"]+)"/g))
        expect(ids.has(marker[1]!)).toBe(true);
    }
    expect(literals).toEqual([]);
  });

  it("keeps situation types to human moments, with no election-night type", () => {
    const types = SITUATION_LIBRARY.types;
    // 32, plus the justice engine's hearing and verdict (OPUS-GOV, October 14,
    // 2026), plus the 15 civic moments inside the engines' procedures (a race
    // won or lost, a floor vote, a signing, ...; words work order, Oct 15),
    // each waiting for the director's producer.
    expect(types).toHaveLength(49);
    expect(types.some((row) => row.key.includes("election"))).toBe(false);
    for (const type of types) {
      const roles = new Set(type.roles.map((row) => row.key));
      for (const cause of type.causes) {
        expect(Boolean(cause.match) !== Boolean(cause.awaitingProducer)).toBe(
          true,
        );
        for (const role of Object.keys(cause.bind ?? {}))
          expect(roles.has(role)).toBe(true);
      }
    }
    const folded = (key: string, producer: string) =>
      types
        .find((row) => row.key === key)!
        .causes.some((row) => row.awaitingProducer === producer);
    expect(folded("news-arrives", "election-result")).toBe(true);
    expect(folded("celebration", "election-result")).toBe(true);
    expect(folded("first-meeting", "canvass-visit")).toBe(true);
    expect(folded("visit", "canvass-visit")).toBe(true);
    // A move away is a record the core writes, so the departure scene reads it.
    expect(folded("departure", "left-home")).toBe(false);
    expect(
      types
        .find((row) => row.key === "departure")!
        .causes.some(
          (row) => row.match?.label === "feeling:event:person.moved-away",
        ),
    ).toBe(true);
  });

  it("lets a sole earner's job loss take over the screen as news for the household, and stop a skip", () => {
    const { director } = run("place:director-fixture", true);
    const worker = director.ledger.people.get("person:worker")!;
    const spouse = director.ledger.people.get("person:spouse")!;
    const entry = worker.schedule.find((row) =>
      row.momentId.endsWith("fixture-closed:2021-01-10"),
    )!;
    // 0.509 ends the household's only pay: at the owner's line of 0.50 it takes over.
    expect(entry).toMatchObject({ outcome: "scene-now", rank: 1, pace: 4 });
    const news = entry.bindings.find((row) => row.typeKey === "news-arrives")!;
    expect(news.roles).toEqual([
      { role: "bearer", personIds: ["person:worker"], bearing: "solemn" },
      { role: "about", personIds: ["person:worker"] },
      { role: "receiver", personIds: ["person:spouse"], bearing: "braced" },
    ]);
    expect(news.setting).toEqual({
      kind: "home",
      recordId: "household:worker",
    });
    const spouseEntry = spouse.schedule.find(
      (row) => row.mode !== "before-opening",
    )!;
    // The spouse's share of the same loss, 0.431, is under the line, but a
    // household member's lost job is a family scene at home whatever its size
    // (owner, Oct 14, 2026, night).
    expect(spouseEntry.outcome).toBe("scene-now");
    const heard = spouseEntry.bindings.find(
      (row) => row.typeKey === "news-arrives",
    )!;
    expect(heard.roles.find((row) => row.role === "bearer")!.personIds).toEqual(
      ["person:worker"],
    );

    const skipped = createDirector({ watch: ["person:worker"] });
    const core = createLifeCore(town("place:director-fixture"), {
      scheduledWork: false,
      modules: [fixtureWorld("place:director-fixture"), skipped.module],
    });
    skipped.start(core);
    skipped.setMode("skipping");
    advanceCore(core, "2021-01-15");
    expect(
      skipped.ledger.people
        .get("person:worker")!
        .schedule.find((row) => row.mode !== "before-opening"),
    ).toMatchObject({ outcome: "scene-now", stopsSkip: true });
  });

  it("stages one scene for a cause: a type that yields to another bound for the same moment is dropped", () => {
    const { core, director } = run("place:director-fixture", true);
    const book = director.ledger.people.get("person:worker")!;
    const moment = book.moments.find((row) =>
      row.id.endsWith("fixture-closed:2021-01-10"),
    )!;
    // A second type waits on the same record as the household's news (the
    // layoff scene will, once the work engine names the boss).
    const second: SituationLibrary["types"][number] = {
      key: "layoff-told-at-home",
      roles: [
        {
          key: "worker",
          fill: "subject",
          count: "one",
          moves: [],
          wants: [],
        },
      ],
      setting: ["home"],
      timing: "at-cause",
      causes: [
        {
          match: { label: moment.label, counterpart: "none" },
          bind: { worker: "subject" },
        },
      ],
    };
    const options = { mode: "live", interruptImpact: 0.5 };
    const both = scheduleMoment(core, book, moment, options, {
      ...SITUATION_LIBRARY,
      types: [...SITUATION_LIBRARY.types, second],
    });
    // Without the rule one cause stages two scenes.
    expect(both.bindings.map((row) => row.typeKey).sort()).toEqual([
      "layoff-told-at-home",
      "news-arrives",
    ]);
    const one = scheduleMoment(core, book, moment, options, {
      ...SITUATION_LIBRARY,
      types: [
        ...SITUATION_LIBRARY.types,
        { ...second, yieldsTo: ["news-arrives"] },
      ],
    });
    expect(one.bindings.map((row) => row.typeKey)).toEqual(["news-arrives"]);
    expect(one.outcome).toBe("scene-now");
    // The shipped layoff and eviction types give way to the household's news.
    for (const key of ["layoff", "eviction-notice"])
      expect(
        SITUATION_LIBRARY.types.find((row) => row.key === key)!.yieldsTo,
      ).toEqual(["news-arrives"]);
  });

  it("keeps a scene kind the player filtered out from interrupting them", () => {
    const filtered = createDirector({ watch: ["person:worker"] });
    const core = createLifeCore(town("place:director-fixture"), {
      scheduledWork: false,
      modules: [fixtureWorld("place:director-fixture"), filtered.module],
    });
    filtered.start(core);
    // The player allows only funerals to stop their day (owner, Oct 14, 2026).
    const record = filtered.setSceneFilter(
      "person:worker",
      ["funeral", "not-a-kind"],
      core.date,
    );
    expect(record?.allowedKinds).toEqual(["funeral"]);
    advanceCore(core, "2021-01-15");
    const entry = filtered.ledger.people
      .get("person:worker")!
      .schedule.find((row) =>
        row.momentId.endsWith("fixture-closed:2021-01-10"),
      )!;
    // The same 0.509 job loss that otherwise takes over is a journal line.
    expect(entry).toMatchObject({
      interrupt: false,
      outcome: "journal-line",
      bindings: [],
    });
    expect(
      filtered.setSceneFilter("person:worker", null, core.date),
    ).toBeNull();
    expect(filtered.ledger.sceneFilters.size).toBe(P.zero);
  });

  it("lets a death take over the screen, stop a skip, and log a moment no type stages", () => {
    const place = "place:director-fixture";
    const director = createDirector({ watch: ["person:worker"] });
    const events: CoreModule = {
      id: "fixture-events",
      onAfterDay(api) {
        const emit = (kind: string, size: number) =>
          api.emit({
            id: `${kind}:${api.state.date}`,
            date: api.state.date,
            kind,
            personIds: ["person:neighbor"],
            witnessIds: ["person:worker"],
            placeId: place,
            moodImpulse: -size,
            stressImpulse: size,
            source,
          });
        if (api.state.date === "2021-01-02") emit("fixture.news", 0.2);
        if (api.state.date === "2021-01-03") emit("life.death", 1);
      },
    };
    const core = createLifeCore(town(place), {
      scheduledWork: false,
      modules: [events, director.module],
    });
    director.start(core);
    director.setMode("skipping");
    advanceCore(core, "2021-01-04");
    const [news, death] = director.ledger.people
      .get("person:worker")!
      .schedule.filter((row) => row.mode !== "before-opening");
    expect(news).toMatchObject({
      outcome: "journal-line",
      coverage: { reason: "no-type", label: "feeling:event:fixture.news" },
    });
    expect(death).toMatchObject({ outcome: "scene-now", stopsSkip: true });
    expect(death!.bindings.map((row) => row.typeKey)).toEqual([
      "news-arrives",
      "funeral",
    ]);
  });

  it("brings an old classmate back with stakes when the same closure hit both", () => {
    const place = "place:director-fixture";
    const base = town(place);
    // Neither acts on their own here, so the only contact is the fixture's.
    const quiet = (row: PersonInput): PersonInput =>
      row.id === "person:worker" || row.id === "person:classmate"
        ? { ...row, tier: "calendar" }
        : row;
    const input: CoreInput = {
      ...base,
      people: base.people.map((row) =>
        quiet(
          row.id === "person:classmate"
            ? { ...row, jobId: "job:classmate", traits: { [risk]: 0 } }
            : row,
        ),
      ),
      jobs: [
        ...base.jobs,
        { ...base.jobs[0]!, id: "job:classmate", personId: "person:classmate" },
      ],
    };
    const world: CoreModule = {
      id: "fixture-shared-closure",
      onAfterDay(api) {
        if (api.state.date === "2021-01-10") {
          for (const id of ["job:worker", "job:classmate"]) {
            const job = api.state.jobs.get(id)!;
            (job as { endsAt?: string }).endsAt = api.state.date;
            delete (api.state.people.get(job.personId) as { jobId?: string })
              .jobId;
          }
          api.emit({
            id: "fixture-closed:2021-01-10",
            date: api.state.date,
            kind: "organization.closed",
            personIds: ["person:classmate", "person:worker"],
            placeId: place,
            publicRecord: true,
            source,
          });
        }
        if (api.state.date === "2021-01-20")
          api.relationship(
            "person:classmate",
            "person:worker",
            "contact",
            api.parameter("relationContactGain"),
          );
      },
    };
    const director = createDirector({
      watch: ["person:worker", "person:classmate"],
    });
    const core = createLifeCore(input, {
      scheduledWork: false,
      modules: [world, director.module],
    });
    director.start(core);
    advanceCore(core, "2021-01-21");
    const worker = director.ledger.people.get("person:worker")!;
    const loss = worker.moments.find((row) => row.causeKind === "job-ended")!;
    const back = worker.moments.find((row) => row.date === "2021-01-20")!;
    expect(back.label).toBe("re-entry:contact:contact");
    expect(back.impact).toBeGreaterThan(loss.impact * 0.9);
    expect(back.echoes).toEqual([
      {
        earlierId: loss.id,
        earlierKind: "moment",
        otherId: "person:classmate",
        reason: "re-entry",
        strength: expect.any(Number),
      },
    ]);
    expect(
      worker.threads.get("person:classmate")!.turns.map((row) => row.turn),
    ).toEqual(["renewed", "grew"]);
    const entry = worker.schedule.find((row) => row.momentId === back.id)!;
    expect(entry.bindings.map((row) => row.typeKey)).toContain("reunion");
  });

  it("scores the recorded past: personal facts are moments, an era only where it hit", () => {
    const place = "place:director-fixture";
    const base = town(place);
    const withPast = (row: PersonInput): PersonInput =>
      row.id !== "person:worker"
        ? row
        : {
            ...row,
            pastFacts: [
              ...(row.pastFacts ?? []),
              {
                id: "fact:worker:era-hit",
                date: "2008-12-01",
                kind: "era:public-context",
                summary: "Public economic context",
                source,
                facts: { personalJobLoss: "recorded" },
              },
              {
                id: "fact:worker:partner",
                date: "1994-01-01",
                kind: "family:partner",
                summary: "Partner",
                source,
              },
              {
                id: "fact:worker:opening-job",
                date: startedAt,
                kind: "work:opening",
                summary: "Opening job",
                source,
              },
            ],
          };
    const director = createDirector({ watch: ["person:worker"] });
    const core = createLifeCore(
      { ...base, people: base.people.map(withPast) },
      { scheduledWork: false, modules: [director.module] },
    );
    director.start(core);
    const worker = director.ledger.people.get("person:worker")!;
    expect(
      worker.moments.map((row) => [
        row.date,
        row.label,
        row.impact,
        row.counterpartIds,
      ]),
    ).toEqual([
      ["1984-08-27", "past:school:cohort-estimate", 0.26, []],
      ["1994-01-01", "past:family:partner", 0.5, ["person:spouse"]],
      ["2008-12-01", "past:era:public-context:personalJobLoss", 0.47, []],
    ]);
    // The 1994 partnership record moves the pair's first-known date back.
    expect(
      worker.keptFacts.get("knew-each-other:person:spouse:person:worker"),
    ).toMatchObject({ since: "1994-01-01", sinceBasis: "recorded" });
    // The unhit era is background only; the opening job describes the start.
    expect(worker.backdrop.map((row) => row.sourceId)).toEqual([
      "fact:worker:era",
      "fact:worker:era-hit",
    ]);
    expect(worker.schedule.map((row) => row.outcome)).toEqual([
      "journal-line",
      "journal-line",
      "journal-line",
    ]);
  });

  it("links a later moment back to a shared closure most strongly on its anniversary", () => {
    const place = "place:director-fixture";
    const base = town(place);
    const input: CoreInput = {
      ...base,
      people: base.people.map((row) =>
        row.id === "person:worker" || row.id === "person:classmate"
          ? {
              ...row,
              tier: "calendar",
              ...(row.id === "person:classmate"
                ? { jobId: "job:classmate", traits: { [risk]: 0 } }
                : {}),
            }
          : row,
      ),
      jobs: [
        ...base.jobs,
        { ...base.jobs[0]!, id: "job:classmate", personId: "person:classmate" },
      ],
    };
    const news = (
      api: Parameters<NonNullable<CoreModule["onAfterDay"]>>[0],
      id: string,
    ) =>
      api.emit({
        id,
        date: api.state.date,
        kind: "fixture.news",
        personIds: ["person:classmate"],
        witnessIds: ["person:worker"],
        placeId: place,
        moodImpulse: -0.2,
        stressImpulse: 0.2,
        source,
      });
    const world: CoreModule = {
      id: "fixture-anniversary",
      onAfterDay(api) {
        if (api.state.date === "2021-01-10") {
          for (const id of ["job:worker", "job:classmate"]) {
            const job = api.state.jobs.get(id)!;
            (job as { endsAt?: string }).endsAt = api.state.date;
            delete (api.state.people.get(job.personId) as { jobId?: string })
              .jobId;
          }
          api.emit({
            id: "fixture-closed:2021-01-10",
            date: api.state.date,
            kind: "organization.closed",
            personIds: ["person:classmate", "person:worker"],
            placeId: place,
            publicRecord: true,
            source,
          });
        }
        if (api.state.date === "2021-03-01") news(api, "news:soon");
        if (api.state.date === "2021-10-10") news(api, "news:far");
        if (api.state.date === "2022-01-11") news(api, "news:near");
      },
    };
    const director = createDirector({
      watch: ["person:worker", "person:classmate"],
    });
    const core = createLifeCore(input, {
      scheduledWork: false,
      modules: [world, director.module],
    });
    director.start(core);
    advanceCore(core, "2022-01-12");
    const worker = director.ledger.people.get("person:worker")!;
    const loss = worker.moments.find((row) => row.causeKind === "job-ended")!;
    const strength = (causeId: string) =>
      worker.moments
        .find((row) => row.causeId === causeId)!
        .echoes.find((row) => row.reason === "anniversary")?.strength;
    expect(strength("news:soon")).toBeUndefined();
    expect(strength("news:near")).toBeCloseTo(
      loss.hindsight * 2 ** (-1 / 7),
      6,
    );
    expect(strength("news:far")!).toBeLessThan(strength("news:near")! / 1000);
  });

  it("paces scenes by age band", () => {
    expect(paceOf(SITUATION_LIBRARY, "2015-03-01", "2021-03-01")).toBe(1);
    expect(paceOf(SITUATION_LIBRARY, "2010-03-01", "2021-03-01")).toBe(2);
    expect(paceOf(SITUATION_LIBRARY, "2005-03-01", "2021-03-01")).toBe(3);
    expect(paceOf(SITUATION_LIBRARY, "1969-12-20", "2021-03-01")).toBe(4);
  });

  it("stops the player's clock before the next day when the controlled person's moment is at or over the line", () => {
    const place = "place:director-fixture";
    const through = { date: "2021-01-15", minuteOfDay: P.zero };
    /** Plays to the end date as the player: the first offer answers a choice; every stop is collected and acknowledged. */
    const play = (controlledPersonId: string) => {
      const director = createDirector({
        watch: ["person:worker", "person:spouse"],
      });
      const core = createLifeCore(town(place), {
        scheduledWork: false,
        modules: [fixtureWorld(place), director.module],
      });
      director.start(core);
      const stops: Extract<PlayerPacketV1, { kind: "stop" }>[] = [];
      let packet = advancePlayerV1(core, { controlledPersonId, through });
      while (packet.kind !== "complete") {
        if (packet.kind === "stop") stops.push(packet);
        packet =
          packet.kind === "stop"
            ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
            : resumePlayerV1(core, {
                kind: "choice",
                pauseId: packet.pauseId,
                offerId: packet.offers[P.zero]!.offerId,
              });
      }
      return { director, stops };
    };

    const worker = play("person:worker");
    const momentId = "person:worker:2021-01-10:fixture-closed:2021-01-10";
    const directorStops = worker.stops.filter((packet) =>
      packet.stop.modules.some((row) => row.moduleId === "p13-story-director"),
    );
    // One stop, at the midnight after the closure, before 2021-01-11 runs.
    expect(directorStops).toHaveLength(1);
    expect(directorStops[0]!.at).toEqual({
      date: "2021-01-11",
      minuteOfDay: P.zero,
    });
    expect(directorStops[0]!.stop.modules).toEqual([
      expect.objectContaining({
        moduleId: "p13-story-director",
        recordId: momentId,
        controlledPersonId: "person:worker",
        kind: "interrupt",
        hold: false,
        reasonKey: DEFAULT_DIRECTOR_DATA.interruptStop.reasonKey,
      }),
    ]);
    const entry = worker.director.ledger.people
      .get("person:worker")!
      .schedule.find((row) => row.momentId === momentId)!;
    expect(entry).toMatchObject({
      interrupt: true,
      outcome: "scene-now",
      stop: { recordId: momentId, at: { date: "2021-01-11" } },
    });

    // The spouse's 0.431 share of the same loss is under the line, but a
    // household member's lost job is a family scene at home whatever its
    // size (owner, Oct 14, 2026, night): it stops the spouse's day too.
    const spouse = play("person:spouse");
    expect(
      spouse.stops.filter((packet) =>
        packet.stop.modules.some(
          (row) => row.moduleId === "p13-story-director",
        ),
      ).length,
    ).toBe(1);
    const shared = spouse.director.ledger.people
      .get("person:spouse")!
      .schedule.find((row) => row.mode !== "before-opening")!;
    expect(shared).toMatchObject({
      interrupt: true,
      outcome: "scene-now",
    });
    expect(shared.stop).toBeDefined();
    // The worker is watched but not controlled in this play: the same 0.509 moment interrupts without a player stop.
    const uncontrolled = spouse.director.ledger.people
      .get("person:worker")!
      .schedule.find((row) => row.momentId === momentId)!;
    expect(uncontrolled.interrupt).toBe(true);
    expect(uncontrolled.stop).toBeUndefined();
  });

  it("stops the player's clock at the moment's own time when its event is recorded mid-day", () => {
    const place = "place:director-fixture";
    const day = "2021-01-10";
    /**
     * The fixture world, not the director: the store closes while the worker
     * calls the spouse on 2021-01-10, so the closure is recorded the minute
     * the worker's own call ends, before the day closes.
     */
    const midDayClosure = (): CoreModule => {
      let closed = false;
      return {
        id: "fixture-midday-closure",
        relationshipKinds: ["*"],
        onRelationshipChange(api, notice) {
          if (closed || api.state.date !== day) return;
          if (notice.actorId !== "person:worker") return;
          closed = true;
          (api.state.jobs.get("job:worker") as { endsAt?: string }).endsAt =
            day;
          delete (api.state.people.get("person:worker") as { jobId?: string })
            .jobId;
          api.emit({
            id: `fixture-closed-midday:${day}`,
            date: day,
            kind: "organization.closed",
            personIds: ["person:worker"],
            placeId: place,
            publicRecord: true,
            source,
          });
        },
      };
    };
    const director = createDirector({
      watch: ["person:worker", "person:spouse"],
    });
    const core = createLifeCore(town(place), {
      scheduledWork: false,
      modules: [midDayClosure(), director.module],
    });
    director.start(core);
    const through = { date: "2021-01-12", minuteOfDay: P.zero };
    const packets: PlayerPacketV1[] = [];
    let actEnd: { date: string; minuteOfDay: number } | undefined;
    let packet = advancePlayerV1(core, {
      controlledPersonId: "person:worker",
      through,
    });
    while (packet.kind !== "complete") {
      packets.push(packet);
      if (packet.kind === "stop") {
        packet = resumePlayerV1(core, {
          kind: "stop",
          pauseId: packet.pauseId,
        });
        continue;
      }
      // The worker calls the spouse, an act that records an event.
      const offer =
        packet.offers.find(
          (row) =>
            row.actionId === "contact-known-person" &&
            row.durationMinutes > P.zero,
        ) ?? packet.offers[P.zero]!;
      if (packet.at.date === day && !actEnd)
        actEnd = {
          date: day,
          minuteOfDay: packet.at.minuteOfDay + offer.durationMinutes,
        };
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: offer.offerId,
      });
    }
    expect(actEnd!.minuteOfDay).toBeGreaterThan(P.zero);
    const directorStops = packets.filter(
      (row): row is Extract<PlayerPacketV1, { kind: "stop" }> =>
        row.kind === "stop" &&
        row.stop.modules.some((stop) => stop.moduleId === "p13-story-director"),
    );
    // One stop, at the minute the closure was recorded, not the next midnight.
    expect(directorStops).toHaveLength(1);
    expect(directorStops[0]!.at).toEqual(actEnd);
    const momentId = `person:worker:${day}:fixture-closed-midday:${day}`;
    expect(directorStops[0]!.stop.modules).toEqual([
      expect.objectContaining({ recordId: momentId, kind: "interrupt" }),
    ]);
    const worker = director.ledger.people.get("person:worker")!;
    expect(worker.momentsById.get(momentId)!.impact).toBeGreaterThanOrEqual(
      DEFAULT_DIRECTOR_DATA.parameters.directorInterruptImpact!.value,
    );
    // Nothing the player did after the closure ran before the stop.
    const stopIndex = packets.indexOf(directorStops[0]!);
    expect(
      packets
        .slice(P.zero, stopIndex)
        .every((row) => comparePlayerMomentsV1(row.at, actEnd!) <= P.zero),
    ).toBe(true);
    expect(
      worker.schedule.find((row) => row.momentId === momentId),
    ).toMatchObject({
      interrupt: true,
      stop: { recordId: momentId, at: actEnd },
    });
  });

  it("cites only causes the core's saved-trace resolver holds", () => {
    const place = "place:director-fixture";
    const director = createDirector({
      watch: ["person:worker", "person:spouse"],
    });
    // The core logs events that name a focus person. Logging every event that
    // names the controlled person is requested from the core on #3918.
    const input = { ...town(place), focusPersonIds: ["person:worker"] };
    const core = createLifeCore(input, {
      scheduledWork: false,
      modules: [fixtureWorld(place), director.module],
    });
    director.start(core);
    let packet = advancePlayerV1(core, {
      controlledPersonId: "person:worker",
      through: { date: "2021-01-15", minuteOfDay: P.zero },
    });
    while (packet.kind !== "complete")
      packet =
        packet.kind === "stop"
          ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
          : resumePlayerV1(core, {
              kind: "choice",
              pauseId: packet.pauseId,
              offerId: packet.offers[P.zero]!.offerId,
            });
    const moments = director.ledger.people.get("person:worker")!.moments;
    // The recorded past, the closure and the day's contacts.
    expect(moments.some((row) => row.past)).toBe(true);
    expect(moments.some((row) => !row.past)).toBe(true);
    const unresolved = moments
      .map((row) => [
        row.causeId,
        resolveSavedTraceV1(core, row.causeId).status,
      ])
      .filter(([, status]) => status === "record-not-found");
    expect(unresolved).toEqual([]);
    // A recorded-past moment cites the person record and names the fact in it.
    const school = moments.find((row) => row.past)!;
    expect(school).toMatchObject({
      causeId: "person:worker",
      causeFactId: "fact:worker:high-school",
    });
    expect(
      core.people
        .get("person:worker")!
        .pastFacts!.some((fact) => fact.id === school.causeFactId),
    ).toBe(true);
  });

  it("keeps what matters and summarizes the rest, so memory stays about the same size across a year", () => {
    const place = "place:director-fixture";
    const base = town(place);
    const input: CoreInput = {
      ...base,
      people: base.people.map((row) =>
        row.id === "person:worker" || row.id === "person:classmate"
          ? { ...row, tier: "calendar" }
          : row,
      ),
    };
    // News about the classmate that the worker sees, every few days for a year.
    const world: CoreModule = {
      id: "fixture-memory",
      onAfterDay(api) {
        const day = Number(api.state.date.slice(-2));
        if (day % 3 !== 0) return;
        api.emit({
          id: `news:${api.state.date}`,
          date: api.state.date,
          kind: "fixture.news",
          personIds: ["person:classmate"],
          witnessIds: ["person:worker"],
          placeId: place,
          moodImpulse: -0.2 - day / 100,
          stressImpulse: 0.2,
          source,
        });
      },
    };
    const year = (data: DirectorData) => {
      const director = createDirector({
        watch: ["person:worker", "person:classmate"],
        data,
      });
      const core = createLifeCore(input, {
        scheduledWork: false,
        modules: [world, director.module],
      });
      director.start(core);
      const sizes: number[] = [];
      for (const through of ["2021-07-01", "2021-10-01", "2022-01-01"]) {
        advanceCore(core, through);
        sizes.push(director.ledger.people.get("person:worker")!.moments.length);
      }
      return { director, core, sizes };
    };
    const forgetting = year(DEFAULT_DIRECTOR_DATA);
    const keeping = year({
      ...DEFAULT_DIRECTOR_DATA,
      parameters: {
        ...DEFAULT_DIRECTOR_DATA.parameters,
        directorMemoryKeptMoments: {
          ...DEFAULT_DIRECTOR_DATA.parameters.directorMemoryKeptMoments!,
          value: 1e9,
        },
      },
    });
    const book = forgetting.director.ledger.people.get("person:worker")!;
    const all = keeping.director.ledger.people.get("person:worker")!;
    // Without forgetting the record keeps growing; with it, it holds steady.
    expect(all.moments.length).toBeGreaterThan(keeping.sizes[0]! * 1.5);
    const [mid, , end] = forgetting.sizes;
    expect(end!).toBeLessThanOrEqual(mid! * 1.2);
    expect(end!).toBeLessThan(all.moments.length);
    // Nothing is lost: the forgotten moments are summarized by month, and the
    // pair's importance is the same as if every moment were kept.
    const summarized = [...book.summaries.values()].reduce(
      (sum, row) => sum + row.count,
      0,
    );
    expect(summarized + book.moments.length).toBe(all.moments.length);
    expect(
      forgetting.director.importance(
        "person:worker",
        "person:classmate",
        "2022-01-01",
      ),
    ).toBeCloseTo(
      keeping.director.importance(
        "person:worker",
        "person:classmate",
        "2022-01-01",
      ),
      9,
    );
    // A tie that keeps coming back never compounds its own history.
    expect(
      keeping.director.importance(
        "person:worker",
        "person:classmate",
        "2022-01-01",
      ),
    ).toBeLessThan(all.moments.reduce((sum, row) => sum + row.impact, 0) + 1);
    // The strongest older moments are still held one by one.
    const strongest = all.moments
      .filter((row) => row.date < "2021-10-01")
      .sort((a, b) => b.hindsight - a.hindsight)[0]!;
    expect(book.momentsById.has(strongest.id)).toBe(true);
  });
});
