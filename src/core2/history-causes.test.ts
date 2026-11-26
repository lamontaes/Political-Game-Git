// @vitest-environment node
// A record names what it came of, and the reader tells it as the record's
// cause, whatever fact the record names it by (the refactoring map, Nov 26,
// "the cause links go unused"; CTO, 12:45 p.m.: "the Journal chain on the
// reader's side ... cause links"). A vote, a hearing or a debate names the
// bill it is on; a law that took effect names its enactment. The bill's
// history then says what it led to.
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
import { historyEvent, historyOf } from "./past";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The facts a record names what it came of by, as the engines write them. */
const CAME_OF = ["billId", "lawId"] as const;

it(
  "a record's bill, law or nomination is its cause, and it says what it led to",
  { timeout: 900_000 },
  async () => {
    setBookkeeping(false);
    // A place with no adult in a household has no one to play, and a place
    // whose year so far holds no vote on a bill shows nothing here: each is
    // passed over by name and the place drawn again.
    const passed: string[] = [];
    let checked = 0;
    let votes = 0;
    let where = "";
    for (let again = 0; !checked && again < 6; again++) {
      const drawSeed = again ? `${seed}:again:${again}` : seed;
      const place = drawPlace(drawSeed, "history-causes");
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
      advanceCore(core, addDays(makeIsoDate(core.date), 120));
      votes = 0;
      for (const event of historyOf(core, { nation: true })) {
        const whole =
          core.durableLog.get(event.id as never)?.facts ?? event.facts ?? {};
        for (const key of CAME_OF) {
          const named = whole[key];
          if (!named || named === event.id) continue;
          const earlier = historyEvent(core, named);
          if (!earlier || earlier.date > event.date) continue;
          // The record it came of is its cause, and that record led to it.
          expect(event.causeIds, `${where}: ${event.id} (${key})`).toContain(
            named,
          );
          expect(
            earlier.ledTo,
            `${where}: ${named} led to ${event.id}`,
          ).toContain(event.id);
          checked += 1;
        }
        // The Senate's vote on a cabinet nominee came of the nomination.
        if (
          event.record === "cabinet-confirmed" ||
          event.record === "cabinet-rejected"
        ) {
          const nomination = event.causeIds.find((id) =>
            id.startsWith("cabinet-nominated:"),
          );
          expect(
            nomination,
            `${where}: ${event.id} names no nomination`,
          ).toBeDefined();
          expect(
            historyEvent(core, nomination!)?.ledTo,
            `${where}: ${nomination} led to ${event.id}`,
          ).toContain(event.id);
          votes += 1;
        }
      }
      if (!checked)
        passed.push(`${where}: no record named an earlier bill or law`);
    }
    console.log(
      `history causes: ${where}: ${checked} records name the bill or law they came of, and ${votes} cabinet votes their nomination, each its cause${passed.length ? `; passed over: ${passed.join("; ")}` : ""}`,
    );
    expect(
      checked,
      `no drawn place had a record of a bill or a law: ${passed.join("; ")}`,
    ).toBeGreaterThan(0);
  },
);
