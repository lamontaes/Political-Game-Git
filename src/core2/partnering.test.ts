import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import {
  COUPLE_KIND,
  MARRIAGE_KIND,
  MARRIED_EVENT,
  MOVED_IN_EVENT,
  marriagesOf,
  partneringModule,
  PARTNERING_PARAMETERS,
} from "./modules/partnering";
import { movesModule } from "./modules/moves";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import type { CoreEventInput, CoreModule } from "./types";

// Couples forming in play (SG-P15-partnering-weights): over a year in three
// drawn towns, two unpartnered adults who know each other (or are introduced
// by someone they know) marry when both choose to;
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
    eventKinds: [MARRIED_EVENT, MOVED_IN_EVENT],
    onEvent(_api, event) {
      events.push(event);
    },
  };
  const core = createLifeCore(input, {
    modules: [movesModule, partneringModule, recorder],
  });
  advanceCore(core, "2021-01-02");
  // Who had a partner, and who knew whom, at the opening.
  const partneredBefore = new Set(
    [...core.familyLinks.values()]
      .filter((link) => link.kind === "partner")
      .flatMap((link) => link.personIds),
  );
  const pairsBefore = new Set(
    [...core.familyLinks.values()]
      .filter((link) => link.kind === "partner")
      .map((link) => [...link.personIds].sort().join(":")),
  );
  const knew = new Map(
    [...core.people.values()].map((row) => [row.id, new Set(row.knownIds)]),
  );
  advanceCore(core, "2022-01-01");
  return { place, core, events, partneredBefore, pairsBefore, knew };
});
const rate = PARTNERING_PARAMETERS.partneringMarriageRate!.value;

describe(`marriages over a year in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("marries only two unpartnered adults who know each other, both chosen", () => {
    for (const { core, partneredBefore, pairsBefore, knew } of towns)
      for (const marriage of marriagesOf(coreAPI(core))) {
        const [a, b] = marriage.personIds.map((id) => core.people.get(id)!);
        // Known since the opening, or introduced by someone they knew.
        expect(a!.knownIds.has(b!.id)).toBe(true);
        if (!knew.get(a!.id)!.has(b!.id))
          expect(
            [...a!.familyIds, ...knew.get(a!.id)!].some((id) =>
              knew.get(id)?.has(b!.id),
            ),
          ).toBe(true);
        // New couples are opposite-sex for now (SG-P15-partnering-homes);
        // a couple together at the opening may not be.
        if (!pairsBefore.has([a!.id, b!.id].sort().join(":")))
          expect(a!.looks?.gender).not.toBe(b!.looks?.gender);
        expect(a!.familyIds.has(b!.id)).toBe(true);
        for (const person of [a!, b!]) {
          // Someone partnered at the opening marries only that partner.
          if (partneredBefore.has(person.id))
            expect(pairsBefore.has([a!.id, b!.id].sort().join(":"))).toBe(true);
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
                fact.facts?.partnershipKind === marriage.kind,
            ),
          ).toBe(true);
        }
        expect(core.familyLinks.get(marriage.partnershipId)?.kind).toBe(
          "partner",
        );
        // A newlywed who moved in lives in the spouse's home now, and the
        // home they left still has someone in it.
        if (marriage.movedIn) {
          const mover = core.people.get(marriage.movedIn)!;
          const spouse = mover.id === a!.id ? b! : a!;
          expect(mover.householdId).toBe(spouse.householdId);
          expect(core.households.get(mover.householdId)!.memberIds).toContain(
            mover.id,
          );
        }
      }
  });

  it("records each union as an event naming both, a marriage in public", () => {
    for (const { core, events } of towns) {
      const marriages = marriagesOf(coreAPI(core));
      expect(events.length).toBe(marriages.length);
      for (const event of events) {
        expect(event.publicRecord).toBe(event.kind === MARRIED_EVENT);
        expect(event.personIds.length).toBe(2);
      }
    }
  });

  it("marries near the national rate", () => {
    let marriages = 0;
    let people = 0;
    for (const { core } of towns) {
      marriages += marriagesOf(coreAPI(core)).filter(
        (row) => row.kind === MARRIAGE_KIND,
      ).length;
      people += [...core.people.values()].filter(
        (row) => row.tier !== "husk",
      ).length;
    }
    expect(marriages / people).toBeLessThan(rate * 2);
    expect(marriages / people).toBeGreaterThan(rate * 0.4);
  });

  it("has most new couples move in together before they marry", () => {
    let together = 0;
    let marriedFirst = 0;
    for (const { core, pairsBefore } of towns) {
      const rows = [...marriagesOf(coreAPI(core))].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      const first = new Map<string, string>();
      for (const row of rows)
        if (!first.has(row.partnershipId))
          first.set(row.partnershipId, row.kind);
      for (const row of rows) {
        if (first.get(row.partnershipId) !== row.kind) continue;
        if (pairsBefore.has([...row.personIds].sort().join(":"))) continue;
        if (row.kind === COUPLE_KIND) together += 1;
        else marriedFirst += 1;
      }
    }
    // About 76% of first marriages follow living together (NSFG 2015-2019).
    const share = together / Math.max(1, together + marriedFirst);
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.9);
  });

  it("parts couples near the national divorce rate, and the one leaving moves out", () => {
    let divorces = 0;
    let people = 0;
    for (const { core } of towns) {
      const partings = coreAPI(core)
        .moduleState("partnering")
        .table("partings")
        .rows() as unknown as {
        personIds: [string, string];
        kind: string;
        leftId: string;
      }[];
      people += [...core.people.values()].filter(
        (row) => row.tier !== "husk",
      ).length;
      for (const row of partings) {
        if (row.kind === "family.divorced") divorces += 1;
        const [a, b] = row.personIds.map((id) => core.people.get(id)!);
        expect(a!.familyIds.has(b!.id)).toBe(false);
        for (const person of [a!, b!])
          expect(
            (person.pastFacts ?? []).some(
              (fact) =>
                fact.kind === "family:parted" &&
                fact.facts?.otherPersonId ===
                  (person.id === a!.id ? b!.id : a!.id),
            ),
          ).toBe(true);
        const left = core.people.get(row.leftId)!;
        const stayed = left.id === a!.id ? b! : a!;
        expect(
          left.householdId !== stayed.householdId || left.tier === "husk",
        ).toBe(true);
      }
    }
    // 2.4 divorces per 1,000 people a year (NCHS NVSS 2022).
    expect(divorces / people).toBeLessThan(0.0024 * 2.5);
  });
});
