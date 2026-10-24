import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { gameStartDate } from "./game-start";
import {
  CORRUPTION_MODULE_ID,
  considerBribe,
  type CrimeRecord,
} from "./modules/corruption";
import {
  JUSTICE_MODULE_ID,
  inCustody,
  reportReasons,
  type CaseRow,
  type ComplaintRow,
  type CustodyRow,
  type InvestigationRow,
  type SentenceRow,
} from "./modules/justice";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import { justiceChains } from "./justice-chain";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { isExplicitlyControlledPersonV1 } from "./player-control-state-v1";

// The player's own act, in the world the owner plays (a seed nobody chose):
// the player offers bribes to the town's members; a member who refuses may
// report it; the prosecutor investigates, charges, and the case is pleaded
// or tried. The hearing and the verdict reach the player's own story as
// scenes, and a prison term is served with the world running and no choices
// of the player's own, then the player is released with the record.
// The forced part is only the offers: everything after them is the engines'.
const seed = process.env.JUSTICE_SEED ?? randomBytes(8).toString("hex");
/** A failure while the world is built or played names the seed and place, so the run can be repeated. */
function named<T>(step: string, run: () => T, place?: string): T {
  try {
    return run();
  } catch (error) {
    throw new Error(
      `justice-player, seed ${seed}${place ? `, ${place}` : ""}, ${step}: ${(error as Error).message}`,
      { cause: error },
    );
  }
}
const world = named("building the world", () =>
  buildBenchWorld(seed, gameStartDate(), { twoLevel: true }),
);
const core = world.core;
const api = coreAPI(core);
const rows = <T>(name: string) =>
  api.moduleState(JUSTICE_MODULE_ID).table(name).rows() as unknown as T[];

// Whom the town's lobbying reaches (as the interest groups engine does): the
// members of its own council or county board and its own legislators.
const offices = api.moduleState(OFFICES_MODULE_ID);
const terms = offices.table("terms").rows() as unknown as TermRow[];
const persons = (rows: readonly TermRow[]) =>
  rows
    .filter((t) => t.status === "serving" && t.personId)
    .map((t) => t.personId!)
    .filter(
      (id, i, all) => all.indexOf(id) === i && core.people.get(id)?.alive,
    );
const bodies = new Set(
  (
    offices.table("offices").rows() as unknown as {
      id: string;
      kind: string;
      coversTown?: boolean;
    }[]
  )
    .filter(
      (o) =>
        (o.kind === "council" || o.kind === "county-board") && o.coversTown,
    )
    .map((o) => o.id),
);
const townSeats = new Set(
  (
    offices.table("seats").rows() as unknown as {
      id: string;
      coversTown?: boolean;
    }[]
  )
    .filter((seat) => seat.coversTown)
    .map((seat) => seat.id),
);
const local = persons(terms.filter((t) => bodies.has(t.officeId)));
const legislators = persons(
  terms.filter(
    (t) => townSeats.has(t.seatId) && /:legislature-/.test(t.officeId),
  ),
);
// A place whose data holds neither (a territory's village) is served by its
// territory-wide officials.
const nonFederal = new Set(
  (
    offices.table("offices").rows() as unknown as {
      id: string;
      level: string;
      coversTown?: boolean;
    }[]
  )
    .filter((o) => o.coversTown && o.level !== "federal")
    .map((o) => o.id),
);
// The player reaches both: a prosecutor may decline a single town member's
// report (the town office weighs least), and a legislator's weighs more.
const reached = [...new Set([...local, ...legislators])];
const members = reached.length
  ? reached
  : persons(terms.filter((t) => nonFederal.has(t.officeId)));
const accounts = core.cashJournal.residualAccountByOwner;
const town = lawChain(api).townPlaceId;
// Someone holding an office has bills on the desk that stop the skip until
// signed or released, which this run does not play; the player is a resident
// with no seat.
const holdsOffice = new Set(
  terms
    .filter((t) => t.status === "serving" && t.personId)
    .map((t) => t.personId!),
);
const candidates = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      p.placeId === town &&
      !members.includes(p.id) &&
      !holdsOffice.has(p.id) &&
      accounts.has(p.id) &&
      ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 25,
  )
  .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));

// The player: the first well-off resident whose own traits lead them to
// offer, to members of whom at least one refuses and, from their own reasons,
// reports it.
let playerId: string | undefined;
const offers: CrimeRecord[] = [];
for (const candidate of candidates.slice(0, 60)) {
  const made = members
    .filter((m) => accounts.has(m))
    .map((m) =>
      considerBribe(api, {
        offererId: candidate.id,
        officialId: m,
        stakeMinor: 50_000_000,
        subjectId: `favor:${candidate.id}:${m}`,
      }),
    )
    .filter((r): r is CrimeRecord => !!r && r.offered);
  // A member who refuses reports the offer when what moves them (their duty,
  // their traits, their tie to the offerer) adds up to a report.
  if (
    made.some(
      (r) =>
        !r.taken && reportReasons(api, r, r.officialId, "witness").pull > 0,
    )
  ) {
    playerId = candidate.id;
    offers.push(...made);
    break;
  }
}

const player = new BenchPlayer(core, world.director);
const scenes: string[] = [];
const ownChoiceDates: string[] = [];
const pollingDates: string[] = [];
const logAt = new Map<string, number>();
// The run ends at release, or a year into a longer term: enough to show the
// term running with the world going, without playing out every year of it.
const stopAt = `${Number(core.date.slice(0, 4)) + 3}${core.date.slice(4)}`;
const yearInto = (from: string) =>
  `${Number(from.slice(0, 4)) + 1}${from.slice(4)}`;
const coverage: unknown[] = [];
const ownComplaints = () =>
  rows<ComplaintRow>("complaints").filter((c) =>
    offers.some((o) => o.id === c.crimeId),
  );
const ownInvestigations = () =>
  rows<InvestigationRow>("investigations").filter((i) =>
    i.complaintIds.some((id) => ownComplaints().some((c) => c.id === id)),
  );
const playerCustody = () =>
  rows<CustodyRow>("custody").find((c) => c.personId === playerId);
// The player can die in the run (the health engine's hazard, as in play):
// the run ends there, and the case is checked as far as it went.
let diedBy: string | undefined;
if (playerId)
  named(
    "playing the run",
    () => {
      player.select(playerId!);
      for (let guard = 0; guard < 5_000 && core.date < stopAt; guard++) {
        if (!core.people.get(playerId!)?.alive) {
          diedBy = core.date;
          break;
        }
        // Election Day stops the skip at the polls; the character leaves and
        // decides its own races, as the bench's own control does.
        if (player.pollingPlace) {
          pollingDates.push(core.date);
          player.leavePolls();
        }
        const result =
          player.packet?.kind === "stop"
            ? player.resume({ kind: "stop", pauseId: player.packet.pauseId })
            : player.advance("calendar", addDays(makeIsoDate(core.date), 365));
        for (const answer of result.selfChosen)
          ownChoiceDates.push(`${answer.at.date} ${answer.actionId}`);
        logAt.set(core.date, core.durableLog.size);
        // The director summarizes moments older than its window, so scenes are
        // read as the run goes.
        for (const entry of world.director.ledger.people.get(playerId)
          ?.schedule ?? [])
          for (const binding of entry.bindings)
            if (
              entry.outcome !== "journal-line" &&
              !scenes.includes(binding.typeKey)
            )
              scenes.push(binding.typeKey);
        const custody = playerCustody();
        if (custody?.status === "released" && core.date > custody.until) break;
        if (
          custody?.status === "serving" &&
          core.date >= yearInto(custody.from)
        )
          break;
        // Every report weighed and declined: nothing more is coming.
        const weighed = ownInvestigations();
        if (
          weighed.length &&
          weighed.length === ownComplaints().length &&
          weighed.every((i) => !i.opened)
        )
          break;
        const cases = rows<CaseRow>("cases").filter(
          (c) => c.defendantId === playerId,
        );
        if (
          cases.length &&
          cases.every(
            (c) => c.status === "acquitted" || c.status === "no-charge",
          )
        )
          break;
      }
      const book = world.director.ledger.people.get(playerId!);
      for (const entry of book?.schedule ?? [])
        if (entry.coverage?.label.includes("justice"))
          coverage.push(entry.coverage);
    },
    lawChain(api).placeName,
  );
/** The world's log length on the last date at or before the given one. */
const logOn = (date: string) =>
  Math.max(0, ...[...logAt].filter(([d]) => d <= date).map(([, n]) => n));

// JUSTICE_PRINT=<file> writes the player's case as its chain of record ids.
afterAll(() => {
  if (process.env.JUSTICE_PRINT)
    writeFileSync(
      process.env.JUSTICE_PRINT,
      JSON.stringify(
        {
          seed,
          place: lawChain(api).placeName,
          playerId,
          diedBy,
          scenes,
          coverage,
          pollingDates,
          investigations: rows<InvestigationRow>("investigations"),
          chains: justiceChains(api),
        },
        null,
        1,
      ),
    );
});

describe(`the player's own act is reported, weighed and, if charged, tried and served (seed ${seed}, ${lawChain(api).placeName})`, () => {
  it("finds a player whose offers a member refused", () => {
    expect(playerId).toBeDefined();
    expect(offers.some((r) => !r.taken)).toBe(true);
  });

  it("a refusing member reported it, and the prosecutor weighed it with its reasons", () => {
    const complaints = ownComplaints();
    expect(complaints.length).toBeGreaterThan(0);
    // Each complaint is weighed on its own: the prosecutor may decline one
    // member's report and open on another's, or decline them all from the
    // office's weight and their own lean. Either way the reasons are kept.
    const weighed = ownInvestigations();
    expect(weighed.length).toBeGreaterThan(0);
    for (const row of weighed)
      expect(Number.isFinite(row.reasons.worth)).toBe(true);
    const opened = weighed.find((i) => i.opened);
    if (opened)
      expect(opened.targets.map((t) => t.personId)).toContain(playerId);
    else expect(weighed.every((i) => i.reasons.worth <= 0)).toBe(true);
  });

  it("a case on the player reaches the player's story as scenes", () => {
    const cases = rows<CaseRow>("cases").filter(
      (c) => c.defendantId === playerId,
    );
    if (ownInvestigations().some((i) => i.opened))
      expect(cases.length, `seed ${seed}`).toBeGreaterThan(0);
    if (!cases.length) {
      // Declined, and no other investigation reached the player: the player
      // goes on with their own choices.
      expect(inCustody(api, playerId!)).toBe(false);
      return;
    }
    // Every case on the player is for the player's own bribes, whichever
    // report opened it: an investigation charges everyone its bribe payments
    // connect, so another offerer's case can reach the player (Reidsville,
    // North Carolina, seed dd6f9b4e986f6310).
    const crimes = api
      .moduleState(CORRUPTION_MODULE_ID)
      .table("crimes")
      .rows() as unknown as CrimeRecord[];
    const own = new Set(
      crimes.filter((c) => c.offererId === playerId).map((c) => c.id),
    );
    for (const row of cases)
      expect(
        row.crimeIds.some((id) => own.has(id)),
        `seed ${seed}: ${row.id}`,
      ).toBe(true);
    if (cases.some((c) => c.status !== "no-charge"))
      expect(scenes).toContain("hearing");
    if (cases.some((c) => c.status === "convicted" || c.status === "acquitted"))
      expect(scenes).toContain("verdict");
  });

  it("a prison term runs with the world going and no choices of the player's, then release", () => {
    const sentence = rows<SentenceRow>("sentences").find(
      (s) => s.personId === playerId,
    );
    if (!sentence?.custodyMonths) {
      // No prison (declined, no charge, acquitted, a fine or probation).
      expect(playerCustody()).toBeUndefined();
      return;
    }
    const custody = playerCustody()!;
    expect(custody.until).toBe(sentence!.releaseDate);
    const served = custody.status === "released" ? custody.until : core.date;
    // The player made no choice of their own while in prison.
    expect(
      ownChoiceDates.filter(
        (d) => d.slice(0, 10) > custody.from && d.slice(0, 10) < served,
      ),
    ).toEqual([]);
    // The world kept writing its record while the player served.
    expect(logOn(served)).toBeGreaterThan(logOn(custody.from));
    if (diedBy && custody.status !== "released") {
      // The player died while serving: the run ended at the death, and the
      // term ends with them on its release date.
      expect(["serving", "died"], `seed ${seed}`).toContain(custody.status);
      return;
    }
    expect(isExplicitlyControlledPersonV1(core, playerId!)).toBe(true);
    if (custody.status === "released") {
      // Released, still the player, with the record on them.
      expect(inCustody(api, playerId!)).toBe(false);
      expect(core.people.get(playerId!)?.discretionaryEligibleV1).not.toBe(
        false,
      );
    } else {
      // A term longer than the run: a year served, still held, released on its date.
      expect(custody.status).toBe("serving");
      expect(core.date >= yearInto(custody.from)).toBe(true);
      expect(core.people.get(playerId!)?.discretionaryEligibleV1).toBe(false);
    }
  });
});
