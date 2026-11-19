/**
 * A closing records what made its losing months (docs/pool item
 * industry-closing-reason-names-no-law): in a played year of a drawn place with
 * the employer's Medicare share raised, every closure row for losses carries
 * `causes`, the costs of its losing months largest first, and the closing
 * event carries them as facts. Places are drawn until one closes a business in
 * the year; the ones passed over are named. Seed printed (CLOSING_SEED
 * replays).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawInForce, type LawRowInput } from "./modules/laws";
import { BUSINESS_MODULE_ID } from "./business-module-id";
import { coreAPI } from "./state";

const seed = process.env.CLOSING_SEED || randomBytes(8).toString("hex");
const DRAWS = 6;

describe(`Closings keep their causes (seed ${seed})`, () => {
  it(
    "every closure row of a played year with a payroll tax raise carries causes",
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      const passed: string[] = [];
      for (let at = 0; at < DRAWS; at += 1) {
        const drawn = drawPlace(at ? `${seed}:${at}` : seed, "closing-causes");
        const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
        const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        });
        const api = coreAPI(core);
        const now = lawInForce(api, "medicare-tax").governing as LawRowInput;
        const rate = Number(now.terms?.employerRate ?? now.value);
        enactLaw(api, {
          level: now.level,
          jurisdiction: now.jurisdiction,
          series: "medicare-tax",
          value: Number(now.value) + 8 * rate,
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: "closing-causes-test",
          citation:
            "Closing causes test: the employer's Medicare share raised.",
          ...(now.unit ? { unit: now.unit } : {}),
          terms: {
            ...(now.terms ?? {}),
            ...(typeof now.terms?.employerRate === "number"
              ? { employerRate: 9 * rate }
              : {}),
          },
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 365));
        const closures = (
          api
            .moduleState(BUSINESS_MODULE_ID)
            .table("closures")
            .rows() as unknown as {
            id: string;
            date: string;
            cause?: string;
            causes?: { costs: unknown[] };
          }[]
        ).filter((row) => row.date >= gameStartDate());
        // A closing for losses names what made its losing months; one for
        // another reason (an owner retiring, no successor) has no losing months
        // and names that reason instead.
        const forLosses = closures.filter((row) => row.cause === "losses-kept");
        if (!forLosses.length) {
          passed.push(`${where}: no closing for losses in the year`);
          continue;
        }
        for (const row of forLosses)
          expect(
            row.causes?.costs.length ?? 0,
            `${where}: ${row.id} closed on ${row.date} for losses with no recorded costs`,
          ).toBeGreaterThan(0);
        for (const row of closures.filter((r) => r.cause !== "losses-kept"))
          expect(
            row.cause,
            `${where}: ${row.id} closed on ${row.date} with no recorded reason`,
          ).toBeTypeOf("string");
        console.log(
          `${where}: ${forLosses.length} closings for losses with causes of ${closures.length}; passed over: ${passed.join("; ") || "none"}`,
        );
        return;
      }
      throw new Error(
        `no drawn place closed a business in the year: ${passed.join("; ")}`,
      );
    },
  );
});
