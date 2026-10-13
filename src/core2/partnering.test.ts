import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import {
  MARRIAGE_KIND,
  MARRIED_EVENT,
  marriagesOf,
  partneringModule,
  PARTNERING_PARAMETERS,
} from "./modules/partnering";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import type { CoreEventInput, CoreModule } from "./types";

// Couples forming in play (SG-P15-partnering-weights): over a year in three
// drawn towns, two unpartnered adults with a tie marry when both choose to;
// each marriage is a partner link, a dated fact on both records and a public
// event, and the rate stays within reach of the national one.
const towns = [0, 1, 2].map((draw) => {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "partnering",
    `partnering-${draw}`,
  );
  const input = buildDeepPast(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    }),
  );
  const events: CoreEventInput[] = [];
  const recorder: CoreModule = {
    id: "test-recorder",
    eventKinds: [MARRIED_EVENT],
    onEvent(_api, event) {
      events.push(event);
    },
  };
  const core = createLifeCore(input, {
    modules: [partneringModule, recorder],
  });
  advanceCore(core, "2021-01-02");
  // Who had a partner, and who knew whom, at the opening.
  const partneredBefore = new Set(
    [...core.familyLinks.values()]
      .filter((link) => link.kind === "partner")
      .flatMap((link) => link.personIds),
  );
  const knew = new Map(
    [...core.people.values()].map((row) => [row.id, new Set(row.knownIds)]),
  );
  advanceCore(core, "2022-01-01");
  return { place, core, events, partneredBefore, knew };
});
const rate = PARTNERING_PARAMETERS.partneringMarriageRate!.value;

describe(`marriages over a year in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("marries only two unpartnered adults who knew each other, both chosen", () => {
    for (const { core, partneredBefore, knew } of towns)
      for (const marriage of marriagesOf(coreAPI(core))) {
        const [a, b] = marriage.personIds.map((id) => core.people.get(id)!);
        expect(knew.get(a!.id)!.has(b!.id)).toBe(true);
        expect(a!.looks?.gender).not.toBe(b!.looks?.gender);
        expect(a!.familyIds.has(b!.id)).toBe(true);
        for (const person of [a!, b!]) {
          expect(partneredBefore.has(person.id)).toBe(false);
          expect(
            ageOnDate(
              makeIsoDate(person.birthDate),
              makeIsoDate(marriage.date),
            ),
          ).toBeGreaterThanOrEqual(18);
          expect(
            (person.pastFacts ?? []).some(
              (fact) =>
                fact.kind === "family:partner" &&
                fact.date === marriage.date &&
                fact.facts?.partnershipKind === MARRIAGE_KIND,
            ),
          ).toBe(true);
        }
        expect(core.familyLinks.get(marriage.id)?.kind).toBe("partner");
      }
  });

  it("records each marriage as a public event naming both", () => {
    for (const { core, events } of towns) {
      const marriages = marriagesOf(coreAPI(core));
      expect(events.length).toBe(marriages.length);
      for (const event of events) {
        expect(event.publicRecord).toBe(true);
        expect(event.personIds.length).toBe(2);
      }
    }
  });

  it("marries at no more than twice the national rate, and someone where couples could form", () => {
    let marriages = 0;
    let people = 0;
    for (const { core } of towns) {
      marriages += marriagesOf(coreAPI(core)).length;
      people += [...core.people.values()].filter(
        (row) => row.tier !== "husk",
      ).length;
    }
    expect(marriages / people).toBeLessThan(rate * 2);
    expect(marriages).toBeGreaterThan(0);
  });
});
