/**
 * An appointment is weighed and accepted in a played year, and the decision
 * leaves its own record (pool item traits-accept-appointment-vacancy-proof):
 * in a year of buildBenchWorld that holds a local vacancy filled by
 * appointment (Ilwaco, Washington, place 5333000, world seed 92ca8748de59,
 * January 20, 2025 to January 20, 2026), `offices.accept-appointment` is
 * weighed by a full person, the trait probe asks for the `person.weighed`
 * record, and that record names the actor, the decision, the day and the
 * reasons, and the person then takes office.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { setTraitProbe, type FormulaProbeRow } from "./trait-probe";
import type { CoreState } from "./types";

const DECISION = "offices.accept-appointment";
const PLACE = {
  key: "5333000",
  seed: "92ca8748de59",
  name: "Ilwaco, Washington",
};

it("an appointee's acceptance is weighed, kept as its own record, and followed by taking office", () => {
  setBookkeeping(false);
  const rows: FormulaProbeRow[] = [];
  setTraitProbe({
    keepWeighed: true,
    formula: (row) => {
      if (row.decisionId === DECISION) rows.push({ ...row });
    },
  });
  try {
    const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    rows.length = 0; // the opening's appointments are not the played vacancy
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(start), 365));
    const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}, ${start} to ${core.date}`;
    const c = core as CoreState;
    expect(rows.length, `${where}: ${DECISION} calls`).toBeGreaterThan(0);
    const kept = rows.filter((row) => row.recordId && row.actorId);
    expect(kept.length, `${where}: calls that kept a record`).toBe(rows.length);
    const lines: string[] = [];
    for (const row of kept) {
      const record = c.durableLog.get(row.recordId!) as
        | {
            id: string;
            kind: string;
            date: string;
            actorId?: string;
            reasonKey?: string;
            actionId?: string;
            decision?: {
              actorId: string;
              date: string;
              selectedReasons: Record<string, number>;
            };
          }
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
    expect(accepted.length, `${where}: appointments accepted`).toBeGreaterThan(
      0,
    );
    const took = accepted.filter((row) =>
      [...c.durableLog.values()].some(
        (log) =>
          log.id.startsWith("took-office:") &&
          (log.personIds ?? []).includes(row.actorId as never) &&
          log.date >= (c.durableLog.get(row.recordId!)?.date ?? ""),
      ),
    );
    expect(
      took.length,
      `${where}: acceptances followed by taking office`,
    ).toBeGreaterThan(0);
    process.stdout.write(
      `ACCEPT APPOINTMENT ${where}: ${rows.length} calls; ${lines.join("; ")}\n`,
    );
  } finally {
    setTraitProbe(undefined);
    setBookkeeping(true);
  }
}, 1_800_000);
