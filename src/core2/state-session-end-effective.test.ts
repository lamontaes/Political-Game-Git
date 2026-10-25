/**
 * A state act passed in 2025 takes effect a set time after its session ends
 * where its state's rule says so (pool item world-session-calendar-2025-ends):
 * the session's published 2025 adjournment, else the limit its law sets,
 * else the median last day of the places read that year, labeled. Played in
 * a place drawn from all 56 whose state counts from the session's end; the
 * state legislature passes its own acts at the session's end
 * (world-legislating), and each act's law row is checked by id.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import rules from "../../data/research/laws/local-starting-law/state-effective-dates.json" with { type: "json" };
import sessions from "../../data/research/laws/state-session-calendars.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { LawRowInput } from "./laws-starting";
import { LAWS_MODULE_ID } from "./modules/laws";
import { stateActEffectiveDate } from "./state-effective-date";
import { sessionWindows } from "./state-session-calendar";
import { coreAPI } from "./state";
import {
  knownSessionEnds,
  medianSessionEnd,
  type SessionEndRow,
} from "../rules/laws/effective-date";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 40;
const BUILDS = 4;

interface SessionRule {
  readonly kind: string;
  readonly days: number;
  readonly months?: number;
  readonly notBefore?: { readonly month: number; readonly day: number };
}
const ruleOf = (stateKey: string) =>
  (
    rules as unknown as {
      places: Record<string, { gameRule?: SessionRule }>;
    }
  ).places[stateKey]?.gameRule;
const ends = (
  sessions as unknown as {
    sessionEnds: Record<
      string,
      Omit<SessionEndRow, "estimated"> & { estimated?: string }
    >;
  }
).sessionEnds;
const endRows = Object.values(ends).map((row): SessionEndRow => ({
  ...row,
  estimated: !!row.estimated,
}));

/** The day `months` calendar months after `date`, clamped to the month's end. */
function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12),
    month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

it(`a state act passed in 2025 takes effect from its session's 2025 end, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let built = 0;
  for (let draw = 0; draw < DRAWS && built < BUILDS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "session-end-effective");
    const stateKey = place.state;
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const rule = ruleOf(stateKey);
    if (rule?.kind !== "days-after-session-end") {
      tried.push(`${where}: ${stateKey} counts from no session end`);
      continue;
    }
    built += 1;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Through the 2025 session's end and the governor's days to sign.
    const window = sessionWindows(stateKey, 2025).at(-1);
    const until =
      window && /^\d{4}-\d{2}-\d{2}$/.test(window.adjournAt)
        ? addDays(makeIsoDate(window.adjournAt), 45)
        : makeIsoDate("2025-12-31");
    advanceCore(core, until);
    const acts = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as (LawRowInput & {
        retrieved: string;
        source: string;
      })[]
    ).filter(
      (row) =>
        row.jurisdiction === stateKey &&
        row.terms?.enactedByBill !== undefined &&
        row.retrieved.startsWith("2025-"),
    );
    if (!acts.length) {
      tried.push(`${where}: the ${stateKey} legislature passed no act`);
      continue;
    }
    // The session's 2025 end as recorded: published, else its law's limit,
    // else the labeled median of the places read.
    const row = ends[stateKey];
    const published = row?.adjourned?.["2025"]?.dates;
    const known = row
      ? knownSessionEnds({ ...row, estimated: !!row.estimated }, 2025)
      : null;
    const sessionEndsOf = [
      ...(known ?? medianSessionEnd(endRows, 2025)),
    ].sort();
    // The end of the session each act passed in: the first on or after it,
    // else the last (a special session that sat later has its own end).
    const endFor = (passedAt: string) =>
      sessionEndsOf.find((end) => end >= passedAt) ?? sessionEndsOf.at(-1)!;
    const sessionEnd = endFor(acts[0]!.retrieved);
    const counted = (from: string) => {
      const at = addDays(
        makeIsoDate(addMonths(from, rule.months ?? 0)),
        rule.days,
      );
      if (!rule.notBefore) return at;
      const floor = `2025-${String(rule.notBefore.month).padStart(2, "0")}-${String(rule.notBefore.day).padStart(2, "0")}`;
      return at > floor ? at : floor;
    };
    for (const act of acts) {
      const fromEnd = counted(endFor(act.retrieved));
      const want = fromEnd > act.retrieved ? fromEnd : counted(act.retrieved);
      expect(act.effectiveDate, `${where}: ${act.id}`).toBe(want);
      if (!known && fromEnd > act.retrieved)
        expect(act.source, `${where}: ${act.id} estimate label`).toContain(
          row!.estimated!,
        );
    }
    process.stdout.write(
      `session-end-effective: ${where}: ${stateKey} first act's session ended ${sessionEnd} (${published ? "published" : known ? "its law's limit" : "median, estimated"}); ${acts.length} acts, first ${acts[0]!.id} enacted ${acts[0]!.retrieved}, effective ${acts[0]!.effectiveDate}; passed over: ${tried.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place with a session-end rule passed a state act in 2025 (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_200_000);

it("a state with no published 2025 end counts from its law's limit, else the labeled median", () => {
  // Missouri's law ends the session on May 30; its 2025 acts took effect
  // 90 days later, on August 28.
  expect(stateActEffectiveDate("US-MO", "2025-05-10")?.date).toBe("2025-08-28");
  // Michigan sits all year: the median of the places read, labeled.
  const median = medianSessionEnd(endRows, 2025).at(-1)!;
  const michigan = stateActEffectiveDate("US-MI", "2025-01-25")!;
  expect(michigan.date).toBe(addDays(makeIsoDate(median), 91));
  expect(michigan.cite).toContain(ends["US-MI"]!.estimated!);
});

it("an act of Maine's 2025 special session counts from that session's end, not the regular session's", () => {
  // The First Regular Session adjourned March 21, 2025; the First Special
  // Session sat March 25 to June 25 (legislature.maine.gov/house/). Maine
  // counts 90 days after adjournment, so the 91st day is the first in force.
  expect(stateActEffectiveDate("US-ME", "2025-03-10")?.date).toBe("2025-06-20");
  expect(stateActEffectiveDate("US-ME", "2025-04-15")?.date).toBe("2025-09-24");
  expect(stateActEffectiveDate("US-ME", "2025-06-18")?.date).toBe("2025-09-24");
});
