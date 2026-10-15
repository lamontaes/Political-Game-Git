/**
 * One played year for the legislating-next work: town halls (who held each,
 * why, and who came), constituent cases (opened, and who decided each),
 * and any bribes, reports and scandal stories, by record id.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/next.ts [seed] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  MEETINGS_MODULE_ID,
  type TownHallRow,
} from "../../src/core2/modules/meetings";
import { allCases } from "../../src/core2/modules/constituent-cases";
import { CORRUPTION_MODULE_ID } from "../../src/core2/modules/corruption";
import { INTEREST_GROUPS_MODULE_ID } from "../../src/core2/modules/interest-groups";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(seed, "legislating-next");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const started = Date.now();
const end = addDays(makeIsoDate(core.date), days);
advanceCore(core, end);
const rows = (module: string, name: string) =>
  core.modules.has(module)
    ? (api.moduleState(module).table(name).rows() as unknown as Record<
        string,
        unknown
      >[])
    : [];
const halls = rows(MEETINGS_MODULE_ID, "townHalls") as unknown as TownHallRow[];
const cases = allCases(api);
const count = (list: readonly string[]) =>
  list.reduce<Record<string, number>>(
    (out, k) => ({ ...out, [k]: (out[k] ?? 0) + 1 }),
    {},
  );
console.log(
  JSON.stringify(
    {
      seed,
      place: `${place.name} (${place.key})`,
      placeSeed: place.seed,
      days,
      seconds: Math.round((Date.now() - started) / 1000),
      townHalls: {
        held: halls.length,
        byCause: count(halls.map((h) => h.calledFor?.cause ?? "chosen")),
        examples: halls.slice(0, 4).map((h) => ({
          id: h.id,
          calledFor: h.calledFor,
          attendees: h.attendeeIds.length,
          questions: h.questions.map((q) => q.question),
          moved: h.moved,
        })),
      },
      cases: {
        opened: cases.length,
        byStatus: count(cases.map((c) => c.status)),
        byHandler: count(cases.map((c) => c.handledBy ?? "open")),
        byOutcome: count(cases.map((c) => c.outcome ?? "open")),
        example: cases[0] ?? null,
      },
      groups: rows(INTEREST_GROUPS_MODULE_ID, "groups").map((g) => ({
        id: g.id,
        interest: g.interest,
        formedOver: g.formedOver,
        members: (g.memberOrganizationIds as string[] | undefined)?.length,
      })),
      bribes: rows(CORRUPTION_MODULE_ID, "crimes").map((c) => ({
        id: c.id,
        offered: c.offered,
        taken: c.taken,
        subjectId: c.subjectId,
      })),
      reported: rows(CORRUPTION_MODULE_ID, "reported"),
    },
    null,
    1,
  ),
);
