// @vitest-environment node
/** A local body (council or county board) takes up amendments to its own budget's lines through the year, some passing and some failing, and a passed one changes the line. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { bodyRow, members } from "./modules/legislature";
import { lineBacking } from "./modules/world-legislating";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const incorporated = (key: string) => {
  try {
    return lawChainForPlace(key).incorporated;
  } catch {
    return false;
  }
};
const unincorporated = (key: string) => {
  try {
    return !lawChainForPlace(key).incorporated;
  } catch {
    return false;
  }
};
const draws = [
  drawPlace(replay, "local-lines-town", incorporated),
  drawPlace(replay, "local-lines-county", unincorporated),
];

// A local body sits at the city, county or township level (a New England town's select board is a township board).
const LOCAL_BODIES = ["city", "county", "township"];

interface Bill {
  id: string;
  number: string;
  bodyOfficeId: string;
  status: string;
  provisions: { kind: string; line?: string; value: number }[];
}

for (const place of draws) {
  it(
    `a local body amends its budget lines through the year: ${place.name}, replay ${replay}`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        advanceCore(world.core, addDays(makeIsoDate(api.state.date), 365));
        const officeRows = api
          .moduleState("core2-offices-v1" as never)
          .table("offices")
          .rows() as unknown as { id: string; level: string; kind: string }[];
        const offices = new Map(officeRows.map((o) => [o.id, o.level]));
        const local = (
          api
            .moduleState("core2-legislature-v1" as never)
            .table("bills")
            .rows() as unknown as Bill[]
        ).filter(
          (b) =>
            LOCAL_BODIES.includes(offices.get(b.bodyOfficeId) ?? "") &&
            b.provisions.some((p) => p.kind === "budget-line"),
        );
        const by = (status: string) => local.filter((b) => b.status === status);
        const passed = local.filter((b) =>
          ["enacted", "overridden"].includes(b.status),
        );
        const amended = new Set(
          governments(api).flatMap((g) =>
            budgetsOf(api, g.id).map((b) => b.adoptedBy),
          ),
        );
        process.stdout.write(
          `LOCAL-LINES ${place.name} (${place.key}, seed ${place.seed}): ${local.length} line bills before the local body in a year: ${passed.length} passed, ${by("failed").length} failed, ${by("vetoed").length} vetoed; passed ones ${passed
            .slice(0, 3)
            .map(
              (b) =>
                `${b.number} (${b.provisions[0]!.line} ${b.provisions[0]!.value})`,
            )
            .join(", ")}\n`,
        );
        if (
          !governments(api).some((g) => ["city", "county"].includes(g.level))
        ) {
          process.stdout.write(
            `LOCAL-LINES ${place.name} (${place.key}, seed ${place.seed}): no local government budget in this place; nothing to amend\n`,
          );
          return;
        }
        expect(
          local.length,
          "line bills before the local body",
        ).toBeGreaterThan(0);
        // The annual budget is one bill; amendments are the rest.
        const mid = passed.filter((b) =>
          [...amended].some((a) => a.includes(`amended by ${b.number}`)),
        );
        // Where no amendment passed in the year, every line of every local
        // body has a reason it drew none: too few members back moving it, by
        // their own positions, against the majority a bill needs (the agenda
        // cap and a just-defeated change can't explain a year with no bill).
        let reasons = 0;
        for (const { id: officeId, level, kind } of mid.length
          ? []
          : officeRows) {
          // A body that sits as a group and votes bills (a mayor or a sheriff
          // alone does not amend a budget).
          if (
            !LOCAL_BODIES.includes(level) ||
            !bodyRow(kind) ||
            members(api, officeId).length === 0
          )
            continue;
          const { majority, lines } = lineBacking(api, officeId);
          for (const line of lines) {
            // An amendment names the one line it moves; the annual budget
            // bill names them all and is not an amendment.
            const filed = local.some(
              (b) =>
                b.bodyOfficeId === officeId &&
                b.provisions.length === 1 &&
                b.provisions[0]!.line === line.name,
            );
            if (filed) continue;
            reasons += 1;
            expect(
              line.backing.up.length < majority &&
                line.backing.down.length < majority,
              `${place.name}: ${officeId} ${line.name} drew no bill, yet ${line.backing.up.length} back a raise and ${line.backing.down.length} a cut against a majority of ${majority}`,
            ).toBe(true);
          }
        }
        // A year takes up amendments, or every line has its reason it took up none.
        expect(
          mid.length > 0 || reasons > 0,
          "a passed amendment changed a budget line, or every line has its reason",
        ).toBe(true);
        process.stdout.write(
          `LOCAL-LINES ${place.name} (${place.key}, seed ${place.seed}): ${reasons} lines drew no bill, each with a majority-short reason; ${mid.length} mid-year amendments passed\n`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
}
