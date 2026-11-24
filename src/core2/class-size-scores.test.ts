// @vitest-environment node
/** A schools budget line that adds teachers lowers the district's pupil-teacher ratio, and the eighth graders' scores follow (class-size-to-scores). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { draftBill, holdVote, memberKey, members } from "./modules/legislature";
import { classSizeShiftSd, type SchoolGroupRow } from "./school-outcomes";
import { SCHOOL_MODULE_ID } from "./school-measures";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const draws = [
  drawPlace(replay, "class-size-scores-a"),
  drawPlace(replay, "class-size-scores-b"),
];

for (const place of draws) {
  it(
    `a schools line that adds teachers lowers the ratio and moves the scores: ${place.name}, replay ${replay}`,
    { timeout: 2_400_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const build = () =>
          buildBenchWorld(place.seed, gameStartDate(), {
            placeKey: place.key,
            twoLevel: true,
          }).core;
        const lawWorld = build();
        const control = build();
        const api = coreAPI(lawWorld);
        const gov = governments(api).find(
          (g) =>
            ["city", "county"].includes(g.level) &&
            (budgetsOf(api, g.id).at(-1)?.spendingMinor.schools ?? 0) > 0,
        );
        if (!gov) {
          process.stdout.write(
            `CLASS-SIZE ${place.name} (${place.key}, seed ${place.seed}): no local schools budget line; nothing to change\n`,
          );
          return;
        }
        const line = budgetsOf(api, gov.id).at(-1)!.spendingMinor.schools!;
        // The council passes a bill adding a fifth to the schools line.
        const offices = api
          .moduleState("core2-offices-v1" as never)
          .table("offices")
          .rows() as unknown as { id: string; level: string; kind: string }[];
        const body = offices.find(
          (o) =>
            o.level === gov.level &&
            /council|board|commission/.test(o.kind) &&
            members(api, o.id).length > 0,
        );
        if (!body) {
          process.stdout.write(
            `CLASS-SIZE ${place.name} (${place.key}, seed ${place.seed}): no ${gov.level} body to pass the bill; nothing to change\n`,
          );
          return;
        }
        const drafted = draftBill(api, {
          bodyOfficeId: body.id,
          sponsorId: memberKey(members(api, body.id)[0]!),
          provisions: [
            {
              kind: "budget-line",
              line: "schools",
              value: Math.round(line * 0.2),
              of: line,
            },
          ],
        });
        const voted = holdVote(api, drafted.id);
        if (!["enacted", "overridden"].includes(voted.status)) {
          process.stdout.write(
            `CLASS-SIZE ${place.name} (${place.key}, seed ${place.seed}): the ${gov.level} body voted the schools bill ${voted.status}; nothing to change\n`,
          );
          return;
        }
        // The staffing record the bill's schools line wrote, read the day it passed.
        const staffing = api
          .moduleState("core2-law-reach-a-v1" as never)
          .table("staffing")
          .rows() as unknown as {
          key: string;
          baseStaff: number;
          positions: number;
          lawId: string;
        }[];
        const funded = staffing.find(
          (r) => r.key === "budget-line:schools" && r.lawId === drafted.number,
        );
        const end = addDays(makeIsoDate(lawWorld.date), 400);
        advanceCore(lawWorld, end);
        advanceCore(control, end);
        const groups = (core: typeof control) =>
          (
            coreAPI(core)
              .moduleState(SCHOOL_MODULE_ID)
              .table("groups")
              .rows() as unknown as SchoolGroupRow[]
          ).filter(
            (g) => g.measure.endsWith("math-proficient-pct") && g.classSize,
          );
        const law = groups(lawWorld)[0];
        const base = groups(control).find((g) => g.id === law?.id);
        if (!law || !base) {
          process.stdout.write(
            `CLASS-SIZE ${place.name} (${place.key}, seed ${place.seed}): no math cohort with a teacher count in the year; nothing to compare\n`,
          );
          return;
        }
        process.stdout.write(
          `CLASS-SIZE ${place.name} (${place.key}, seed ${place.seed}): schools bill ${drafted.number} +20% on ${gov.id}; positions funded ${funded?.positions.toFixed(1)} over ${funded?.baseStaff} staff; teachers on the books ${base.classSize!.teachers} without, ${law.classSize!.teachers} with; pupils per teacher ${base.classSize!.ratio.toFixed(2)} without, ${law.classSize!.ratio.toFixed(2)} with; shift ${base.classSize!.shiftSd.toFixed(4)} to ${law.classSize!.shiftSd.toFixed(4)} SD; expected passes ${base.expected.toFixed(2)} to ${law.expected.toFixed(2)} (groups ${base.id}, ${law.id})\n`,
        );
        // The bill funds positions at the district (the staffing record the
        // schools line writes), the math cohort's row names the ratio of
        // pupils to the teachers on the books, and the shift on its scores is
        // read from that ratio.
        expect(
          funded?.positions,
          "the line funds more positions",
        ).toBeGreaterThan(funded!.baseStaff);
        expect(law.classSize!.shiftSd).toBeCloseTo(
          classSizeShiftSd(coreAPI(lawWorld), law.classSize!.ratio),
          10,
        );
        expect(base.classSize!.shiftSd).toBeCloseTo(
          classSizeShiftSd(coreAPI(control), base.classSize!.ratio),
          10,
        );
        // Fewer pupils per teacher is a larger shift, in each world.
        expect(law.classSize!.ratio < base.classSize!.ratio).toBe(
          law.classSize!.shiftSd > base.classSize!.shiftSd,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
}
