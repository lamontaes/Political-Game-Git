/**
 * A person's schooling sets the pay they are hired at (pool item
 * world-schooling-to-pay): over a played year, each hire's pay is the
 * position's pay moved by the hire's own education record, so hires into
 * positions at the same pay differ by schooling. A place is drawn from all 56
 * on a seed nobody chose (SCHOOLING_PAY_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { residentPerson } from "./modules/residents";
import { PROFILE_FACT_KINDS, profileFor } from "./opening-profile";
import { coreAPI } from "./state";

const seed = process.env.SCHOOLING_PAY_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("hires into one position pay differ by their own schooling, full and counted alike", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "schooling-pay");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const store = api.moduleState(JOBS_MODULE_ID);
    const positions = new Map(
      (
        store.table("positions").rows() as unknown as {
          id: string;
          hourlyMinor: number;
        }[]
      ).map((row) => [row.id, row.hourlyMinor]),
    );
    const hires = (
      store.table("changes").rows() as unknown as {
        jobId: string;
        personId: string;
        kind: string;
        values: { hourlyMinor: number; counted?: number };
      }[]
    )
      .filter((row) => row.kind === "hire")
      .map((row) => {
        const person =
          core.people.get(row.personId) ?? residentPerson(core, row.personId);
        const positionId = row.jobId
          .slice("job:".length)
          .slice(0, -(row.personId.length + 1));
        const level =
          person?.pastFacts?.find(
            (fact) => fact.kind === PROFILE_FACT_KINDS.education,
          )?.facts?.level ??
          (person ? profileFor(person, core.seed, core.date)?.education : "");
        return {
          jobId: row.jobId,
          level: level ?? "",
          counted: Boolean(row.values.counted),
          paid: row.values.hourlyMinor,
          position: positions.get(positionId),
        };
      })
      .filter((row) => row.position !== undefined && row.level);
    const ordered = ["no-college", "some-college", "college"];
    const byPosition = Map.groupBy(hires, (row) => row.position!);
    let low: (typeof hires)[number] | undefined;
    let high: (typeof hires)[number] | undefined;
    for (const [, rows] of byPosition) {
      const a = rows.find((r) => r.level === "no-college");
      const b = rows.find((r) => r.level === "college");
      if (a && b) {
        low = a;
        high = b;
        break;
      }
    }
    if (!low || !high) {
      // No two hires share a position pay; compare any no-college and college
      // hire against their own position's pay instead.
      const a = hires.find((r) => r.level === "no-college");
      const b = hires.find((r) => r.level === "college");
      if (!a || !b) {
        tried.push(`${where}: ${hires.length} hires, no pair of levels`);
        continue;
      }
      expect(a.paid / a.position!, `${where}: ${a.jobId}`).toBeLessThan(1);
      expect(b.paid / b.position!, `${where}: ${b.jobId}`).toBeGreaterThan(1);
      return;
    }
    expect(
      ordered.indexOf(low.level) < ordered.indexOf(high.level),
      where,
    ).toBe(true);
    expect(
      low.paid / low.position!,
      `${where}: ${low.jobId} vs ${high.jobId}`,
    ).toBeLessThan(high.paid / high.position!);
    return;
  }
  throw new Error(
    `no drawn place had hires of two levels: ${tried.join("; ")}`,
  );
}, 1_800_000);
