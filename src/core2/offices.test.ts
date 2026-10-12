/**
 * M2-01: offices and seats, every level, with the real-name check.
 *
 * In a random place (the golden-path draw when the suite runs it): every seat
 * covering the player has a holder with a record and a term; a holder's death
 * opens a vacancy filled the way that office's real rule says; no generated
 * official anywhere carries a real current officeholder's full name.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import {
  OFFICES_MODULE_ID,
  officesOfState,
  openOffices,
  townSeats,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import { isRealOfficeholderName } from "./officials-names";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`offices:${Date.now()}`).digest("hex");
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(salt: string) {
  const state = pick(states, `${salt}:state`);
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, `${salt}:place`);
}
function world(placeKey: string) {
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt: START, minimumPeople: 200 }),
  );
  openOffices(core, seed);
  return core;
}

describe("M2-01 offices and seats, every level", () => {
  it("every seat covering the player has a holder with a record and a term", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("town").key;
    const core = world(placeKey);
    const api = coreAPI(core);
    const seats = townSeats(api);
    const levels = new Set(seats.map((s) => s.office.level));
    expect(levels.has("federal")).toBe(true);
    expect(levels.has("state")).toBe(true);
    for (const { office, seat, holder } of seats) {
      expect(holder, `${office.title} ${seat.id}`).not.toBeNull();
      expect(holder!.identity.givenName.length).toBeGreaterThan(0);
      expect(holder!.startDate).toBe(START);
      expect(holder!.reached).toBeTruthy();
      if (office.termYears) expect(holder!.endDate! > START).toBe(true);
      // A local seat is held by a resident of the town.
      if (["city", "county", "township"].includes(office.level))
        expect(core.people.has(holder!.personId!)).toBe(true);
    }
    govReport(
      "offices",
      JSON.stringify({
        placeKey,
        seed,
        seats: seats.map(
          (s) =>
            `${s.office.title}${s.seat.district ? ` ${s.seat.district}` : ""}: ${s.holder!.identity.givenName} ${s.holder!.identity.familyName}${s.holder!.party ? ` (${s.holder!.party})` : ""}, until ${s.holder!.endDate ?? "term not read"}`,
        ),
      }),
    );
  });

  it("a holder's death opens a vacancy filled by that office's real rule", () => {
    const core = world(randomPlace("vacancy").key);
    const api = coreAPI(core);
    const local = townSeats(api).filter(
      (s) => s.holder?.personId && s.office.level !== "federal",
    );
    const { office, seat, holder } = pick(local, "seat");
    // The holder is really dead, as in play: a special election never seats
    // a person who is still recorded as alive.
    api.updatePerson(holder!.personId!, { alive: false });
    api.emit({
      id: `test-death:${holder!.personId}`,
      date: START,
      kind: "life.death",
      personIds: [holder!.personId!],
      placeId: core.people.get(holder!.personId!)!.placeId,
      source: { tag: "SOURCED", citation: "test", asOf: START },
    });
    const vacancies = api
      .moduleState(OFFICES_MODULE_ID)
      .table("vacancies")
      .rows() as unknown as VacancyRow[];
    const vacancy = vacancies.find((v) => v.seatId === seat.id)!;
    expect(vacancy.cause).toBe("death");
    expect(vacancy.rule.method).toBe(office.vacancyRule.method);
    const ended = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [holder!.personId!]) as unknown as TermRow[];
    expect(ended.every((t) => t.status === "ended")).toBe(true);
    if (vacancy.status === "awaiting-election") {
      advanceCore(core, vacancy.electionDate!);
    }
    const now = townSeats(api).find((s) => s.seat.id === seat.id)!.holder!;
    expect(now.personId).not.toBe(holder!.personId);
    if (office.vacancyRule.method === "appointment")
      expect(now.reached).toMatch(/^appointed by/);
    govReport(
      "offices",
      JSON.stringify({
        office: office.title,
        died: `${holder!.identity.givenName} ${holder!.identity.familyName}`,
        rule: office.vacancyRule,
        filledBy: `${now.identity.givenName} ${now.identity.familyName}`,
        reached: now.reached,
      }),
    );
  });

  it("no generated official carries a real officeholder's name", () => {
    const core = world(randomPlace("names").key);
    const api = coreAPI(core);
    for (const state of [
      pick(states, "n1"),
      pick(states, "n2"),
      pick(states, "n3"),
    ])
      officesOfState(api, state);
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    expect(terms.length).toBeGreaterThan(100);
    const matches = terms.filter((t) =>
      isRealOfficeholderName(t.identity.givenName, t.identity.familyName),
    );
    expect(matches).toEqual([]);
  });
});
