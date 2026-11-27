/**
 * The offices doors (OF2 of docs/coordination/refactor/offices-2026-11-27.md): an office, a seat,
 * a term or a vacancy by id, a seat's office, a person's terms and the open vacancies. In a played world of a
 * place drawn from all 56, each door answers what the table it replaces answers, and reading them
 * changes no record.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import {
  OFFICES_MODULE_ID,
  officeById,
  officeOfSeat,
  openVacancies,
  seatById,
  servingTermsOf,
  termById,
  termsOfPerson,
  vacancyById,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";

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

    // Vacancies: by id, and the unfilled ones.
    const vacancies = offices
      .table("vacancies")
      .rows() as unknown as VacancyRow[];
    for (const v of vacancies.slice(0, 100))
      expect(vacancyById(api, v.id), where).toEqual(v);
    expect(new Set(openVacancies(api).map((v) => v.id)), where).toEqual(
      new Set(vacancies.filter((v) => v.status !== "filled").map((v) => v.id)),
    );

    // Reading is not writing.
    expect(sizes(), where).toEqual(before);
  },
);
