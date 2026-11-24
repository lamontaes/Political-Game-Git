import { expect, it } from "vitest";
import { buildPopulation } from "../core2/population";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  CASES_MODULE,
  CASES_MODULE_ID,
  type CaseRow,
} from "../core2/modules/constituent-cases";
import { JOBS_MODULE, JOBS_MODULE_ID } from "../core2/modules/jobs";
import { coreAPI, createCore } from "../core2/state";
import { caseFacts } from "./constituent-help-facts";

it("reads savings and layoff history only when the resident brings a job search to office hours", () => {
  const input = buildPopulation({
    seed: "case-facts",
    startedAt: gameStartDate(),
    placeKey: "2128900",
    minimumPeople: 20,
  });
  const core = createCore(input, { modules: [CASES_MODULE, JOBS_MODULE] });
  const api = coreAPI(core);
  const person = [...core.people.values()].find((row) => row.alive)!;
  const employer = [...core.organizations.values()].find(
    (org) => org.kind === "employer",
  )!;
  const layoff = {
    id: "test-layoff",
    personId: person.id,
    organizationId: employer.id,
    kind: "layoff",
    date: addDays(makeIsoDate(core.date), -2),
  };
  api.moduleState(JOBS_MODULE_ID).table("changes").put(layoff);
  const base = {
    id: "test-case",
    personId: person.id,
    officialId: "test-official",
    severity: 0.9,
    standing: 0,
    opened: core.date,
    respondBy: addDays(makeIsoDate(core.date), 7),
    status: "open",
    handledBy: null,
    outcome: null,
  } as const;
  function read(problem: CaseRow["problem"], facts: CaseRow["facts"]) {
    api
      .moduleState(CASES_MODULE_ID)
      .table("cases")
      .put({ ...base, problem, facts });
    return caseFacts(core, person.id, {
      id: "test-visit",
      date: core.date,
      facts: { caseId: base.id },
    });
  }

  const custody = read("family-in-custody", {
    relativeId: "test-relative",
    custodyId: "test-custody",
  });
  for (const key of [
    "problem-work",
    "problem-wage",
    "money-left",
    "employer",
    "since",
    "pay",
    "floor",
  ])
    expect(custody[key], key).toBeUndefined();
  expect(custody["respond-in"].sourceRecordIds).toEqual([base.id]);

  const work = read("looking-for-work", { cushionMonths: 0.3 });
  expect(work["problem-work"].text).toBe("yes");
  expect(work["money-left"].sourceRecordIds).toEqual([base.id]);
  expect(work.employer.sourceRecordIds).toEqual([layoff.id, employer.id]);
  expect(work.since.sourceRecordIds).toEqual([layoff.id]);

  const wage = read("paid-under-minimum-wage", {
    hourlyMinor: 325,
    floorMinor: 1481,
  });
  expect(wage["problem-wage"].text).toBe("yes");
  expect(wage.pay.text).toBe("$3.25");
  expect(wage.floor.text).toBe("$14.81");
  expect(wage["money-left"]).toBeUndefined();
  expect(wage["problem-work"]).toBeUndefined();
}, 120_000);
