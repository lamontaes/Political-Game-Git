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
  pastElections,
  townSeats,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import partyCounts from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import { isRealOfficeholderName } from "./officials-names";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`offices:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(salt: string) {
  const state = pick(states, `${salt}:state`);
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
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
    // The President and Vice President aren't drawn as relatives.
    const president = seats.find(
      (s) => s.seat.id === "seat:US:president",
    )?.holder;
    const vice = seats.find(
      (s) => s.seat.id === "seat:US:vice-president",
    )?.holder;
    if (president && vice)
      expect(vice.identity.familyName).not.toBe(president.identity.familyName);
    const levels = new Set(seats.map((s) => s.office.level));
    expect(levels.has("federal")).toBe(true);
    expect(levels.has("state")).toBe(true);
    for (const { office, seat, holder } of seats) {
      expect(holder, `${office.title} ${seat.id}`).not.toBeNull();
      expect(holder!.identity.givenName.length).toBeGreaterThan(0);
      expect(holder!.startDate <= START).toBe(true);
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
    // A place with a resident in a local seat (some places have none).
    let core = world(randomPlace("vacancy").key);
    let api = coreAPI(core);
    const residentSeats = () =>
      townSeats(api).filter(
        (s) => s.holder?.personId && s.office.level !== "federal",
      );
    for (let n = 1; !residentSeats().length && n < 10; n += 1) {
      core = world(randomPlace(`vacancy:${n}`).key);
      api = coreAPI(core);
    }
    const local = residentSeats();
    expect(
      local.length,
      "no place with a resident officeholder",
    ).toBeGreaterThan(0);
    const { office, seat, holder } = pick(local, "seat");
    const placeId = core.people.get(holder!.personId!)!.placeId;
    // The holder dies (as the life engine records a death), then the event.
    api.updatePerson(holder!.personId!, { alive: false });
    api.emit({
      id: `test-death:${holder!.personId}`,
      date: START,
      kind: "life.death",
      personIds: [holder!.personId!],
      placeId,
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

  it("holders at the opening have careers of real length: terms begin before it and earlier terms are on the record", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("careers").key;
    const core = world(placeKey);
    const api = coreAPI(core);
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    const serving = terms.filter((t) => t.status === "serving");
    const offices = new Map(townSeats(api).map((s) => [s.office.id, s.office]));
    let before = 0;
    let withPast = 0;
    for (const t of serving) {
      expect(t.startDate <= START, `${placeKey} ${t.seatId}`).toBe(true);
      const office = offices.get(t.officeId);
      if (
        !office?.termYears ||
        !t.endDate ||
        office.kind === "president" ||
        office.kind === "vice-president"
      )
        continue;
      if (t.startDate < START) before += 1;
      expect(t.serviceStart! <= t.startDate).toBe(true);
      const past = terms
        .filter((p) => p.id.startsWith(`${t.id}:past:`))
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (past.length) withPast += 1;
      // Unbroken: each past term ends as the next begins.
      for (const [i, p] of past.entries()) {
        expect(p.status).toBe("ended");
        expect(p.endDate).toBe(past[i + 1]?.startDate ?? t.startDate);
      }
      expect(past[0]?.startDate ?? t.startDate).toBe(t.serviceStart);
      // Nobody first served under the minimum age.
      expect(
        Number(t.serviceStart!.slice(0, 4)) -
          Number(t.identity.birthDate.slice(0, 4)),
        `${placeKey} ${t.seatId}`,
      ).toBeGreaterThanOrEqual(21);
    }
    expect(before, placeKey).toBeGreaterThan(0);
    expect(withPast, placeKey).toBeGreaterThan(0);
    // Each elected term carries the election that seated it, before its start.
    for (const t of serving.filter((t) => t.elected)) {
      expect(t.elected!.date < t.startDate, `${placeKey} ${t.seatId}`).toBe(
        true,
      );
      expect(t.elected!.share).toBeGreaterThan(0.5);
      const history = pastElections(api, t.seatId);
      expect(history.at(-1)?.termId).toBe(t.id);
      // One election per term, oldest first, each before the next.
      for (let i = 1; i < history.length; i += 1)
        expect(history[i]!.date > history[i - 1]!.date).toBe(true);
    }
    govReport(
      "offices-careers",
      JSON.stringify({
        placeKey,
        seed,
        careers: serving
          .filter((t) => t.serviceStart)
          .map(
            (t) =>
              `${offices.get(t.officeId)?.title ?? t.officeId}: since ${t.serviceStart}, this term ${t.startDate} to ${t.endDate}`,
          ),
      }),
    );
  });

  it("seats every member of a chamber whose district elects its members in lettered seats", () => {
    // The places whose roster names a district's members as "10A" and "10B":
    // drawn from the data, never named in the test.
    const lettered = Object.entries(
      (
        partyCounts as unknown as {
          places: Record<
            string,
            Record<string, { seatParties?: Record<string, string[]> }>
          >;
        }
      ).places,
    ).flatMap(([state, chambers]) =>
      Object.entries(chambers).flatMap(([chamber, row]) => {
        const names = Object.keys(row.seatParties ?? {});
        const numbers = new Set(
          names.flatMap((name) => {
            const match = /^0*(\d+)[A-Za-z]$/.exec(name);
            return match ? [match[1]!] : [];
          }),
        );
        // A district that is a pair: two lettered seats of one number, and no plain one.
        const pairs = [...numbers].filter(
          (number) =>
            names.filter((name) =>
              new RegExp(`^0*${number}[A-Za-z]$`).test(name),
            ).length >= 2 && !names.includes(number),
        );
        return pairs.length && chamber === "lower"
          ? [{ state, chamber, pairs }]
          : [];
      }),
    );
    expect(lettered.length).toBeGreaterThan(0);
    const drawn = pick(lettered, "lettered");
    const place = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: drawn.state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key))[0]!;
    const where = `seed ${seed}, ${drawn.state} place ${place.key}`;
    const api = coreAPI(world(place.key));
    const seats = api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .rows() as unknown as { officeId: string; district: string | null }[];
    const chamber = `office:${drawn.state}:legislature-${drawn.chamber}`;
    for (const number of drawn.pairs) {
      const members = seats.filter(
        (seat) =>
          seat.officeId === chamber &&
          seat.district !== null &&
          new RegExp(`^0*${number}[A-Za-z]?$`).test(seat.district),
      );
      // Both lettered seats are filed, not one for the pair.
      expect(
        members.length,
        `${where} district ${number}`,
      ).toBeGreaterThanOrEqual(2);
    }
  }, 120_000);

  it("another state's chambers seat what the researched table says, no state named in the test", () => {
    type Row = { members: number; districts: number };
    const table = (
      partyCounts as unknown as { places: Record<string, Record<string, Row>> }
    ).places;
    const researched = Object.keys(table)
      .filter((state) => Object.keys(table[state]!).length > 0)
      .sort();
    const core = world(randomPlace("seat-counts").key);
    const api = coreAPI(core);
    const seats = () =>
      api.moduleState(OFFICES_MODULE_ID).table("seats").rows() as unknown as {
        officeId: string;
      }[];
    for (const state of [
      pick(researched, "s1"),
      pick(researched, "s2"),
      pick(researched, "s3"),
    ]) {
      officesOfState(api, state);
      for (const chamber of ["lower", "upper"] as const) {
        const row = table[state]![chamber];
        if (!row) continue;
        const count = seats().filter(
          (seat) => seat.officeId === `office:${state}:legislature-${chamber}`,
        ).length;
        // Seats are at least the sitting members; vacancies are the rest.
        expect(
          count,
          `seed ${seed} ${state} ${chamber}`,
        ).toBeGreaterThanOrEqual(row.members);
      }
    }
  }, 120_000);
});
