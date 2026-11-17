// @vitest-environment node
/**
 * A closed office says why (owner, Nov 16: "I can't run for anything"; crew list #9747, item 3a:
 * "closed offices show why"). Every race on a new player's Elections page that is not theirs to run
 * for (`not-your-office`) carries the office rule's cause (`notYourOfficeWhy`): an office no player runs
 * for, or an office that is the player's only where the home has none of its own, with the home's own
 * offices the player runs for instead, by title. A county board where the town has its own council
 * names that council. A drawn place (skill drawn-place-tests), named with its seed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { localRaces } from "./government";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";

/** Places drawn before the test says no closed office was found. Engineering value. */
const PLACES = 4;
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`closed-office-why:${Date.now()}`).digest("hex");

interface Race {
  title: string;
  contestId: string;
  bar: string | null;
  officeLevel: string;
  barWhy: { why: string; instead: string[] } | null;
}

describe("a closed office on the Elections page says why", () => {
  it("names the office rule's cause and the offices the player runs for instead", () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const place = drawPlace(runSeed, `closed-office-why:${n}`);
      const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        warmUpDays: OPENING_WARMUP_DAYS,
      });
      const { races } = localRaces(core) as unknown as { races: Race[] };
      const closed = races.filter((r) => r.bar === "not-your-office");
      if (!closed.length) {
        passedOver.push(`${where}: no closed office on the page`);
        continue;
      }
      const offices = coreAPI(core)
        .moduleState(OFFICES_MODULE_ID)
        .table("offices");
      const townOwn = (
        offices.query("byTown", [true]) as unknown as {
          kind: string;
          title: string;
        }[]
      ).filter((o) => o.kind.startsWith("council"));
      for (const race of closed) {
        expect(race.barWhy, `${where}: ${race.title}`).toBeTruthy();
        expect(["not-run-for", "home-has-own"], where).toContain(
          race.barWhy!.why,
        );
        expect(
          race.barWhy!.instead.length,
          `${where}: ${race.title} names where to run instead`,
        ).toBeGreaterThan(0);
      }
      // A county board where the town has a council is closed because of that council, and names it.
      const board = closed.find((r) =>
        /commission|supervisor|county board|board of/i.test(r.title),
      );
      if (board && townOwn.length) {
        const why = board.barWhy!;
        if (why.why === "home-has-own")
          expect(why.instead, where).toEqual(
            expect.arrayContaining([townOwn[0]!.title]),
          );
      }
      console.log(
        `closed offices: ${where}: ${closed.map((r) => `${r.title} (${r.barWhy?.why}: ${r.barWhy?.instead.join(", ")})`).join("; ")}; passed over: ${passedOver.join(" | ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `No closed office in ${PLACES} drawn places: ${passedOver.join(" | ")}`,
    );
  }, 600_000);
});
