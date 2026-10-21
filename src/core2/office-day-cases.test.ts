/**
 * Office hours in the world the owner plays: the bench world, a place and
 * seed nobody chose, every module installed. A resident's case waits on an
 * official's desk. When nobody told the character how to decide it, the
 * character decides by the constituent-cases engine's own rule for a case
 * nobody decided (`ownCaseDecision`), and the case ends as that rule says.
 *
 * Fixture: the played world opens no cases of its own in its first months
 * (only full residents bring one, and none has such a problem yet; a pool
 * item names that), so one case is placed between a real resident and a
 * real official. It proves the rule, not the arrival of cases.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { coreAPI } from "./state";
import {
  CASES_MODULE_ID,
  allCases,
  ownCaseDecision,
  type CaseRow,
} from "./modules/constituent-cases";
import { townSeats } from "./modules/offices";
import { OFFICE_DAY_MODULE, officeActsOf } from "./modules/office-day";
import { addDays } from "./office-day-federal-calendar";
import type { ModuleRow } from "./module-data";

const seed = process.env.OFFICE_CASES_SEED || randomBytes(8).toString("hex");
// A place with a council or mayor holder to hold office hours and a resident
// who holds no seat.
const officialIn = (api: ReturnType<typeof coreAPI>) =>
  townSeats(api).find(
    (s) => ["council", "mayor"].includes(s.office.kind) && s.holder?.personId,
  )?.holder?.personId;
const { world, place } = worldWith(seed, "office-cases", (w) => {
  const api = coreAPI(w.core);
  const officials = new Set(townSeats(api).map((s) => s.holder?.personId));
  return (
    !!officialIn(api) &&
    [...w.core.people.values()].some(
      (p) => p.alive && p.tier !== "husk" && !officials.has(p.id),
    )
  );
});
console.log(`office-day-cases: ${place.name} (${place.key}), seed ${seed}`);
const core = world.core;
const api = coreAPI(core);

describe(`office hours (${place.name}, seed ${seed})`, () => {
  it("decides an undecided case by the cases engine's own rule", () => {
    const official = officialIn(api)!;
    const officials = new Set(townSeats(api).map((s) => s.holder?.personId));
    const resident = [...core.people.values()].find(
      (p) => p.alive && p.tier !== "husk" && !officials.has(p.id),
    )!;
    const row: CaseRow = {
      id: `case:${resident.id}:${core.date}`,
      personId: resident.id,
      officialId: official,
      problem: "looking-for-work",
      severity: 0.5,
      facts: { cushionMonths: 1 },
      opened: core.date,
      respondBy: addDays(core.date, 7),
      status: "open",
      handledBy: null,
      outcome: null,
    };
    api
      .moduleState(CASES_MODULE_ID)
      .table("cases")
      .put(row as unknown as ModuleRow);
    const own = ownCaseDecision(api, official);
    const handler = (
      OFFICE_DAY_MODULE.effectHandlers as unknown as Record<
        string,
        (api: unknown, actorId: string) => void
      >
    )["office-hours"]!;
    handler(api, official);
    expect(allCases(api).find((c) => c.id === row.id)!.status).toBe(
      own.decision === "help" ? "helped" : "declined",
    );
    const act = officeActsOf(api, official).find(
      (a) => a.kind === "case" && a.recordId === row.id,
    )!;
    expect(act.how).toBe("own-choice");
    expect(act.position).toBe(own.duty);
  });
});
