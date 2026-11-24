/**
 * Every seat the world counts has a real special election (pool item
 * world-special-elections-every-seat; replaces the appointee stand-in): when another state's senator, a
 * statewide executive of another state or another state's member of the
 * House leaves, the law's election day comes, two named candidates stand,
 * the count names a winner, the vacancy is filled by that winner and the
 * seat's holder is who the count said, in their party.
 *
 * Pinned to one place and seed so it never depends on a draw (Sheridan,
 * Wyoming, world seed a1); the vacancies are staged through the offices
 * engine's own vacancy writers at the hour a death or resignation would.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  OFFICES_MODULE_ID,
  isOutsideOffice,
  townSeats,
  vacateSeat,
  vacateUnheldSeat,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import { allOfficials } from "./modules/officials";
import { VOTING_MODULE_ID, racesOf } from "./modules/voting";
import { coreAPI } from "./state";

const PLACE = "5669845";
const SEED = "a1";

interface Raced {
  candidates: {
    party: string;
    identity: { givenName: string; familyName: string };
  }[];
  special: { vacancyId: string; termEnd: string | null };
}

it("special elections for another state's senator, member of the House and statewide executive are counted races (Sheridan, WY, seed a1)", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const townState = (
    offices.table("loaded").get("town") as unknown as { stateKey: string }
  ).stateKey;

  // Another state's senator and member of the House: seats the offices
  // engine keeps no term for, vacated as the officials engine does at a death.
  const held = (kind: string) =>
    allOfficials(api).find(
      (row) =>
        row.bodyKind === kind &&
        row.termId === null &&
        row.ended === null &&
        row.stateKey !== townState,
    )!;
  const senator = held("us-senate");
  const member = held("us-house");
  const staged: VacancyRow[] = [];
  for (const row of [senator, member]) {
    const vacancy = vacateUnheldSeat(api, {
      seatId: row.seatId,
      stateKey: row.stateKey,
      officeKind: row.officeKind,
      cause: "death",
    })!;
    expect(vacancy, `${row.seatId} vacated`).toBeTruthy();
    staged.push(vacancy);
  }

  // Another state's statewide executive whose law calls a special election.
  const inTown = new Set(townSeats(api).map((entry) => entry.seat.id));
  const executive = (
    offices.table("seats").rows() as unknown as {
      id: string;
      officeId: string;
      coversTown: boolean;
    }[]
  )
    .filter((seat) => !seat.coversTown && !inTown.has(seat.id))
    .map((seat) => ({
      seat,
      office: offices.table("offices").get(seat.officeId) as unknown as {
        kind: string;
        elected: boolean;
        level: string;
        jurisdiction: string;
        vacancyRule: { method: string };
      },
      holder: (
        offices
          .table("terms")
          .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
      )[0],
    }))
    .find(
      ({ office, holder }) =>
        holder &&
        office.elected &&
        isOutsideOffice(api, office) &&
        !office.kind.startsWith("legislature-") &&
        office.kind !== "us-house" &&
        office.kind !== "us-senate" &&
        /special/.test(office.vacancyRule.method),
    );
  if (executive) {
    const vacancy = vacateSeat(api, executive.seat.id, "resignation")!;
    expect(vacancy, "the executive's seat vacated").toBeTruthy();
    staged.push(vacancy);
  }

  const dates = staged.flatMap((v) => (v.electionDate ? [v.electionDate] : []));
  expect(dates.length, "each vacancy waits on a special election day").toBe(
    staged.length,
  );
  advanceCore(core, addDays(makeIsoDate([...dates].sort().at(-1)!), 2));

  const lines: string[] = [];
  for (const vacancy of staged) {
    const where = `${PLACE}/${SEED} ${vacancy.seatId}`;
    const race = racesOf(api).find(
      (row) =>
        row.seatId === vacancy.seatId &&
        row.id.endsWith(":special") &&
        row.id.startsWith(`race:${vacancy.seatId}:`),
    );
    expect(race, `${where}: a counted special race`).toBeDefined();
    const row = api
      .moduleState(VOTING_MODULE_ID)
      .table("races")
      .get(race!.id) as unknown as Raced;
    expect(row.special.vacancyId, where).toBe(vacancy.id);
    expect(row.candidates.length, `${where}: two named candidates`).toBe(2);
    for (const candidate of row.candidates)
      expect(candidate.identity.givenName, where).toBeTruthy();
    const filled = offices
      .table("vacancies")
      .get(vacancy.id) as unknown as VacancyRow;
    expect(filled.status, `${where}: vacancy filled`).toBe("filled");
    const winner = row.candidates.find((c) => c.party === race!.winnerParty)!;
    if (vacancy.unheld) {
      // The officials engine seats the member the count named.
      const seated = allOfficials(api).find(
        (official) =>
          official.seatId === vacancy.seatId && official.ended === null,
      );
      expect(seated, `${where}: a sitting member`).toBeDefined();
      expect(seated!.party, `${where}: the winner's party`).toBe(
        race!.winnerParty,
      );
      const took = [...core.durableLog.values()].find(
        (event) =>
          event.kind === "took-office" &&
          event.facts?.["seatId"] === vacancy.seatId &&
          event.facts?.["vacancyId"] === vacancy.id &&
          event.facts?.["resultId"] !== undefined,
      );
      expect(took, `${where}: the seating is on record`).toBeDefined();
      expect(took!.facts?.["resultId"], `${where}: it cites the count`).toBe(
        race!.id,
      );
      expect(
        [took!.facts?.["winnerGivenName"], took!.facts?.["winnerFamilyName"]],
        `${where}: the seating names the count's winner`,
      ).toEqual([winner.identity.givenName, winner.identity.familyName]);
    } else {
      const seated = (
        offices
          .table("terms")
          .query("bySeatStatus", [
            vacancy.seatId,
            "serving",
          ]) as unknown as TermRow[]
      )[0];
      expect(seated?.reached, where).toMatch(/special election/);
      expect(seated?.party, where).toBe(race!.winnerParty);
    }
    lines.push(
      `${vacancy.seatId} (${vacancy.cause}) -> ${race!.id}: ${row.candidates.map((c) => c.party).join(" v ")}, winner ${race!.winnerParty}`,
    );
  }
  process.stdout.write(
    `SPECIALS ${PLACE}/${SEED}: ${lines.join("; ")}; executive staged: ${executive ? executive.seat.id : "none had a special-election rule"}\n`,
  );
}, 900_000);
