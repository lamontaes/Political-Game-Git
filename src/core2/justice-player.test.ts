import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { gameStartDate } from "./game-start";
import { considerBribe, type CrimeRecord } from "./modules/corruption";
import {
  JUSTICE_MODULE_ID,
  inCustody,
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
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { isExplicitlyControlledPersonV1 } from "./player-control-state-v1";

// The player's own act, in the world the owner plays (a seed nobody chose):
// the player offers bribes to the town's members; a member who refuses may
// report it; the prosecutor investigates, charges, and the case is pleaded
// or tried. The hearing and the verdict reach the player's own story as
// scenes, and a prison term is served with the world running and no choices
// of the player's own, then the player is released with the record.
// The forced part is only the offers: everything after them is the engines'.
const seed = process.env.JUSTICE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const rows = <T>(name: string) =>
  api.moduleState(JUSTICE_MODULE_ID).table(name).rows() as unknown as T[];

const members = (
  api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[]
)
  .filter((t) => t.status === "serving" && t.personId)
  .map((t) => t.personId!)
  .filter((id, i, all) => all.indexOf(id) === i && core.people.get(id)?.alive);
const accounts = core.cashJournal.residualAccountByOwner;
const town = lawChain(api).townPlaceId;
const candidates = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      p.placeId === town &&
      !members.includes(p.id) &&
      accounts.has(p.id) &&
      ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 25,
  )
  .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));

// The player: the first well-off resident whose own traits lead them to
// offer, to members of whom at least one refuses.
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
  if (made.some((r) => !r.taken)) {
    playerId = candidate.id;
    offers.push(...made);
    break;
  }
}

const player = new BenchPlayer(core, world.director);
const scenes: string[] = [];
const ownChoiceDates: string[] = [];
const logAt = new Map<string, number>();
const stopAt = `${Number(core.date.slice(0, 4)) + 4}${core.date.slice(4)}`;
const playerCustody = () =>
  rows<CustodyRow>("custody").find((c) => c.personId === playerId);
if (playerId) {
  player.select(playerId);
  for (let guard = 0; guard < 5_000 && core.date < stopAt; guard++) {
    const result =
      player.packet?.kind === "stop"
        ? player.resume({ kind: "stop", pauseId: player.packet.pauseId })
        : player.advance("skip");
    for (const answer of result.selfChosen)
      ownChoiceDates.push(`${answer.at.date} ${answer.actionId}`);
    logAt.set(core.date, core.durableLog.size);
    const custody = playerCustody();
    if (custody?.status === "released" && core.date > custody.until) break;
    const cases = rows<CaseRow>("cases").filter(
      (c) => c.defendantId === playerId,
    );
    if (
      cases.length &&
      cases.every((c) => c.status === "acquitted" || c.status === "no-charge")
    )
      break;
  }
  const book = world.director.ledger.people.get(playerId);
  for (const entry of book?.schedule ?? [])
    for (const binding of entry.bindings)
      if (entry.outcome !== "journal-line") scenes.push(binding.typeKey);
}
/** The world's log length on the last date at or before the given one. */
const logOn = (date: string) =>
  Math.max(0, ...[...logAt].filter(([d]) => d <= date).map(([, n]) => n));

// JUSTICE_PRINT=1 prints the player's case as its chain of record ids.
afterAll(() => {
  if (process.env.JUSTICE_PRINT)
    console.log(
      JSON.stringify(
        justiceChains(api).filter((c) => c.defendantId === playerId),
        null,
        1,
      ),
    );
});

describe(`the player's own act leads to a trial and a term served (seed ${seed}, ${lawChain(api).placeName})`, () => {
  it("finds a player whose offers a member refused", () => {
    expect(playerId).toBeDefined();
    expect(offers.some((r) => !r.taken)).toBe(true);
  });

  it("a refusing member reported it and the prosecutor opened a case on the player", () => {
    const complaints = rows<ComplaintRow>("complaints").filter((c) =>
      offers.some((o) => o.id === c.crimeId),
    );
    expect(complaints.length).toBeGreaterThan(0);
    const investigation = rows<InvestigationRow>("investigations").find((i) =>
      i.complaintIds.some((id) => complaints.some((c) => c.id === id)),
    );
    expect(investigation?.opened).toBe(true);
    expect(investigation?.targets.map((t) => t.personId)).toContain(playerId);
  });

  it("the charge and the verdict reach the player's story as scenes", () => {
    const cases = rows<CaseRow>("cases").filter(
      (c) => c.defendantId === playerId,
    );
    expect(cases.length).toBeGreaterThan(0);
    expect(scenes).toContain("hearing");
    expect(scenes).toContain("verdict");
  });

  it("a prison term runs with the world going and no choices of the player's, then release", () => {
    const sentence = rows<SentenceRow>("sentences").find(
      (s) => s.personId === playerId,
    );
    expect(sentence?.custodyMonths).toBeGreaterThan(0);
    const custody = playerCustody()!;
    expect(custody.status).toBe("released");
    expect(custody.until).toBe(sentence!.releaseDate);
    // The player made no choice of their own while in prison.
    expect(
      ownChoiceDates.filter(
        (d) => d.slice(0, 10) > custody.from && d.slice(0, 10) < custody.until,
      ),
    ).toEqual([]);
    // The world kept writing its record while the player served.
    expect(logOn(custody.until)).toBeGreaterThan(logOn(custody.from));
    // Released, still the player, with the record on them.
    expect(isExplicitlyControlledPersonV1(core, playerId!)).toBe(true);
    expect(inCustody(api, playerId!)).toBe(false);
    expect(core.people.get(playerId!)?.discretionaryEligibleV1).not.toBe(false);
  });
});
