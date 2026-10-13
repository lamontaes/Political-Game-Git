import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import {
  CANDIDACY_MODULE_ID,
  type CandidacyDecision,
  type WeighedContest,
} from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { coreAPI } from "./state";

// PW-3 in the world the owner plays: the bench world on a seed nobody chose,
// run until the first local contest's filing window has opened and closed.
// Every named adult in town weighed it, with reasons, and every runner filed.
const seed = process.env.PW3_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const world = buildBenchWorld(seed, opening, { twoLevel: true });
const api = coreAPI(world.core);
const contests = () =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
const local = (c: ContestRow) =>
  c.family === "municipalOffice" || c.family === "countyOffice";
const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
const yearEnd = `${Number(opening.slice(0, 4)) + 1}${opening.slice(4)}`;
// Run day by day until a local contest weighed in play has closed filing,
// or the year ends.
let date = opening;
const weighedRows = () =>
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .rows() as unknown as WeighedContest[];
while (date < yearEnd) {
  const closed = weighedRows().some((w) => {
    const c = contests().find((row) => row.id === w.contestId);
    return c && local(c) && c.filingDeadline < date;
  });
  if (closed) break;
  date = addDay(date);
  advanceCore(world.core, date);
}

describe(`who runs in the played world: ${world.place.key} ${world.place.context.jurisdiction.name ?? ""} (seed ${seed})`, () => {
  it("asks every named adult in town about each local contest whose filing opened, and keeps the reasons", () => {
    const weighed = weighedRows().filter((w) =>
      contests().some((c) => c.id === w.contestId && local(c)),
    );
    // A town whose next local filing opens after a year has nothing to weigh.
    if (!weighed.length)
      expect(
        contests().filter(
          (c) =>
            local(c) &&
            c.filingDeadline >= addDay(opening) &&
            c.filingDeadline <= yearEnd,
        ),
      ).toEqual([]);
    const decisions = api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows() as unknown as CandidacyDecision[];
    for (const w of weighed) {
      expect(w.askedIds.length).toBeGreaterThan(0);
      for (const personId of w.askedIds) {
        const d = decisions.find(
          (row) => row.contestId === w.contestId && row.personId === personId,
        )!;
        expect(d).toBeDefined();
        expect(Object.keys(d.reasons).length).toBeGreaterThan(5);
        expect(d.run).toBe(w.runIds.includes(personId));
      }
    }
  });

  it("files every runner with the place's filing office", () => {
    const filings = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[];
    for (const d of api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows() as unknown as CandidacyDecision[]) {
      if (!d.run) continue;
      expect(d.filing).toBeDefined();
      if (d.filing!.filingId)
        expect(
          filings.find((f) => f.id === d.filing!.filingId)?.filedWith,
        ).not.toBe("incumbent stands again");
      else expect(d.filing!.unmet.length).toBeGreaterThan(0);
    }
  });
});
