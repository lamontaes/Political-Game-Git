/**
 * M3-08 (simple): residents bring real problems from their own records to a
 * local official at office hours; the official helps or turns them away (or
 * the office decides by the official's own duty), and the outcome moves that
 * resident's view of the official, as a recorded cause. The town is built as
 * the game builds it (`buildBenchWorld`, two-level, every module), so its
 * problems come as its jobs, homes and health change.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { govReport } from "./gov-test-report";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { impressionOf } from "./modules/campaigns";
import {
  allCases,
  handleCase,
  casesOpenFor,
  problemOf,
} from "./modules/constituent-cases";
import { governmentUnitsForPlace } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = gameStartDate();
/** Two months of office hours, then the response window after them. */
const ASKED = addDays(makeIsoDate(START), 60);
const SETTLED = addDays(makeIsoDate(START), 75);
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`cases:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("M3-08 constituent cases", () => {
  it("residents bring problems from their records, and how they're handled changes their view", () => {
    let report: Record<string, unknown> | null = null;
    const tried: string[] = [];
    for (let attempt = 0; attempt < 4 && !report; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ]
        .filter((p) =>
          governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
            (u) => u.unitType === "municipality",
          ),
        )
        .sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      tried.push(`${state} ${key}`);
      const { core } = buildBenchWorld(
        createHash("sha256").update(`${seed}:world:${attempt}`).digest("hex"),
        START,
        { twoLevel: true, placeKey: key },
      );
      const api = coreAPI(core);
      // About one adult in five reaches an official in a year (Pew, 2018);
      // two months gives a town a few problems brought.
      advanceCore(core, ASKED);
      // The cases still open on the day: earlier ones the office has settled.
      const cases = allCases(api).filter((c) => c.status === "open");
      if (cases.length < 2) continue;
      // Every case is a problem the resident's own records show.
      for (const c of cases)
        expect(
          problemOf(api, core.people.get(c.personId)!)?.problem ?? c.problem,
        ).toBe(c.problem);
      const [helped, declined] = [cases[0]!, cases[1]!];
      // Each official's desk holds their open cases, soonest deadline first.
      const desk = casesOpenFor(api, helped.officialId);
      expect(desk.map((c) => c.id)).toContain(helped.id);
      expect(desk.every((c) => c.status === "open")).toBe(true);
      expect(
        desk.every((c, i) => !i || desk[i - 1]!.respondBy <= c.respondBy),
      ).toBe(true);
      const before =
        impressionOf(api, helped.personId, helped.officialId)?.warmth ?? 0;
      const beforeD =
        impressionOf(api, declined.personId, declined.officialId)?.warmth ?? 0;
      handleCase(api, helped.id, "help");
      handleCase(api, declined.id, "decline");
      const after = impressionOf(
        api,
        helped.personId,
        helped.officialId,
      )!.warmth;
      const afterD = impressionOf(
        api,
        declined.personId,
        declined.officialId,
      )!.warmth;
      expect(after).toBeGreaterThan(before);
      expect(afterD).toBeLessThan(beforeD);
      // The rest are handled by the office within the response window.
      advanceCore(core, SETTLED);
      const done = allCases(api).filter((c) => c.opened <= ASKED);
      expect(done.every((c) => c.status !== "open")).toBe(true);
      expect(
        casesOpenFor(api, helped.officialId).filter((c) => c.opened <= ASKED),
      ).toEqual([]);
      report = {
        seed,
        state,
        place: key,
        cases: done.length,
        problems: done.map(
          (c) => `${c.problem}:${c.status}:${c.handledBy}:${c.outcome}`,
        ),
        helped: { before, after },
        declined: { before: beforeD, after: afterD },
      };
    }
    expect(
      report,
      `fewer than two cases in ${tried.join(", ")}`,
    ).not.toBeNull();
    govReport("constituent-cases", JSON.stringify(report));
  }, 1_800_000);
});
