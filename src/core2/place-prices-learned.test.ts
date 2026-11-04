import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { CoreEventInput, KnownFact } from "./types";
import { coreAPI, registerModule } from "./state";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { newsKey, printStory, type Story } from "./modules/news";
import { appliedTo, type LawAppliedRow } from "./law-reach/applied";
import { stancesOf, viewOf } from "./modules/views";
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import type { LawRowInput } from "./laws-starting";

// A price law's effect on a household is tied to the law only by someone who
// heard a story about it. In a played town, fare-free transit refunds
// households; one who heard the press story about the law learns the effect
// (a law.effect-learned event citing the story) and holds a stance on the law
// that cites it. Nobody who heard nothing is told. The payer learns on the
// first bill after hearing, or the day they hear it when their household has
// already paid; and a story the news has forgotten by the first bill still
// counts, because the payer remembers hearing it. A controlled enactment and
// a printed story in a place drawn from all 56.
const question =
  "us-policy-positions:transportation-infrastructure.fare-free-transit";
const draw = drawPlace(
  process.env.PRICES_LEARNED_SEED ?? randomBytes(32).toString("hex"),
  "price-law-learned",
);
const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;

interface Learned {
  readonly event: CoreEventInput;
  readonly personId: string;
  /** The day the news engine says they heard the story, if it still keeps it. */
  readonly heardOn: string | undefined;
  readonly storyId: string | undefined;
  readonly story: Story | undefined;
  readonly law: LawRowInput | undefined;
  readonly known: KnownFact | undefined;
  readonly remembered:
    { storyId: string; date: string; known?: KnownFact } | undefined;
  readonly rule: { id: string; cause: string } | undefined;
  readonly felt:
    | {
        payerId: string;
        ruleId: string;
        lawId: string;
        key: string;
        date: string;
        movedMinor: number;
      }
    | undefined;
  readonly reached: LawAppliedRow | undefined;
}

/**
 * A generated town with a fare-free law enacted, and its press story printed
 * `storyAfterDays` after the town opens. The law takes effect `effectiveAfterDays`
 * after the town opens.
 */
function townWithLaw(
  storyAfterDays = 0,
  effectiveAfterDays = 0,
  place: { readonly seed: string; readonly key: string } = draw,
) {
  const at = place === draw ? where : `${place.key}, seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const learned: Learned[] = [];
  registerModule(core, {
    id: "test:learned-reader",
    eventKinds: ["law.effect-learned"],
    onEvent: (_api, event) => {
      const from = String(event.facts?.learnedFrom);
      const personId = event.personIds[0]!;
      const story = api
        .moduleState("news")
        .table("stories")
        .rows()
        .find((s) => newsKey(String(s.id)) === from) as unknown as
        Story | undefined;
      const lawId = String(event.facts?.lawId);
      const householdId = api.state.people.get(personId)?.householdId;
      const prices = api.moduleState(PLACE_PRICES_MODULE_ID);
      learned.push({
        story,
        law: api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .get(lawId) as unknown as LawRowInput | undefined,
        known: api.knows(personId, from),
        remembered: prices
          .table("heardLaws")
          .get(`${personId}|${lawId}`) as unknown as Learned["remembered"],
        rule: prices
          .table("rules")
          .get(String(event.facts?.priceRuleId)) as unknown as Learned["rule"],
        felt: prices
          .table("felt")
          .get(`${householdId}|${lawId}`) as unknown as Learned["felt"],
        reached: householdId
          ? appliedTo(api, householdId).find((row) => row.lawId === lawId)
          : undefined,
        event,
        personId,
        storyId: story?.id,
        heardOn: (
          api
            .moduleState("news")
            .table("heard")
            .get(`${personId}:${story?.id}`) as unknown as
            { date?: string } | undefined
        )?.date,
      });
    },
  });
  const effectiveDate = addDays(makeIsoDate(core.date), effectiveAfterDays);
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: question,
      value: 1,
      effectiveDate,
      measureId: "fixture:fare-free",
      citation: "Controlled enactment in a generated town.",
    });
  const lawId = lawInForce(api, question, effectiveDate).governing?.id;
  expect(lawId, `${at}: no law governs`).toBeDefined();
  if (storyAfterDays)
    advanceCore(core, addDays(makeIsoDate(core.date), storyAfterDays));
  const town = lawChain(api).townPlaceId;
  const residents = [...core.people.values()]
    .filter((p) => p.alive && p.placeId === town && p.tier !== "husk")
    .map((p) => p.id);
  const reached = printStory(
    api,
    {
      id: `fixture:fare-free-story`,
      kind: "press.printed",
      outletId: `outlet:${town}`,
      date: core.date,
      placeId: town,
      topic: question,
      desiredChange: "enact",
      facts: { lawId: lawId! },
    },
    residents,
  );
  expect(reached, `${at}: the story reached no one`).toBeGreaterThan(0);
  return { core, api, learned, lawId: lawId!, effectiveDate };
}

/** The law's record of reaching a person's household: the day of its first bill under the law. */
function reachedHousehold(api: ReturnType<typeof coreAPI>, personId: string) {
  const household = api.state.people.get(personId)?.householdId;
  return household
    ? appliedTo(api, household).find((r) => r.key === question)
    : undefined;
}

/** The law a printed story is about. */
function storyLawId(api: ReturnType<typeof coreAPI>, storyId?: string) {
  return (
    api
      .moduleState("news")
      .table("stories")
      .get(storyId ?? "") as unknown as
      { facts?: { lawId?: string } } | undefined
  )?.facts?.lawId;
}

/** Validate the actual chain as it stood when this person learned it. */
function expectActualSource(l: Learned) {
  const { event, personId, story, law, known, rule, felt, reached } = l;
  const at = `${where}: ${event.id}`;
  expect(law, `${at}: actual law`).toBeDefined();
  expect(story, `${at}: actual source story`).toBeDefined();
  expect(event.facts?.lawId, at).toBe(law!.id);
  expect(story!.facts.lawId, `${at}: source law`).toBe(law!.id);
  expect(event.topic, `${at}: law's question`).toBe(law!.series);
  expect(event.date >= law!.effectiveDate, `${at}: law is effective`).toBe(
    true,
  );
  expect(event.facts?.learnedFrom, `${at}: source key`).toBe(
    newsKey(story!.id),
  );
  // No event may cite a story this payer never received. An expired news
  // hearing must be backed by the person's retained memory of that story.
  expect(known, `${at}: payer knows the source`).toBeDefined();
  expect(known!.key, at).toBe(newsKey(story!.id));
  expect(
    known!.learnedAt <= event.date,
    `${at}: received by learning day`,
  ).toBe(true);
  if (l.heardOn !== undefined) expect(l.heardOn <= event.date, at).toBe(true);
  else {
    expect(l.remembered?.storyId, `${at}: remembered source`).toBe(story!.id);
    expect(l.remembered?.known?.key, at).toBe(known!.key);
    expect(l.remembered!.date <= event.date, at).toBe(true);
  }
  expect(rule?.id, `${at}: recorded price rule`).toBe(event.facts?.priceRuleId);
  expect(rule?.cause, `${at}: rule cites this law`).toBe(
    `law:${law!.series}:${law!.id}`,
  );
  expect(felt?.payerId, `${at}: actual payer`).toBe(personId);
  expect(felt?.lawId, at).toBe(law!.id);
  expect(felt?.ruleId, at).toBe(rule!.id);
  expect(felt?.key, at).toBe(event.topic);
  expect(felt!.date <= event.date, `${at}: paid by learning day`).toBe(true);
  expect(String(felt?.movedMinor), at).toBe(event.facts?.movedMinor);
  expect(felt?.movedMinor, at).not.toBe(0);
  expect(reached?.lawId, `${at}: actual household reach`).toBe(law!.id);
  expect(reached?.key, at).toBe(event.topic);
  expect(reached!.since <= event.date, at).toBe(true);
}

const proofs: Record<string, unknown>[] = [];
function inspectEvents(
  api: ReturnType<typeof coreAPI>,
  events: readonly Learned[],
  lawId: string,
  scenario: string,
) {
  expect(events.length, `${where}: no learned events`).toBeGreaterThan(0);
  for (const event of events) expectActualSource(event);
  expectStances(api, events);
  const fixture = events.filter((l) => l.event.facts?.lawId === lawId);
  expect(
    fixture.length,
    `${where}: no transit fixture learner`,
  ).toBeGreaterThan(0);
  // The oracle must reject both a different real law and an unreceived source.
  expect(() =>
    expectActualSource({ ...fixture[0]!, known: undefined }),
  ).toThrow();
  const natural = events.filter((l) => l.event.facts?.lawId !== lawId);
  if (natural.length)
    expect(() =>
      expectActualSource({ ...natural[0]!, story: fixture[0]!.story }),
    ).toThrow();
  const byLaw = new Map<string, Learned>();
  for (const event of events) byLaw.set(event.law!.id, event);
  proofs.push({
    scenario,
    town: draw.name,
    replay: process.env.PRICES_LEARNED_SEED,
    worldSeed: api.state.seed,
    through: api.state.date,
    totalEvents: events.length,
    transitEvents: fixture.length,
    naturalEvents: natural.length,
    witnesses: [...byLaw.values()],
  });
  if (process.env.PRICES_OBSERVER_PROOF)
    writeFileSync(
      process.env.PRICES_OBSERVER_PROOF,
      JSON.stringify(proofs, null, 2) + "\n",
    );
  return fixture;
}

/** Each learner holds a stance on the law that cites how they learned of it. */
function expectStances(
  api: ReturnType<typeof coreAPI>,
  learned: readonly Learned[],
) {
  const withView = learned.filter((l) => viewOf(api, l.personId));
  expect(
    withView.length,
    `${where}: ${learned.length} learned, none has a view`,
  ).toBeGreaterThan(0);
  for (const { event, personId } of withView) {
    // They hold a stance on the law. Only the player's circle keeps every
    // cause; anyone else keeps the latest, which is this event or a later one.
    const stance = stancesOf(api, personId).find(
      (s) => s.topic === event.topic,
    );
    expect(
      stance,
      `${where}: ${personId} holds no stance on the law`,
    ).toBeDefined();
    const last = stance!.causes.at(-1)!;
    expect(
      stance!.causes.some((c) => c.eventId === String(event.id)) ||
        last.date >= String(event.date),
      `${where}: ${personId}'s stance predates what they learned`,
    ).toBe(true);
    expect(
      stance!.causes.some((c) => c.learnedFrom),
      `${where}: ${personId}'s stance cites no story`,
    ).toBe(true);
  }
  return withView;
}

it(`a household that heard the story learns what the price law did to them (${where})`, () => {
  setBookkeeping(false);
  try {
    const { core, api, learned, lawId } = townWithLaw();
    advanceCore(core, addDays(makeIsoDate(core.date), 75));
    const events = learned.filter((l) => l.event.facts?.priceRuleId);
    expect(
      events.length,
      `${where}: no household learned the effect`,
    ).toBeGreaterThan(0);
    const fixture = inspectEvents(api, events, lawId, "heard-before-payment");
    for (const l of fixture) {
      // They had heard a story about this law by the day they learned; the
      // news may have forgotten it by then (it keeps a story for a month).
      expect(
        storyLawId(api, l.storyId),
        `${where}: ${l.event.id} cites ${l.storyId}`,
      ).toBe(lawId);
      expect(
        l.heardOn === undefined || l.heardOn <= String(l.event.date),
        `${where}: ${l.event.id}`,
      ).toBe(true);
      expect(l.event.facts?.lawId, `${where}: ${l.event.id}`).toBe(lawId);
    }
    const withView = expectStances(api, events);
    console.log(
      `learned from a story heard before the bill: ${where}; law ${lawId}; ${events.length} learned, ${withView.length} with a view; e.g. ${events[0]!.event.id} from ${events[0]!.storyId} heard ${events[0]!.heardOn}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);

it(`a payer whose household already paid ties the cost to the law the day they hear the story (${where})`, () => {
  setBookkeeping(false);
  try {
    // The press runs its story a week after the first bill.
    const { core, api, learned, lawId } = townWithLaw(21);
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    const events = learned.filter((l) => l.event.facts?.priceRuleId);
    expect(
      events.length,
      `${where}: no household learned the effect`,
    ).toBeGreaterThan(0);
    const fixture = inspectEvents(api, events, lawId, "heard-after-payment");
    // Whose household had been billed under the law before they heard.
    const billedBefore = (l: Learned) => {
      const reached = reachedHousehold(api, l.personId);
      return reached !== undefined && (l.heardOn ?? "") > reached.since;
    };
    const late = fixture.filter(billedBefore);
    expect(
      late.length,
      `${where}: ${events.length} learned, none heard after their household's first bill`,
    ).toBeGreaterThan(0);
    for (const l of fixture) {
      expect(l.heardOn, `${where}: ${l.event.id}`).toBeDefined();
      // Never before they heard.
      expect(
        l.heardOn! <= String(l.event.date),
        `${where}: ${l.event.id}`,
      ).toBe(true);
    }
    // A payer whose household had already paid ties the cost to the law the
    // day they hear the story, not on a later billing day. (Someone who
    // heard but did not pay the household's first bill learns on the bill
    // they pay, as before.)
    const onTheDay = late.filter((l) => String(l.event.date) === l.heardOn);
    expect(
      onTheDay.length,
      `${where}: ${late.length} heard after their household's first bill, none learned the day they heard (e.g. ${late[0]!.personId} heard ${late[0]!.storyId} on ${late[0]!.heardOn}, learned ${late[0]!.event.date})`,
    ).toBeGreaterThan(0);
    const withView = expectStances(api, onTheDay);
    const sample =
      onTheDay.find((l) => viewOf(api, l.personId)) ?? onTheDay[0]!;
    console.log(
      `learned the day they heard: ${where}; law ${lawId}; ${events.length} learned, ${late.length} heard after their household's first bill and ${onTheDay.length} of them learned that day (${reachedHousehold(api, sample.personId)!.id} since ${reachedHousehold(api, sample.personId)!.since}), ${withView.length} with a view; e.g. ${sample.event.id} from ${sample.storyId} heard ${sample.heardOn}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);

it(`a payer who heard a story the news has since forgotten still ties the first bill to the law and their view moves (${where})`, () => {
  setBookkeeping(false);
  try {
    // The law takes effect two months after its story ran: the news keeps a
    // story for a month, so it is gone by the household's first bill. Where
    // the town's own press covers the law taking effect and that story
    // reaches every payer, each learns from the fresh story instead; that
    // place is passed over, named, and another drawn.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place =
        attempt === 0
          ? draw
          : drawPlace(`${draw.seed}:${attempt}`, "price-law-learned-forgotten");
      const at = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, api, learned, lawId, effectiveDate } = townWithLaw(
        0,
        60,
        place,
      );
      advanceCore(core, addDays(makeIsoDate(core.date), 82));
      const events = learned.filter((l) => l.event.facts?.priceRuleId);
      expect(
        events.length,
        `${at}: no household learned the effect`,
      ).toBeGreaterThan(0);
      const fixture = inspectEvents(api, events, lawId, "forgotten-source");
      // The news no longer keeps their hearing, yet they cite the story.
      const forgotten = fixture.filter((l) => l.heardOn === undefined);
      if (!forgotten.length) {
        tried.push(
          `${at}: ${events.length} learned, each from a story still in the news (e.g. ${events[0]!.storyId})`,
        );
        continue;
      }
      for (const l of forgotten) {
        expect(l.storyId, `${at}: ${l.event.id}`).toBeDefined();
        expect(
          String(l.event.date) >= effectiveDate,
          `${at}: ${l.event.id} before the law took effect`,
        ).toBe(true);
        // They know the story again, as they first heard it.
        expect(
          api.knows(l.personId, String(l.event.facts?.learnedFrom)),
          `${at}: ${l.personId} no longer knows the story they learned from`,
        ).toBeDefined();
      }
      const withView = expectStances(api, forgotten);
      const sample =
        forgotten.find((l) => viewOf(api, l.personId)) ?? forgotten[0]!;
      console.log(
        `learned from a story the news forgot: ${at}${tried.length ? ` (passed over: ${tried.join("; ")})` : ""}; law ${lawId} effective ${effectiveDate}; ${events.length} learned, ${forgotten.length} from a forgotten story, ${withView.length} with a view; e.g. ${sample.event.id} from ${sample.storyId}`,
      );
      return;
    }
    expect.fail(
      `${where}: no drawn place had a payer whose only story the news had forgotten: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
