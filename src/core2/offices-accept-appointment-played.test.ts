/**
 * An appointment is weighed and accepted in a played year, and the decision
 * leaves its own record (pool item traits-accept-appointment-vacancy-proof):
 * in a year of buildBenchWorld that holds a local vacancy filled by
 * appointment, `offices.accept-appointment` is weighed by a full person, the
 * trait probe asks for the `person.weighed` record, and that record names the
 * actor, the decision, the day and the reasons, and the person then takes
 * office. Places are drawn from all 56 until one holds the case, each place
 * passed over named. (The test once pinned Ilwaco, Washington, place 5333000,
 * world seed 92ca8748de59, whose year no longer fills such a vacancy.)
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { setTraitProbe, type FormulaProbeRow } from "./trait-probe";
import type { CoreState, LogRecord } from "./types";

const DECISION = "offices.accept-appointment";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
// About one drawn place in three fills a local vacancy by an accepted
// appointment in a year (23 places passed over for 10 found, Oct 28), so
// sixteen tries miss about one run in three hundred.
const places = Array.from({ length: 16 }, (_, i) => {
  const draw = drawPlace(`${seed}:${i}`, "accept-appointment");
  return { key: draw.key, seed: draw.seed, name: draw.name };
});

it("an appointee's acceptance is weighed, kept as its own record, and followed by taking office", () => {
  setBookkeeping(false);
  const rows: FormulaProbeRow[] = [];
  // The log forgets a weighed choice's detail after a while, so each record
  // is read the moment the decision keeps it.
  const recordsAt = new Map<string, LogRecord>();
  let live: CoreState | undefined;
  setTraitProbe({
    keepWeighed: true,
    formula: (row) => {
      if (row.decisionId !== DECISION) return;
      rows.push({ ...row });
      const record = row.recordId
        ? live?.durableLog.get(row.recordId)
        : undefined;
      if (row.recordId && record) recordsAt.set(row.recordId, record);
    },
  });
  const passed: string[] = [];
  try {
    for (const place of places) {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      live = core as CoreState;
      rows.length = 0; // the opening's appointments are not the played vacancy
      recordsAt.clear();
      const start = core.date;
      advanceCore(core, addDays(makeIsoDate(start), 365));
      const where = `${place.name} (${place.key}), seed ${place.seed}, ${start} to ${core.date}`;
      const c = core as CoreState;
      // A year with no appointment accepted and followed by taking office
      // holds nothing to check: the next place is tried, and this one named.
      const tookOffice = (actorId: string, from: string) =>
        [...c.durableLog.values()].some(
          (log) =>
            log.id.startsWith("took-office:") &&
            (log.personIds ?? []).includes(actorId as never) &&
            log.date >= from,
        );
      if (
        !rows.some(
          (row) =>
            row.yes &&
            row.recordId &&
            tookOffice(
              String(row.actorId),
              recordsAt.get(row.recordId)?.date ?? "",
            ),
        )
      ) {
        passed.push(`${where}: ${rows.length} ${DECISION} calls, none seated`);
        continue;
      }
      const kept = rows.filter((row) => row.recordId && row.actorId);
      expect(kept.length, `${where}: calls that kept a record`).toBe(
        rows.length,
      );
      const lines: string[] = [];
      for (const row of kept) {
        const record = recordsAt.get(row.recordId!) as
          | (LogRecord & {
              actorId?: string;
              reasonKey?: string;
              actionId?: string;
              decision?: {
                actorId: string;
                date: string;
                selectedReasons: Record<string, number>;
              };
            })
          | undefined;
        expect(record, `${where}: ${row.recordId}`).toBeDefined();
        expect(record!.kind, row.recordId).toBe("person.weighed");
        expect(record!.actorId, row.recordId).toBe(row.actorId);
        expect(record!.reasonKey, row.recordId).toBe(DECISION);
        expect(record!.actionId, row.recordId).toBe(
          `${DECISION}:${row.yes ? "yes" : "no"}`,
        );
        expect(record!.decision?.actorId, row.recordId).toBe(row.actorId);
        expect(record!.decision?.date, row.recordId).toBe(record!.date);
        const { trait, module } = record!.decision!.selectedReasons;
        expect(
          Number.isFinite(trait) && Number.isFinite(module),
          row.recordId,
        ).toBe(true);
        lines.push(
          `${row.recordId} (${row.yes ? "accepted" : "declined"}; case ${row.bare?.toFixed(3)}, trait ${row.lean.toFixed(3)})`,
        );
      }
      // An acceptance is followed by the person taking the seat.
      const accepted = kept.filter((row) => row.yes);
      expect(
        accepted.length,
        `${where}: appointments accepted`,
      ).toBeGreaterThan(0);
      const took = accepted.filter((row) =>
        tookOffice(
          String(row.actorId),
          recordsAt.get(row.recordId!)?.date ?? "",
        ),
      );
      expect(
        took.length,
        `${where}: acceptances followed by taking office`,
      ).toBeGreaterThan(0);
      process.stdout.write(
        `ACCEPT APPOINTMENT ${where}: ${rows.length} calls; ${lines.join("; ")}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No place filled a local vacancy by an accepted appointment in a year (seed ${seed}): ${passed.join("; ")}`,
    );
  } finally {
    setTraitProbe(undefined);
    setBookkeeping(true);
  }
}, 3_600_000);
