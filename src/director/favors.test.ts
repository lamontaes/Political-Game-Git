import { describe, expect, it } from "vitest";
import { buildDeepPast } from "../core2/deep-past";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
import { addDays, makeIsoDate } from "../simulation/dates";
import { createDirector } from "./ledger";

// M4-01, favors: a relative taking someone in (the partnering engine's
// favor.took-in, when a person leaves their partner) is a favor both of them
// keep, held by the one who did it, so it can come back through either.
const seed = process.env.GOLDEN_PATH_SEED ?? "director-favors";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 300,
  }),
);
const full = input.people.filter((person) => person.tier !== "husk");
// Two full people in different homes (the director keeps the favor whoever
// they are; the partnering test checks that only a relative takes someone in).
const helped = full[0]!;
const helper = full.find((other) => other.householdId !== helped.householdId)!;
const director = createDirector({ watch: [helped.id, helper.id] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, addDays(makeIsoDate(core.date), 1));
const eventId = `favor.took-in:${core.date}:${helper.id}:${helped.id}`;
applyCoreEvent(core, {
  id: eventId,
  date: core.date,
  kind: "favor.took-in",
  personIds: [helper.id, helped.id],
  placeId: helped.placeId,
  publicRecord: false,
  source: {
    tag: "ESTIMATED",
    asOf: core.date,
    citation: "Fixture shaped like the partnering engine's favor.",
    estimatedFrom: "Fixture.",
  },
  facts: { householdId: helper.householdId },
});
advanceCore(core, addDays(makeIsoDate(core.date), 1));

describe(`favors kept in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("keeps taking someone in as a favor for both, held by the one who did it", () => {
    for (const id of [helped.id, helper.id]) {
      const fact = director.ledger.people
        .get(id)!
        .keptFacts.get(`favor:${eventId}`);
      expect(fact, id).toMatchObject({
        kind: "favor",
        holderId: helper.id,
        otherId: helped.id,
        sourceId: eventId,
      });
    }
  });
});
