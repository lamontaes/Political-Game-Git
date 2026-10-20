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
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import {
  clemencyAuthority,
  GOVERNOR_DECIDES_CLEMENCY,
} from "./modules/executive";
import { clemenciesOf, inCustody, prisonersServing } from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { resultsOf, stateOfficeOf } from "./office-day-state";
import { coreAPI } from "./state";

const ATTEMPTS = 12;

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
  // Nobody plays the governor: the weekly petitions come up by themselves.
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const decided = resultsOf(api, governor.personId).filter(
    (row) => row.kind === "clemency",
  );
  if (!decided.length) {
    skipped.push(`${where}: no petition was taken up in 120 days`);
    return null;
  }
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
  return `${where}: governor ${governor.personId} decided ${decided.length} petitions (${granted.length} granted, ${decided.length - granted.length} refused); clemency records ${clemenciesOf(api, governor.personId).length}`;
}

it("a computer governor takes up the weekly petition and grants or refuses it by recorded reasons", () => {
  const skipped: string[] = [];
  const base = process.env.CLEMENCY_AI_SEED ?? randomBytes(8).toString("hex");
  const from = Number(process.env.CLEMENCY_AI_FROM ?? 0);
  for (let attempt = from; attempt < ATTEMPTS; attempt++) {
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
