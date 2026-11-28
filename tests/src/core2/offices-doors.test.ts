/**
 * The offices doors (OF2, OF3 of docs/coordination/refactor/offices-2026-11-27.md): an office, a seat,
 * a term or a vacancy by id, a seat's office, a person's terms, the open vacancies, and one "who holds"
 * door over the offices engine's terms and the officials engine's seated rows. In a played world of a
 * place drawn from all 56, each door answers what the table it replaces answers, and reading them
 * changes no record.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { coreAPI } from "../../../src/core2/state";
import {
  OFFICES_MODULE_ID,
  allOffices,
  allSeats,
  allTerms,
  officeById,
  officeholderIds,
  officeSeats,
  officesInJurisdiction,
  servingTerms,
  servingTermsOfOffice,
  servingTermsOnSeat,
  termCount,
  termOnSeat,
  officeOfSeat,
  openVacancies,
  seatById,
  seatsHeldBy,
  servingTermsOf,
  termById,
  termsOfPerson,
  vacancyById,
  whoHolds,
  type TermRow,
  type VacancyRow,
} from "../../../src/core2/modules/offices";
import {
  OFFICIALS_MODULE_ID,
  allOfficials,
} from "../../../src/core2/modules/officials";

const seed = process.env.OFFICES_SEED ?? randomBytes(8).toString("hex");

it(
  `the offices doors answer what the tables answer (seed ${seed})`,
  { timeout: 300_000 },
  () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "offices-doors");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const sizes = () =>
      ["offices", "seats", "terms", "vacancies"].map(
        (name) => offices.table(name).size,
      );
    const before = sizes();
    const officialsBefore = allOfficials(api).length;

    const terms = offices.table("terms").rows() as unknown as TermRow[];
    expect(terms.length, where).toBeGreaterThan(0);
    for (const term of terms.slice(0, 400)) {
      expect(termById(api, term.id), where).toEqual(term);
      const seat = seatById(api, term.seatId);
      expect(seat?.id, where).toBe(term.seatId);
      expect(officeOfSeat(api, term.seatId)?.id, where).toBe(term.officeId);
      expect(officeById(api, term.officeId)?.id, where).toBe(term.officeId);
    }
    expect(termById(api, "term:none"), where).toBeUndefined();
    expect(seatById(api, "seat:none"), where).toBeUndefined();
    expect(officeById(api, "office:none"), where).toBeUndefined();
    expect(officeOfSeat(api, "seat:none"), where).toBeUndefined();

    // A person's terms: all of them, and the serving ones through the door that already existed.
    const named = terms.find((t) => t.personId);
    expect(named, where).toBeDefined();
    const mine = termsOfPerson(api, named!.personId!);
    expect(
      mine.map((t) => t.id),
      where,
    ).toContain(named!.id);
    expect(
      mine.filter((t) => t.status === "serving").map((t) => t.id),
      where,
    ).toEqual(servingTermsOf(api, named!.personId!).map((t) => t.id));

    // The whole-table and indexed reads answer what the tables answer, in the table's order.
    const raw = (name: string) => offices.table(name).rows();
    expect(allOffices(api), where).toEqual(raw("offices"));
    expect(allSeats(api), where).toEqual(raw("seats"));
    expect(allTerms(api), where).toEqual(raw("terms"));
    expect(termCount(api), where).toBe(offices.table("terms").size);
    expect(servingTerms(api), where).toEqual(
      offices.table("terms").query("byStatus", ["serving"]),
    );
    const state = (allOffices(api).find((o) => o.level === "state") ??
      undefined)!;
    expect(state, where).toBeDefined();
    expect(officesInJurisdiction(api, state.jurisdiction), where).toEqual(
      offices.table("offices").query("byJurisdiction", [state.jurisdiction]),
    );
    expect(officeSeats(api, state.id), where).toEqual(
      offices.table("seats").query("byOffice", [state.id]),
    );
    expect(servingTermsOfOffice(api, state.id), where).toEqual(
      offices.table("terms").query("byOfficeStatus", [state.id, "serving"]),
    );
    for (const term of terms
      .filter((t) => t.status === "serving")
      .slice(0, 200)) {
      expect(servingTermsOnSeat(api, term.seatId), where).toEqual(
        offices.table("terms").query("bySeatStatus", [term.seatId, "serving"]),
      );
      expect(termOnSeat(api, term.seatId)?.id, where).toBe(term.id);
    }
    expect(officesInJurisdiction(api, "none"), where).toEqual([]);
    expect(termOnSeat(api, "seat:none"), where).toBeUndefined();

    // Vacancies: by id, and the unfilled ones.
    const vacancies = offices
      .table("vacancies")
      .rows() as unknown as VacancyRow[];
    for (const v of vacancies.slice(0, 100))
      expect(vacancyById(api, v.id), where).toEqual(v);
    expect(new Set(openVacancies(api).map((v) => v.id)), where).toEqual(
      new Set(vacancies.filter((v) => v.status !== "filled").map((v) => v.id)),
    );

    // Who holds a seat: the serving term's person, else the officials engine's seated member.
    const serving = terms.filter((t) => t.status === "serving");
    for (const term of serving.slice(0, 400)) {
      const held = whoHolds(api, term.seatId);
      expect(held?.term?.id, where).toBe(term.id);
      expect(held?.personId, where).toBe(
        term.personId ?? held?.official?.id ?? null,
      );
    }
    // Every seated official is found by their seat and holds that seat; where the term names no person, they are the holder.
    const seated = allOfficials(api).filter((row) => row.ended === null);
    expect(seated.length, where).toBeGreaterThan(0);
    for (const row of seated.slice(0, 400)) {
      const held = whoHolds(api, row.seatId);
      expect(held?.official?.id, `${where}: ${row.seatId}`).toBe(row.id);
      expect(held?.personId, `${where}: ${row.seatId}`).toBe(
        held?.term?.personId ?? row.id,
      );
      expect(seatsHeldBy(api, row.id), where).toContain(row.seatId);
    }
    expect(whoHolds(api, "seat:none"), where).toBeNull();

    // The officeholders of the day are the officials engine's seated rows and the terms that name a person.
    const expected = new Set<string>();
    for (const row of allOfficials(api))
      if (row.ended === null) expected.add(row.id);
    for (const t of serving)
      if (typeof t.personId === "string") expected.add(t.personId);
    expect(officeholderIds(api), where).toEqual(expected);
    for (const id of [...expected].slice(0, 200))
      expect(seatsHeldBy(api, id).length, `${where}: ${id}`).toBeGreaterThan(0);
    expect(seatsHeldBy(api, "person:nobody"), where).toEqual([]);
    expect(core.modules.has(OFFICIALS_MODULE_ID), where).toBe(true);

    // Reading is not writing.
    expect(sizes(), where).toEqual(before);
    expect(allOfficials(api).length, where).toBe(officialsBefore);
  },
);
