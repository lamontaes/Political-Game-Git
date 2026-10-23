/**
 * A bribery conviction forfeits the bribe money the defendant took, before the
 * fine (pool: gov-forfeiture-of-the-bribe-at-sentencing-sg). In a played
 * world, rich residents offer large bribes to the sitting officials, some
 * take them, and the prosecutor's cases run their course; each convicted
 * taker's sentence carries the proceeds, and the forfeiture is a journal
 * entry from the official's cash to the treasury ahead of the fine.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { chargeDecisionDays, dispositionDays } from "./justice-law";
import { advanceCore } from "./life";
import {
  CORRUPTION_MODULE_ID,
  considerBribe,
  type CrimeRecord,
} from "./modules/corruption";
import { JUSTICE_MODULE_ID, type SentenceRow } from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const ATTEMPTS = 6;

// Past the hearing of a case opened today: the charge decision, then the
// state's time to disposition (pleas wait for it as trials do), then a month.
const pastHearing = (api: CoreAPI) =>
  chargeDecisionDays(api).days +
  dispositionDays(api, lawChain(api).stateKey).days +
  30;

function play(seed: string) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
  const api = coreAPI(core);
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[];
  const alive = (id: string) =>
    core.people.get(id)?.alive &&
    core.cashJournal.residualAccountByOwner.has(id);
  const members = [
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
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        !members.includes(person.id) &&
        alive(person.id),
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
    .slice(0, 15);
  // The only forced part is the offers; reports, charges, pleas, trials and
  // sentences are the engines' own.
  let taken = 0;
  for (const offerer of rich)
    for (const official of members)
      if (
        considerBribe(api, {
          offererId: offerer.id,
          officialId: official,
          stakeMinor: 50_000_000,
          subjectId: `favor:${offerer.id}:${official}`,
        })?.taken
      )
        taken += 1;
  advanceCore(core, addDays(makeIsoDate(core.date), pastHearing(api)));
  const sentences = api
    .moduleState(JUSTICE_MODULE_ID)
    .table("sentences")
    .rows() as unknown as SentenceRow[];
  return { core, api, sentences, taken };
}

it("forfeits the bribe money a convicted official took, to the treasury, before the fine", () => {
  let last = "";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const seed = createHash("sha256")
      .update(randomBytes(16))
      .digest("hex")
      .slice(0, 16);
    const { core, api, sentences, taken } = play(seed);
    const where = `${lawChain(api).placeName}, seed ${seed}`;
    last = `${where}, ${taken} bribes taken, ${sentences.length} sentences`;
    const crimes = api
      .moduleState(CORRUPTION_MODULE_ID)
      .table("crimes")
      .rows() as unknown as CrimeRecord[];
    const fines = api.moduleState(JUSTICE_MODULE_ID).table("fines");
    const forfeits = sentences.filter((s) => s.forfeitureMinor > 0);
    if (!forfeits.length) continue;

    for (const sentence of sentences) {
      // What the defendant took, named by the crime records behind the case.
      const took = crimes
        .filter((c) => c.taken && c.officialId === sentence.personId)
        .filter((c) => c.date <= sentence.date)
        .reduce((sum, c) => sum + c.amountMinor, 0);
      expect(
        sentence.forfeitureMinor,
        `${where} ${sentence.id}`,
      ).toBeLessThanOrEqual(took);
      expect(sentence.forfeiturePaidMinor).toBeLessThanOrEqual(
        sentence.forfeitureMinor,
      );
      // Someone who only offered took no money and forfeits none.
      if (!took)
        expect(sentence.forfeitureMinor, `${where} ${sentence.id}`).toBe(0);
      const record = fines.get(`forfeiture:${sentence.id}`) as unknown as
        { postings: { deltaMinor: number }[] } | undefined;
      if (sentence.forfeiturePaidMinor > 0) {
        expect(record, `${where} ${sentence.id}`).toBeDefined();
        expect(record!.postings.reduce((n, x) => n + x.deltaMinor, 0)).toBe(0);
        expect(Math.max(...record!.postings.map((x) => x.deltaMinor))).toBe(
          sentence.forfeiturePaidMinor,
        );
      }
    }
    // The forfeiture comes first: a fine is collected only from cash left
    // after the whole forfeiture, and a forfeiture is paid as far as the
    // official still holds the money.
    for (const sentence of sentences)
      if (sentence.finePaidMinor > 0)
        expect(sentence.forfeiturePaidMinor, `${where} ${sentence.id}`).toBe(
          sentence.forfeitureMinor,
        );
    expect(
      forfeits.some((s) => s.forfeiturePaidMinor > 0),
      where,
    ).toBe(true);
    expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `No taker was convicted in ${ATTEMPTS} worlds (last: ${last}).`,
  );
}, 1_800_000);
