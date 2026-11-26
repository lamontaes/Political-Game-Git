// @vitest-environment node
// An official's acts and a senior's school year's end are history the one
// reader tells, so the Journal and every other reader take them from it
// (CTO, Nov 26, 12:45 p.m.: "History sources for office acts and
// graduations"). Each act the office day kept, and each graduation result
// the school engine wrote, is told once, by its own id.
import {
  buildBenchWorldInStages,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
  type BenchWorld,
} from "../bench/world";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  OFFICE_ACT,
  OFFICE_DAY_MODULE_ID,
  type OfficeActRow,
} from "./modules/office-day";
import { GRADUATION_RESULT, historyEvent, historyOf } from "./past";
import { SCHOOL_MEASURE, type SchoolResultRow } from "./school-outcomes";
import { SCHOOL_MODULE_ID } from "./school-measures";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  "every office act and graduation result is told once by the history reader",
  { timeout: 1_200_000 },
  async () => {
    setBookkeeping(false);
    // A place with no adult in a household has no one to play, and one whose
    // half year holds no act and no graduation shows nothing here: each is
    // passed over by name and the place drawn again.
    const passed: string[] = [];
    let acts = 0;
    let graduations = 0;
    let where = "";
    for (let again = 0; (!acts || !graduations) && again < 4; again++) {
      const drawSeed = again ? `${seed}:again:${again}` : seed;
      const place = drawPlace(drawSeed, "history-acts-graduations");
      where = `${place.name} (${place.key}), seed ${drawSeed}`;
      let world: BenchWorld;
      try {
        world = await buildBenchWorldInStages(
          place.seed,
          gameStartDate(),
          {
            twoLevel: true,
            placeKey: place.key,
            warmUpDays: OPENING_WARMUP_DAYS,
          },
          () => undefined,
        );
      } catch (error) {
        if (!(error instanceof NoPlayerHereError)) throw error;
        passed.push(`${where}: ${error.message}`);
        continue;
      }
      const { core } = world;
      // Past the school year's last day, so the seniors' results are written.
      advanceCore(core, addDays(makeIsoDate(core.date), 165));
      const api = coreAPI(core);
      acts = 0;
      graduations = 0;
      for (const act of api
        .moduleState(OFFICE_DAY_MODULE_ID)
        .table("acts")
        .rows() as unknown as OfficeActRow[]) {
        const told = historyOf(
          core,
          { person: act.personId as PersonId },
          { kinds: [OFFICE_ACT] },
        );
        // An act the state office logged is told from its log record.
        const logged = `office-act:${act.recordId}`;
        const id = core.durableLog.has(logged as never) ? logged : act.id;
        expect(
          told.filter((event) => event.id === id).length,
          `${where}: ${id}`,
        ).toBe(1);
        expect(
          told.some((event) => event.id === act.id) && id !== act.id,
          `${where}: ${act.id} told twice`,
        ).toBe(false);
        if (id === act.id) {
          const event = historyEvent(core, act.id);
          expect(event?.facts?.kind, act.id).toBe(act.kind);
          // An act on a bill came of the bill.
          if (act.recordId.startsWith("bill:"))
            expect(event?.causeIds, `${where}: ${act.id}`).toContain(
              act.recordId,
            );
        }
        acts += 1;
      }
      for (const row of api
        .moduleState(SCHOOL_MODULE_ID)
        .table("results")
        .rows() as unknown as SchoolResultRow[]) {
        if (row.measure !== SCHOOL_MEASURE.graduation) continue;
        const told = historyOf(
          core,
          { person: row.personId as PersonId },
          { kinds: [GRADUATION_RESULT] },
        ).filter((event) => event.id === row.id);
        expect(told.length, `${where}: ${row.id}`).toBe(1);
        expect(told[0]!.facts?.passed, row.id).toBe(row.passed ? "yes" : "no");
        expect(historyEvent(core, row.id)?.record, row.id).toBe(
          GRADUATION_RESULT,
        );
        graduations += 1;
      }
      if (!acts || !graduations)
        passed.push(`${where}: ${acts} acts, ${graduations} graduations`);
    }
    console.log(
      `history acts and graduations: ${where}: ${acts} office acts and ${graduations} graduation results, each told once${passed.length ? `; passed over: ${passed.join("; ")}` : ""}`,
    );
    expect(
      acts,
      `no drawn place kept an act: ${passed.join("; ")}`,
    ).toBeGreaterThan(0);
    expect(
      graduations,
      `no drawn place wrote a graduation: ${passed.join("; ")}`,
    ).toBeGreaterThan(0);
  },
);
