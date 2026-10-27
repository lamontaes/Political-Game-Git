import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { CoreEventInput } from "./types";
import { coreAPI, registerModule } from "./state";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { newsKey, printStory } from "./modules/news";
import { appliedTo } from "./law-reach/applied";
import { stancesOf, viewOf } from "./modules/views";

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
        { id: string } | undefined;
      learned.push({
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
    const stance = stancesOf(api, personId).find((s) => s.topic === question);
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
    for (const l of events) {
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
    // Whose household had been billed under the law before they heard.
    const billedBefore = (l: Learned) => {
      const reached = reachedHousehold(api, l.personId);
      return reached !== undefined && (l.heardOn ?? "") > reached.since;
    };
    const late = events.filter(billedBefore);
    expect(
      late.length,
      `${where}: ${events.length} learned, none heard after their household's first bill`,
    ).toBeGreaterThan(0);
    for (const l of events) {
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
      // The news no longer keeps their hearing, yet they cite the story.
      const forgotten = events.filter((l) => l.heardOn === undefined);
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
