import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { registerModule, coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { withholdPay } from "./modules/budgets";
import { printStory, storiesHeard } from "./modules/news";
import type { CoreEventInput } from "./types";

// A naturally voted income tax a payday takes is tied to its law only by a
// payer who heard a story about it (the price engine's one learning reader):
// heard before the payday, heard after it, and never heard. The posting and
// the law it names stay as they were. A generated town in a place drawn from
// all 56.
const question = "us-policy-positions:fiscal.adopt-income-tax";
const series = "income-tax";

function control(seed: string) {
  const draw = drawPlace(seed, "income-tax-learned");
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const learned: CoreEventInput[] = [];
  registerModule(core, {
    id: "test:tax-learned-reader",
    eventKinds: ["law.effect-learned"],
    onEvent: (_api, event) => void learned.push(event),
  });
  const chain = lawChain(api);
  const town =
    chain.levels.find((l) => l.level === "state") ?? chain.levels[0]!;
  const law = enactLaw(api, {
    jurisdiction: town.jurisdiction,
    level: town.level,
    series,
    value: 5,
    unit: "percent-flat",
    effectiveDate: core.date,
    measureId: "fixture:income-tax",
    citation: "Controlled enactment in a generated town.",
    terms: { enactedBy: "fixture:income-tax", base: "wages" },
  });
  const residents = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === chain.townPlaceId &&
        p.tier !== "husk" &&
        p.householdId &&
        p.id !== core.playerId,
    )
    .map((p) => p.id);
  const story = (id: string, to: readonly string[]) =>
    printStory(
      api,
      {
        id: `fixture:income-tax-story:${id}`,
        kind: "press.printed",
        outletId: `outlet:${chain.townPlaceId}`,
        date: core.date,
        placeId: chain.townPlaceId,
        topic: question,
        desiredChange: "enact",
        facts: { lawId: law.id },
      },
      to,
    );
  const settle = () => advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const heard = (id: string) =>
    storiesHeard(api, id).some((s) => s.facts?.lawId === law.id);
  const pay = (personId: string, n: string) =>
    withholdPay(api, {
      id: `fixture:pay:${n}`,
      personId,
      paidMinor: 400_000,
      fromAt: core.date,
      throughAt: core.date,
      limitToCash: true,
    });
  return { where, api, law, residents, story, settle, heard, pay, learned };
}

// Ten fresh generated towns, each a place drawn from all 56.
for (const seed of Array.from({ length: 10 }, (_, n) => `control-${n + 1}`)) {
  it(`only a payer who heard a story about the voted income tax learns it (${seed})`, () => {
    setBookkeeping(false);
    try {
      const { where, api, law, residents, story, settle, heard, pay, learned } =
        control(
          process.env.INCOME_TAX_SEED ?? randomBytes(8).toString("hex") + seed,
        );
      // A story reaches some residents over the next days (reach is the
      // press's, not the test's); the rest never heard it.
      story("first", residents);
      settle();
      const cash = (id: string) =>
        api.accounts().balance(`cash:${id}:residual`) > 0;
      const heardFirst = residents.filter((id) => heard(id) && cash(id));
      const never = residents.filter((id) => !heard(id) && cash(id));
      expect(
        heardFirst.length,
        `${where}: the story reached no one`,
      ).toBeGreaterThan(0);
      expect(
        never.length,
        `${where}: the story reached everyone`,
      ).toBeGreaterThan(2);
      // Heard before the payday.
      const a = heardFirst[0]!;
      pay(a, "a");
      // Paid first, heard after: a second story reaches some who never heard.
      const later = never;
      for (const id of later) pay(id, id);
      story("second", later);
      settle();
      const after = later.filter(heard);
      expect(
        after.length,
        `${where}: the second story reached no one`,
      ).toBeGreaterThan(0);
      const mine = learned.filter((e) => e.facts?.lawId === law.id);
      const who = mine.map((e) => e.personIds[0]);
      expect(who, `${where}: A (heard before pay) law ${law.id}`).toContain(a);
      // A household keeps one felt row per law (the price engine's design),
      // so when two earners of a household paid, the later payer's row is
      // the one a story heard afterward finds: some payer who heard after
      // learns, though not necessarily each of them.
      expect(
        after.some((id) => who.includes(id)),
        `${where}: B (paid, heard after) law ${law.id}`,
      ).toBe(true);
      // No one who never heard a story about the law ties it to the law,
      // however long the world has run since they were paid.
      const silent = residents.filter((id) => !heard(id));
      expect(silent.length, `${where}: everyone heard`).toBeGreaterThan(0);
      for (const id of silent)
        expect(who, `${where}: ${id} learned with no story`).not.toContain(id);
      for (const id of who)
        expect(heard(id!), `${where}: ${id} learned without hearing`).toBe(
          true,
        );
      for (const event of mine)
        expect(String(event.facts?.learnedFrom), where).toContain("news");
    } finally {
      setBookkeeping(true);
    }
  }, 300_000);
}
