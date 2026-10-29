/**
 * An official the officials engine seats with no term in the offices engine
 * (a member of Congress outside the town) who dies leaves a vacancy the
 * offices engine opens under that office's own rule row, and the seat is
 * filled through it: the appointee takes the seat that day, or the special
 * election's stand-in on its date (SG-GOV-special-election-appointee). The
 * new holder keeps the party of the one they replace, and a House seat
 * waiting for its special election is not among the House's members until it
 * is filled. (Another place's legislators and governors sit on office terms
 * since gov-every-state-and-town-governs U1, so their seats are the offices
 * engine's own.)
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { FEDERAL_HOUSE, members } from "./modules/legislature";
import { allOfficials } from "./modules/officials";
import { OFFICES_MODULE_ID, type VacancyRow } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a member of Congress outside the town who dies is replaced through the vacancy engine (seed ${seed})`, () => {
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
    // A month at a time, so a House seat waiting for its special election is
    // seen waiting: it is not among the House's members.
    const start = core.date;
    let emptySeen = 0;
    for (let month = 1; month <= 12; month += 1) {
      advanceCore(core, addDays(start, Math.round((365 * month) / 12)));
      const living = new Set(
        allOfficials(api)
          .filter((row) => row.ended === null)
          .map((row) => row.seatId),
      );
      for (const vacancy of (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("vacancies")
          .rows() as unknown as VacancyRow[]
      ).filter(
        (row) =>
          row.unheld?.officeKind === "us-house" &&
          row.status === "awaiting-election" &&
          !living.has(row.seatId),
      )) {
        expect(
          members(api, FEDERAL_HOUSE).some(
            (term) => term.seatId === vacancy.seatId,
          ),
          `${where}: ${vacancy.seatId} sits empty on ${core.date}`,
        ).toBe(false);
        emptySeen += 1;
      }
    }
    const vacancies = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("vacancies")
        .rows() as unknown as VacancyRow[]
    ).filter((row) => row.unheld);
    if (!vacancies.length) {
      passed.push(`${where}: no such official died in the year`);
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
      filled += 1;
      lines.push(
        `${vacancy.id} (${vacancy.rule.method}) left by ${gone!.id}, filled by ${filler.id}`,
      );
    }
    if (!filled || !emptySeen) {
      passed.push(
        `${where}: ${filled} seats filled, ${emptySeen} empty House seats seen`,
      );
      continue;
    }
    process.stdout.write(
      `SAMPLE-VACANCY ${where}: ${emptySeen} month-ends saw a House seat sit empty; ${lines.join("; ")}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No such official's seat was filled in a year: ${passed.join("; ")}`,
  );
}, 3_600_000);
