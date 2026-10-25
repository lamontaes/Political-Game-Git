/**
 * A governor who is not the player takes up the weekly petition for clemency
 * and grants or refuses it by their recorded reasons (pool item
 * governor-clemency-computer-governors). The convictions are the engines'
 * own; the only forced part is the bribes offered, as in the player's
 * clemency test. A place is drawn from all 56; set CLEMENCY_AI_SEED to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { chargeDecisionDays, dispositionDays } from "./justice-law";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import {
  clemencyAuthority,
  GOVERNOR_DECIDES_CLEMENCY,
} from "./modules/executive";
import { clemenciesOf, prisonersServing } from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { resultsOf, stateOfficeOf } from "./office-day-state";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const ATTEMPTS = 12;

// Past the hearing of a case opened today: the charge decision, then the
// state's time to disposition (pleas wait for it as trials do), then a month.
const pastHearing = (api: CoreAPI) =>
  chargeDecisionDays(api).days +
  dispositionDays(api, lawChain(api).stateKey).days +
  30;

function playPlace(seed: string, skipped: string[]): string | null {
  const place = drawPlace(seed, "computer-clemency");
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
    .find((o) => o?.role === "governor" && o.stateKey === state);
  if (!governor) {
    skipped.push(`${where}: no governor who is a person`);
    return null;
  }
  const alive = (id: string) =>
    core.people.get(id)?.alive &&
    core.cashJournal.residualAccountByOwner.has(id);
  // The bribes fill the prisons; the governor is not offered one, so the
  // governor who takes up the petitions is the one the run opened with. A
  // governor convicted at the same hearing as everyone else can leave the
  // seat to a successor on record only by identity, whose days nobody plays
  // (Sinajana, Guam, seed 449d6cfb96d84c74:0).
  const officials = [
    ...new Set(
      terms
        .filter(
          (t) =>
            t.status === "serving" &&
            t.personId &&
            t.personId !== governor.personId &&
            alive(t.personId),
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
  advanceCore(core, addDays(makeIsoDate(core.date), pastHearing(api)));
  if (!prisonersServing(api).length) {
    skipped.push(`${where}: nobody in prison`);
    return null;
  }
  // Nobody plays the governor: the weekly petitions come up by themselves.
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  // The seat's holders, not only the governor the run opened with: one who
  // leaves office during the run is followed by a successor who takes up the
  // petitions.
  const holders = [
    ...new Set(
      (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .rows() as unknown as TermRow[]
      )
        .filter((t) => t.officeId === governor.officeId && t.personId)
        .map((t) => t.personId!),
    ),
  ];
  const decided = holders
    .flatMap((id) => resultsOf(api, id))
    .filter((row) => row.kind === "clemency");
  // A governor with authority and a state prisoner serving is the case: it
  // must have taken a petition up, never be skipped for the next draw.
  expect(
    decided.length,
    `${where}: governors ${holders.join(", ")} took up no petition in 360 days with ${prisonersServing(api, state).length} serving`,
  ).toBeGreaterThan(0);
  for (const row of decided) {
    expect(row.by, `${where}: ${row.id}`).toBe("character");
    expect(row.reasons, where).toHaveProperty("served");
    expect(row.reasons, where).toHaveProperty("lean");
  }
  const granted = decided.filter(
    (row) => row.choice.kind === "clemency" && row.choice.grant,
  );
  for (const row of granted) {
    const [sentenceId] = row.recordIds.slice(-1);
    expect(
      sentenceId,
      `${where}: a granted petition names its sentence`,
    ).toBeTruthy();
  }
  return `${where}: governors ${holders.join(", ")} decided ${decided.length} petitions (${granted.length} granted, ${decided.length - granted.length} refused; first ${decided[0]!.id}); clemency records ${holders.reduce((n, id) => n + clemenciesOf(api, id).length, 0)}`;
}

it("a computer governor takes up the weekly petition and grants or refuses it by recorded reasons", () => {
  const skipped: string[] = [];
  const base = process.env.CLEMENCY_AI_SEED ?? randomBytes(8).toString("hex");
  const from = Number(process.env.CLEMENCY_AI_FROM ?? 0);
  const to = Number(process.env.CLEMENCY_AI_TO ?? ATTEMPTS);
  for (let attempt = from; attempt < to; attempt++) {
    const seed = `${base}:${attempt}`;
    const proof = playPlace(seed, skipped);
    if (proof) {
      console.log(`CLEMENCY-AI ${proof}`);
      if (process.env.CLEMENCY_AI_PROOF)
        writeFileSync(process.env.CLEMENCY_AI_PROOF, `${attempt}: ${proof}\n`);
      return;
    }
  }
  throw new Error(
    `No drawn place had a computer governor decide a petition: ${skipped.join("; ")}`,
  );
}, 3_600_000);
