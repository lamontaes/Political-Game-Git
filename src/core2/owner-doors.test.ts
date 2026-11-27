import { describe, expect, it } from "vitest";
import { recordBackgroundPerson } from "./husk-promoters";
import { revisePostWage } from "./job-lifecycle";
import { setSeatElectionYear } from "./modules/offices";
import { recordPastVote, type VoteRecordRow } from "./modules/record";
import type { CoreAPI, CoreState, HuskInput, JobInput, Source } from "./types";

/** The owners' doors for the writes other engines used to make themselves. */
const source = {
  tag: "SOURCED",
  citation: "test",
  asOf: "2026-01-01",
} as Source;

function rowTable() {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    table: {
      get: (id: string) => rows.get(id),
      put: (row: { id: string }) => void rows.set(row.id, row),
    },
  };
}
const apiOver = (table: ReturnType<typeof rowTable>["table"]) =>
  ({ moduleState: () => ({ table: () => table }) }) as unknown as CoreAPI;

describe("an engine writes another's records through the owner's door", () => {
  it("revises a post's wage and keeps the job, and leaves an ended one alone", () => {
    const job = (extra: Partial<JobInput>) =>
      ({
        id: "job:office:a",
        wageDailyMinor: 100,
        source,
        ...extra,
      }) as JobInput;
    const core = {
      jobs: new Map([
        ["job:office:a", job({})],
        ["job:office:b", job({ id: "job:office:b", endsAt: "2025-01-01" })],
      ]),
    } as unknown as CoreState;
    revisePostWage(core, "job:office:a", 250, { ...source, citation: "pay" });
    revisePostWage(core, "job:office:b", 250, source);
    revisePostWage(core, "job:office:none", 250, source);
    expect(core.jobs.get("job:office:a")).toMatchObject({
      wageDailyMinor: 250,
      source: { citation: "pay" },
    });
    expect(core.jobs.get("job:office:b")!.wageDailyMinor).toBe(100);
    expect(core.jobs.has("job:office:none")).toBe(false);
  });

  it("records a background person once and never over a person or a husk", () => {
    const husk = (id: string, givenName: string) =>
      ({ id, givenName, familyName: "X", source }) as unknown as HuskInput;
    const core = {
      people: new Map([["p-person", {}]]),
      husks: new Map(),
    } as unknown as CoreState;
    recordBackgroundPerson(core, husk("p-new", "Ada"));
    recordBackgroundPerson(core, husk("p-new", "Grace"));
    recordBackgroundPerson(core, husk("p-person", "Linus"));
    expect(core.husks.get("p-new" as never)!.givenName).toBe("Ada");
    expect(core.husks.has("p-person" as never)).toBe(false);
  });

  it("moves a seat's election year on, only for a seat that exists", () => {
    const { rows, table } = rowTable();
    rows.set("seat:1", { id: "seat:1", officeId: "o", electionYear: 2024 });
    setSeatElectionYear(apiOver(table), "seat:1", 2028);
    setSeatElectionYear(apiOver(table), "seat:2", 2028);
    expect(rows.get("seat:1")).toMatchObject({
      electionYear: 2028,
      officeId: "o",
    });
    expect(rows.has("seat:2")).toBe(false);
  });

  it("puts a past vote on the record exactly as it was cast", () => {
    const { rows, table } = rowTable();
    const row = {
      id: "vote:b:q:p1",
      personId: "p1",
      date: "1999-05-01",
      body: "council",
      billId: "b",
      measureId: "b",
      stance: { question: "q", position: 1 },
      question: "q",
      passed: true,
    } as unknown as VoteRecordRow;
    recordPastVote(apiOver(table), row);
    expect(rows.get("vote:b:q:p1")).toEqual(row);
  });
});
