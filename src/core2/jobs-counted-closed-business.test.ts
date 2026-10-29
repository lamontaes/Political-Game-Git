/** A closed business hires no one, counted or named: an opening it left listed fills from nobody. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ownerOf } from "./modules/business";
import { residentsRuntime } from "./modules/residents";
import { endCountedJob } from "./residents-economy";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

interface Position {
  id: string;
  organizationId: string;
  status: string;
}
interface Employer {
  id: string;
  countedJobs?: Record<string, string>;
}

it("never hires a counted worker into a business that has closed", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 4; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "counted-hire-closed");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 35));
    const state = api.moduleState("jobs");
    // A counted worker leaves each of the employers with the most counted
    // workers; the jobs engine posts a replacement opening at each.
    const employers = (state.table("employers").rows() as unknown as Employer[])
      .filter((row) => Object.keys(row.countedJobs ?? {}).length > 0)
      .sort(
        (a, b) =>
          Object.keys(b.countedJobs ?? {}).length -
          Object.keys(a.countedJobs ?? {}).length,
      )
      .slice(0, 10);
    for (const row of employers)
      endCountedJob(core, Object.keys(row.countedJobs!)[0]!);
    // Run until openings stand at some of them, then close those businesses
    // with the openings still listed.
    let closed: string[] = [];
    for (let day = 0; day < 40 && !closed.length; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const open = (state.table("positions").rows() as unknown as Position[])
        .filter(
          (p) =>
            p.status === "open" &&
            employers.some((e) => e.id === p.organizationId),
        )
        .map((p) => p.organizationId);
      closed = [...new Set(open)];
    }
    if (!closed.length) {
      tried.push(
        `${where}: no opening stood at an employer that lost a worker`,
      );
      continue;
    }
    const day = core.date;
    // Closed by its owner through the engine's own closure (the owner's
    // account takes what is left), the openings still listed.
    const reallyClosed: string[] = [];
    for (const id of closed) {
      const owner = ownerOf(api, id);
      if (!owner || !core.people.has(owner)) continue;
      api.closeBusinessByChoice({
        organizationId: id,
        ownerAccountId: api.accounts().main(owner),
        reasonKey: "losses",
        source: {
          tag: "ESTIMATED",
          asOf: day,
          citation: "A test closes an employer with its openings listed.",
          estimatedFrom: `${owner} closed ${id}.`,
        },
      });
      reallyClosed.push(id);
    }
    closed = reallyClosed;
    if (!closed.length) {
      tried.push(`${where}: no opening stood at a business a person owns`);
      continue;
    }
    const before = new Set(residentsRuntime(core)!.jobs.keys());
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    const hired = [...residentsRuntime(core)!.jobs.values()].filter(
      (job) => closed.includes(job.organizationId) && !before.has(job.id),
    );
    expect(
      hired.map((job) => job.id),
      `${where}: counted hires into closed ${closed.join(", ")}`,
    ).toEqual([]);
    return;
  }
  throw new Error(
    `no drawn place had an opening to close: ${tried.join("; ")}`,
  );
}, 900_000);
