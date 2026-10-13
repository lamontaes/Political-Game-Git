import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { addDays, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import { stancesOf, viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { applyCoreEvent, coreAPI } from "./state";

// M1-10, talking politics: a stance someone formed recently passes to the
// people they really talk to, once per cause, by how close they are and how
// closely the teller follows politics; no one is moved without a contact.
const place = drawPlace(process.env.GOLDEN_PATH_SEED ?? "views-talk", "talk");
const input = buildDeepPast(
  buildPopulation({
    seed: place.seed,
    placeKey: place.key,
    startedAt: "2021-01-01",
    minimumPeople: 500,
  }),
);
const core = createLifeCore(input, { modules: [viewsModule] });
const api = coreAPI(core);
const residents = [...core.people.values()]
  .filter((person) => person.alive && person.tier !== "husk")
  .map((person) => person.id)
  .sort();
// Those with the most ties carry it furthest.
const reached = [...residents]
  .sort(
    (a, b) =>
      (core.relationshipsByPerson.get(b)?.size ?? 0) -
        (core.relationshipsByPerson.get(a)?.size ?? 0) || a.localeCompare(b),
  )
  .slice(0, 3);
applyCoreEvent(core, {
  id: "fixture-library-vote",
  date: core.date,
  kind: "legislative-vote",
  personIds: reached,
  placeId: core.people.get(reached[0]!)!.placeId,
  publicRecord: false,
  topic: "fixture:library",
  desiredChange: "expand",
  source: { tag: "SOURCED", citation: "Fixture vote.", asOf: core.date },
});
advanceCore(core, addDays(makeIsoDate(core.date), 20));
const stanceOf = (id: string) =>
  stancesOf(api, id).find((row) => row.topic === "fixture:library");

describe(`talking politics in ${place.name} (seed ${place.seed.slice(0, 12)})`, () => {
  it("passes a stance to people the holders talked with, by less than living it", () => {
    const direct = Math.min(
      ...reached.map((id) => stanceOf(id)!.causes[0]!.change),
    );
    const heard = residents.filter(
      (id) => !reached.includes(id) && stanceOf(id),
    );
    expect(heard.length).toBeGreaterThan(0);
    for (const id of heard) {
      const stance = stanceOf(id)!;
      for (const cause of stance.causes) {
        expect(cause.eventId).toMatch(/^talk:/);
        expect(cause.change).toBeLessThan(direct);
        // The teller is someone they have a tie with.
        const tellerId = cause.eventId.split(":")[1]!;
        expect(core.relationships.has([id, tellerId].sort().join(":"))).toBe(
          true,
        );
      }
    }
  });
});
