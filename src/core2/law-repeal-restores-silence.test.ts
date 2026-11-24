/**
 * A repeal returns a body to exactly the law it had before, including none
 * (owner, Nov 7: "these should all be able to be reversed"). In a played world
 * drawn from all 56, Congress sets an amount law the federal level holds no
 * value on, then repeals it: after the repeal no federal row is in force and
 * the town's governing law is the same row as before, by record id. A level
 * that held a value of its own before is returned to that same row.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "./bill-catalog";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  bodyOf,
  castChairHearing,
  castMemberVote,
  chambersOf,
  draftBill,
  executiveDecision,
  holdEveryChamber,
  memberKey,
  members,
} from "./modules/legislature";
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { LawRowInput } from "./laws-starting";
import type { CoreState } from "./types";

const seed = process.env.LAWS_E2E_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "law-repeal-restores-silence");
const where = `${place.name} (${place.key}), seed ${seed}`;

/** Pass a one-section bill through every chamber and the executive, as dev mode's forced pass does. */
function pass(
  core: CoreState,
  bodyId: string,
  sponsor: string,
  policyId: string,
  operation: "raise" | "lower" | "repeal",
  amount?: number,
) {
  // Two days out, so the run plays days, not months.
  const effectiveDate = addDays(makeIsoDate(core.date), 2);
  const api = coreAPI(core);
  const bill = draftBill(api, {
    bodyOfficeId: bodyId,
    sponsorId: sponsor,
    provisions: [
      provisionFor({
        policyId,
        operation,
        effectiveDate,
        ...(amount !== undefined ? { amount } : {}),
      }),
    ],
  });
  for (const chamber of chambersOf(api, bill)) {
    for (const member of members(api, chamber))
      castMemberVote(api, bill.id, memberKey(member), "yes");
    castChairHearing(api, bill.id, chamber, true);
  }
  executiveDecision(api, bill.id, true);
  let b = holdEveryChamber(api, bill.id);
  if (b.status === "awaiting-signature")
    b = executiveDecision(api, bill.id, true);
  return b;
}

/** Plays past a bill's effective day (two days out) by a day. */
const playThrough = (core: CoreState) =>
  advanceCore(core, addDays(makeIsoDate(core.date), 3));

const LEVELS = ["federal", "state", "county", "city"] as const;

it(`a repeal returns each level to exactly the law it had, including none, in ${where}`, () => {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const atLevel = (series: string, level: string) =>
    lawInForce(api, series).levels.find((l) => l.level === level)?.row ?? null;
  const checked: string[] = [];
  const passedOver: string[] = [];
  for (const level of LEVELS) {
    const seat = townSeats(api).find(
      (row) =>
        row.office.level === level &&
        row.holder?.personId &&
        bodyOf(api, row.office.id) &&
        (level === "state" ? row.office.kind.startsWith("legislature-") : true),
    );
    if (!seat) continue;
    const policies = billCatalog(api, level as never)
      .flatMap((s) => s.topics.flatMap((t) => t.policies))
      .filter(
        (p) =>
          p.kind === "law-amount" &&
          p.series &&
          !p.series.startsWith("local-power:") &&
          p.operations.includes("raise") &&
          lawInForce(api, p.series).levels.some((l) => l.level === level),
      );
    // Where the level holds no value, the silent case, first; Congress holds
    // one on every amount law, so its case is a value of its own returned to.
    const candidates = [
      ...policies.filter((p) => atLevel(p.series!, level) === null),
      ...(level === "federal"
        ? policies.filter((p) => atLevel(p.series!, level) !== null)
        : []),
    ];
    for (const policy of candidates) {
      const series = policy.series!;
      const held = atLevel(series, level);
      const before = lawInForce(api, series).governing?.id ?? null;
      const amount = held?.value ? Math.round(held.value * 1.1 + 1) : 1;
      const label = `${series} at the ${level} level, in ${where}`;
      const enacted = pass(
        core,
        seat.office.id,
        seat.holder!.personId!,
        policy.id,
        "raise",
        amount,
      );
      if (enacted.status !== "enacted") {
        passedOver.push(`${label}: the bill ended ${enacted.status}`);
        continue;
      }
      playThrough(core);
      const set = atLevel(series, level);
      // Setting a value is the setup; a law whose set value does not take
      // at its level is passed over and named.
      if (set?.value !== amount) {
        passedOver.push(
          `${label}: the set value did not take (${set?.value ?? "none"})`,
        );
        continue;
      }
      const repealed = pass(
        core,
        seat.office.id,
        seat.holder!.personId!,
        policy.id,
        "repeal",
      );
      expect(repealed.status, `${label}: repealed`).toBe("enacted");
      playThrough(core);
      expect(
        atLevel(series, level)?.id ?? null,
        `${label}: the level holds what it held before (${set!.id} repealed)`,
      ).toBe(held?.id ?? null);
      expect(
        lawInForce(api, series).governing?.id ?? null,
        `${label}: the town's governing law is the row it was before`,
      ).toBe(before);
      const ended = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .get(set!.id) as unknown as LawRowInput;
      expect(ended.endDate, `${set!.id} ended, not covered`).not.toBeNull();
      expect(
        core.durableLog.get(`law-ended:${set!.id}`)?.facts?.change,
        `${set!.id}: the town hears the law ended`,
      ).toBe("ended");
      checked.push(
        `${label}: set ${amount} (${set!.id}), repealed; level back to ${held?.id ?? "none"}, governing ${before ?? "none"}`,
      );
      break;
    }
  }
  process.stdout.write(
    `repeals in ${where}:\n${checked.join("\n")}\npassed over: ${passedOver.join("; ") || "none"}\n`,
  );
  expect(checked.length, `levels checked, in ${where}`).toBeGreaterThan(1);
}, 1_800_000);
