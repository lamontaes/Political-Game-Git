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
import { newsKey, printStory, storiesHeard } from "./modules/news";
import { stancesOf, viewOf } from "./modules/views";

// A price law's effect on a household is tied to the law only by someone who
// heard a story about it. In a played town, fare-free transit refunds
// households; one who heard the press story about the law learns the effect
// (a law.effect-learned event citing the story) and holds a stance on the law
// that cites it. Nobody who heard nothing is told. A controlled enactment and
// a printed story in a place drawn from all 56.
const question =
  "us-policy-positions:transportation-infrastructure.fare-free-transit";
const draw = drawPlace(
  process.env.PRICES_LEARNED_SEED ?? randomBytes(32).toString("hex"),
  "price-law-learned",
);
const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;

it(`a household that heard the story learns what the price law did to them (${where})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const heard: CoreEventInput[] = [];
    const cited = new Map<string, unknown>();
    registerModule(core, {
      id: "test:learned-reader",
      eventKinds: ["law.effect-learned"],
      onEvent: (_api, event) => {
        heard.push(event);
        const from = String(event.facts?.learnedFrom);
        cited.set(
          String(event.id),
          storiesHeard(api, event.personIds[0]!).find(
            (s) => newsKey(s.id) === from,
          )?.facts.lawId,
        );
      },
    });
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: question,
        value: 1,
        effectiveDate: core.date,
        measureId: "fixture:fare-free",
        citation: "Controlled enactment in a generated town.",
      });
    const lawId = lawInForce(api, question).governing?.id;
    expect(lawId, `${where}: no law governs`).toBeDefined();
    const town = lawChain(api).townPlaceId;
    const residents = [...core.people.values()]
      .filter((p) => p.alive && p.placeId === town && p.tier !== "husk")
      .map((p) => p.id);
    const story = `fixture:fare-free-story`;
    const reached = printStory(
      api,
      {
        id: story,
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
    expect(reached, `${where}: the story reached no one`).toBeGreaterThan(0);
    advanceCore(core, addDays(makeIsoDate(core.date), 75));
    const events = heard.filter(
      (e) => e.kind === "law.effect-learned" && e.facts?.priceRuleId,
    );
    expect(
      events.length,
      `${where}: no household learned the effect`,
    ).toBeGreaterThan(0);
    const withView = events.filter((e) => viewOf(api, e.personIds[0]!));
    expect(
      withView.length,
      `${where}: ${events.length} learned, none has a view`,
    ).toBeGreaterThan(0);
    for (const event of withView) {
      const personId = event.personIds[0]!;
      const learnedFrom = String(event.facts?.learnedFrom);
      // The story was one the person had heard about this law when they
      // learned the effect (the fixture's or the town press's own).
      expect(
        cited.get(String(event.id)),
        `${where}: ${personId} cites ${learnedFrom}`,
      ).toBe(lawId);
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
    }
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
