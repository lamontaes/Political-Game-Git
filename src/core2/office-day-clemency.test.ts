/**
 * A governor's clemency (pool item office-governor): where the state's law
 * lets the governor decide, one prisoner's petition comes up each review day;
 * a granted clemency ends the rest of the term in the justice engine (the
 * sentence's release date, the custody and the person's freedom), and the
 * record names the sentence it changed. The convictions are the engines' own:
 * the only forced part is the bribes offered.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import {
  clemencyAuthority,
  GOVERNOR_DECIDES_CLEMENCY,
} from "./modules/executive";
import {
  clemenciesOf,
  grantClemency,
  inCustody,
  JUSTICE_MODULE_ID,
  prisonersServing,
  sentenceStateKey,
  type SentenceRow,
} from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  actOn,
  stateDay,
  stateDayParameter,
  stateOfficeOf,
} from "./office-day-state";
import { coreAPI } from "./state";

const ATTEMPTS = 12;

function playPlace(seed: string, skipped: string[]): string | null {
  const place = drawPlace(seed, "office-clemency");
  const where = `${place.name} [${place.key}], seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const state = lawChain(api).stateKey;
  const authority = clemencyAuthority(state);
  if (!authority || !GOVERNOR_DECIDES_CLEMENCY.includes(authority)) {
    skipped.push(`${where}: clemency is ${authority ?? "not on file"}`);
    return null;
  }
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[];
  const governor = terms
    .filter((t) => t.status === "serving" && t.personId)
    .map((t) => stateOfficeOf(api, t.personId!))
    .find((o) => o?.role === "governor");
  if (!governor) {
    skipped.push(`${where}: no governor who is a person`);
    return null;
  }
  const alive = (id: string) =>
    core.people.get(id)?.alive &&
    core.cashJournal.residualAccountByOwner.has(id);
  const officials = [
    ...new Set(
      terms
        .filter(
          (t) => t.status === "serving" && t.personId && alive(t.personId),
        )
        .map((t) => t.personId!),
    ),
  ].slice(0, 40);
  const rich = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        !officials.includes(p.id) &&
        alive(p.id),
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
    .slice(0, 15);
  for (const offerer of rich)
    for (const official of officials)
      considerBribe(api, {
        offererId: offerer.id,
        officialId: official,
        stakeMinor: 50_000_000,
        subjectId: `favor:${offerer.id}:${official}`,
      });
  advanceCore(core, addDays(makeIsoDate(core.date), 240));
  if (!prisonersServing(api).length) {
    skipped.push(`${where}: nobody in prison`);
    return null;
  }
  // The next review day; entries are the governor's calendar for it.
  let date = makeIsoDate(core.date);
  while (
    new Date(`${date}T00:00:00Z`).getUTCDay() !==
    stateDayParameter("clemencyReviewWeekday")
  )
    date = addDays(date, 1);
  advanceCore(core, date);
  const entries = stateDay(api, governor, date).filter(
    (e) => e.kind === "clemency",
  );
  const served = prisonersServing(api);
  expect(entries.length, `${where}: one petition on the review day`).toBe(1);
  const custodyId = entries[0]!.subject;
  const prisoner = served.find((row) => row.id === custodyId)!;
  expect(
    prisoner,
    `${where}: the petition is a prisoner serving`,
  ).toBeDefined();
  const sentenceBefore = (
    api
      .moduleState(JUSTICE_MODULE_ID)
      .table("sentences")
      .get(prisoner.sentenceId) as unknown as SentenceRow
  ).releaseDate;
  expect(sentenceBefore! > date, `${where}: term not yet ended`).toBe(true);
  expect(inCustody(api, prisoner.personId), where).toBe(true);

  // The sentence is the governor's own state's: another state's governor
  // (or a federal sentence, which belongs to no state) cannot commute it.
  expect(sentenceStateKey(api, prisoner.sentenceId), where).toBe(state);
  expect(prisonersServing(api, "US-ZZ"), where).toEqual([]);
  expect(
    grantClemency(api, {
      custodyId: prisoner.id,
      grantedBy: governor.personId,
      stateKey: "US-ZZ",
    }),
    `${where}: another state's governor commutes nothing`,
  ).toBeNull();
  expect(inCustody(api, prisoner.personId), `${where}: still held`).toBe(true);

  // The player's own choice to commute.
  const result = actOn(api, entries[0]!, { kind: "clemency", grant: true });
  const sentenceAfter = api
    .moduleState(JUSTICE_MODULE_ID)
    .table("sentences")
    .get(prisoner.sentenceId) as unknown as SentenceRow;
  const [clemency] = clemenciesOf(api, prisoner.personId);
  expect(clemency, `${where}: clemency on record`).toBeDefined();
  expect(result.recordIds, where).toEqual([clemency!.id, prisoner.sentenceId]);
  expect(sentenceAfter.releaseDate, `${where}: sentence ends today`).toBe(date);
  expect(clemency!.releaseWas, where).toBe(sentenceBefore);
  expect(clemency!.daysRemitted, where).toBeGreaterThan(0);
  expect(inCustody(api, prisoner.personId), `${where}: free`).toBe(false);
  expect(
    prisonersServing(api).some((r) => r.id === custodyId),
    where,
  ).toBe(false);

  // A later review day: the character decides by the governor's own temperament and the share served.
  let character = "";
  for (let week = 1; week <= 30 && !character; week++) {
    const later = addDays(date, week * 7);
    advanceCore(core, later);
    const next = stateDay(api, governor, later).find(
      (e) => e.kind === "clemency",
    );
    if (!next) continue;
    const decided = actOn(api, next);
    expect(decided.by, where).toBe("character");
    expect(decided.reasons, where).toHaveProperty("served");
    expect(decided.reasons, where).toHaveProperty("lean");
    character = `${next.subject} ${decided.choice.kind === "clemency" && decided.choice.grant ? "granted" : "denied"} (served ${Number(decided.reasons["served"]).toFixed(2)}, lean ${Number(decided.reasons["lean"]).toFixed(2)})`;
  }
  return `${where}: governor ${governor.personId} commuted ${prisoner.personId} (${clemency!.id}, sentence ${prisoner.sentenceId}), ${clemency!.daysRemitted} days of ${clemency!.releaseWas}; later ${character || "no further petition"}`;
}

it("a governor's clemency ends the rest of a prisoner's term in the justice engine", () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const seed =
      (attempt === 0 && process.env.OFFICE_CLEMENCY_SEED) ||
      randomBytes(8).toString("hex");
    const proof = playPlace(seed, skipped);
    if (proof) {
      console.log(`CLEMENCY ${proof}`);
      return;
    }
  }
  throw new Error(
    `No drawn place had a prisoner to petition: ${skipped.join("; ")}`,
  );
}, 3_600_000);
