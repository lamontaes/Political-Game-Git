/**
 * A relative of someone in custody can bring a case, and the official's call
 * reaches the jail (pool item gov-constituent-case-family-in-custody). In a
 * drawn place (set CASE_CUSTODY_SEED to replay) a resident whose living
 * relative is serving a term has the problem `family-in-custody` read from the
 * custody record, and has none once the record is gone; the official's
 * referral is read by the justice engine on the next day, which grants the
 * visit by its own record. The custody row is a fixture here (an edge case);
 * the played year's own custody records are the item's second-session check.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CASES_MODULE_ID,
  handleCase,
  problemOf,
} from "./modules/constituent-cases";
import type { CaseRow } from "./modules/constituent-cases";
import { JUSTICE_MODULE_ID } from "./modules/justice";
import type { ModuleRow } from "./module-data";
import { coreAPI } from "./state";

const base = process.env.CASE_CUSTODY_SEED ?? randomBytes(8).toString("hex");

for (const salt of ["a", "b"]) {
  it(`a relative brings a family-in-custody case and the referral reaches the jail (draw ${salt}, seed ${base})`, () => {
    const seed = createHash("sha256").update(`${base}:${salt}`).digest("hex");
    const place = drawPlace(seed, "case-custody");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
      const adults = [...core.people.values()]
        .filter((p) => p.alive)
        .sort((a, b) => a.id.localeCompare(b.id));
      const person = adults.find(
        (p) =>
          p.birthDate < `${Number(core.date.slice(0, 4)) - 20}` &&
          problemOf(api, p)?.problem !== "family-in-custody" &&
          [...p.familyIds].some((id) => core.people.get(id)?.alive),
      );
      expect(person, `${where}: an adult with a living relative`).toBeDefined();
      const relativeId = [...person!.familyIds].find(
        (id) => core.people.get(id)?.alive,
      )!;
      // The record absent: no such problem.
      expect(
        problemOf(api, person!)?.problem,
        `${where}: no custody record`,
      ).not.toBe("family-in-custody");
      const custodyTable = api.moduleState(JUSTICE_MODULE_ID).table("custody");
      const custody = {
        id: `custody:fixture:${relativeId}`,
        kind: "person",
        personId: relativeId,
        sentenceId: "fixture",
        from: addDays(makeIsoDate(core.date), -30),
        until: addDays(makeIsoDate(core.date), 330),
        status: "serving",
        priorEligible: null,
      };
      custodyTable.put(custody as unknown as ModuleRow);
      const found = problemOf(api, person!);
      expect(found?.problem, `${where}: custody record present`).toBe(
        "family-in-custody",
      );
      expect(found!.facts, where).toMatchObject({
        relativeId,
        custodyId: custody.id,
      });
      expect(found!.severity, where).toBeGreaterThan(0.8);
      expect(found!.severity, where).toBeLessThanOrEqual(1);
      // The official's help: a referral the justice engine reads the next day.
      const caseId = `case:${person!.id}:${core.date}`;
      const row: CaseRow = {
        id: caseId,
        personId: person!.id,
        officialId: "official:fixture",
        problem: "family-in-custody",
        severity: found!.severity,
        facts: found!.facts,
        opened: core.date,
        respondBy: addDays(makeIsoDate(core.date), 14),
        status: "open",
        handledBy: null,
        outcome: null,
      };
      api
        .moduleState(CASES_MODULE_ID)
        .table("cases")
        .put(row as unknown as ModuleRow);
      const done = handleCase(api, caseId, "help");
      expect(done?.outcome, where).toBe("referred-to-custody-review");
      const referrals = api
        .moduleState(JUSTICE_MODULE_ID)
        .table("custodyReferrals");
      const referralId = `custody-referral:${caseId}`;
      expect(
        (referrals.get(referralId) as { status?: string })?.status,
        where,
      ).toBe("open");
      advanceCore(core, addDays(makeIsoDate(core.date), 3));
      expect(
        (referrals.get(referralId) as { status?: string })?.status,
        where,
      ).toBe("access-granted");
      const visit = core.durableLog.get(
        `justice.visiting-access:${referralId}`,
      );
      expect(visit?.kind, `${where}: the visit record`).toBe(
        "justice.visiting-access",
      );
      console.log(
        `case-custody: ${where}; ${person!.id} -> ${relativeId}, ${custody.id}, ${referralId}, ${visit!.id}`,
      );
    } finally {
      setBookkeeping(was);
    }
  }, 900_000);
}
