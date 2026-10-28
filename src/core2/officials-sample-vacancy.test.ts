/**
 * A sampled member of another state's legislature who dies leaves a vacancy
 * the offices engine opens under that chamber's own rule row, and the seat is
 * filled through it: the appointee takes the seat that day, or the special
 * election's stand-in on its date (SG-GOV-special-election-appointee). The
 * new member keeps the party and the weight in the chamber of the one they
 * replace.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { allOfficials } from "./modules/officials";
import { OFFICES_MODULE_ID, type VacancyRow } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a sampled legislator who dies is replaced through the vacancy engine (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "officials-sample-vacancy");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(core.date, 365));
    const vacancies = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("vacancies")
        .rows() as unknown as VacancyRow[]
    ).filter((row) => row.unheld);
    if (!vacancies.length) {
      passed.push(`${where}: no sampled member died in the year`);
      continue;
    }
    const officials = allOfficials(api);
    const lines: string[] = [];
    let filled = 0;
    for (const vacancy of vacancies) {
      const seat = officials.filter((row) => row.seatId === vacancy.seatId);
      const gone = seat.find((row) => row.ended === vacancy.since);
      expect(gone, `${where}: ${vacancy.id} left by a member`).toBeDefined();
      expect(vacancy.officeId, `${where}: ${vacancy.id}`).toBe(
        `office:${vacancy.unheld!.stateKey}:${vacancy.unheld!.officeKind}`,
      );
      const now = seat.filter((row) => row.ended === null);
      if (vacancy.status === "awaiting-election") {
        // Waiting by law for its special election, still to come.
        expect(
          vacancy.electionDate! >= core.date,
          `${where}: ${vacancy.id}`,
        ).toBe(true);
        lines.push(`${vacancy.id} awaits ${vacancy.electionDate}`);
        continue;
      }
      expect(vacancy.status, `${where}: ${vacancy.id}`).toBe("filled");
      expect(now.length, `${where}: ${vacancy.seatId} filled`).toBe(1);
      const filler = now[0]!;
      expect(filler.id, `${where}: ${vacancy.seatId}`).not.toBe(gone!.id);
      expect(filler.party, `${where}: ${filler.id}`).toBe(gone!.party);
      expect(filler.standsFor, `${where}: ${filler.id}`).toBe(gone!.standsFor);
      filled += 1;
      lines.push(
        `${vacancy.id} (${vacancy.rule.method}) left by ${gone!.id}, filled by ${filler.id}`,
      );
    }
    if (!filled) {
      passed.push(`${where}: every vacancy awaits its special election`);
      continue;
    }
    process.stdout.write(
      `SAMPLE-VACANCY ${where}: ${lines.join("; ")}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No sampled member's seat was filled in a year: ${passed.join("; ")}`,
  );
}, 3_600_000);
