import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "./modules/justice";
import { END_CASH_BAIL, type PretrialRow } from "./justice-pretrial";
import justiceParameters from "./data/justice/parameters.json" with { type: "json" };

// Ending cash bail is a read (pool item laws-outcome-justice): in a played
// world in a drawn place, a charged defendant who does not plead waits for
// trial in custody when they cannot post bail and cash bail is law, and goes
// home on the day the bail law is ended.
const seed =
  process.env.JUSTICE_PRETRIAL_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "justice-pretrial");
const where = `seed ${seed}, ${place.name} (${place.key})`;
const core = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
}).core;
const api = coreAPI(core);
const table = (name: string) => api.moduleState(JUSTICE_MODULE_ID).table(name);
const adults = [...core.people.values()]
  .filter((p) => p.alive && p.tier !== "husk")
  .sort((a, b) => a.id.localeCompare(b.id));
let counter = 0;

function charge(personId: string): CaseRow {
  counter += 1;
  const row: InvestigationRow = {
    id: `investigation:pretrial:${counter}`,
    complaintIds: [],
    crimeId: `crime:pretrial:${counter}`,
    prosecutorOfficeId: `office:pretrial:${counter}`,
    prosecutorPersonId: null,
    opened: true,
    date: core.date,
    reasons: {},
    targets: [
      {
        personId,
        crimeIds: [],
        evidence: [],
        strength: justiceParameters.chargeBar.value + 0.1,
      },
    ],
    status: "open",
  };
  table("investigations").put(row as never);
  chargeDecision(api, row.id);
  return table("cases").get(`case:${row.id}:${personId}`) as unknown as CaseRow;
}

function setBailLaw(value: number): void {
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: END_CASH_BAIL,
      value,
      effectiveDate: core.date,
      measureId: `test:pretrial:${value}:${counter}`,
      citation: "Controlled law case in a generated year.",
    });
}

const pretrialOf = (c: CaseRow) =>
  table("pretrial").get(`pretrial:${c.id}`) as unknown as
    PretrialRow | undefined;

describe(`pretrial bail, ${where}`, () => {
  it("holds a defendant who cannot post bail while cash bail is law, and frees them when it is ended", () => {
    const bail = justiceParameters.pretrialBailMinor.value;
    const poor = adults.filter((p) => (p.liquidMinor ?? 0) < bail);
    expect(poor.length, where).toBeGreaterThan(0);
    setBailLaw(0);
    const held: PretrialRow[] = [];
    for (const person of poor.slice(0, 12)) {
      const c = charge(person.id);
      if (!c || c.plea) continue;
      const wait = pretrialOf(c)!;
      expect(wait.decision, `${where}: ${person.id}`).toBe("held");
      expect(wait.lawId, where).toBeNull();
      expect(core.people.get(person.id)!.discretionaryEligibleV1, where).toBe(
        false,
      );
      held.push(wait);
    }
    expect(
      held.length,
      `${where}: no defendant waited for trial`,
    ).toBeGreaterThan(0);

    // The trial opens: everyone held goes home to their own choices.
    const lastTrial = held
      .map(
        (w) => (table("cases").get(w.caseId) as unknown as CaseRow).trialDate!,
      )
      .sort()
      .at(-1)!;
    advanceCore(core, addDays(makeIsoDate(lastTrial), 1));
    for (const wait of held)
      expect(
        (table("pretrial").get(wait.id) as unknown as PretrialRow).status,
        where,
      ).toBe("released");

    // With bail ended, the same poor defendant is not held, citing the statute.
    setBailLaw(1);
    let freed = 0;
    for (const person of poor.slice(12, 30)) {
      const c = charge(person.id);
      if (!c || c.plea) continue;
      const wait = pretrialOf(c)!;
      expect(wait.decision, `${where}: ${person.id}`).toBe(
        "released-no-bail-law",
      );
      expect(wait.lawId, where).not.toBeNull();
      freed += 1;
    }
    expect(freed, `${where}: no defendant freed`).toBeGreaterThan(0);
  }, 1_200_000);

  it("moves posted bail from the defendant's cash to the treasury and back when the trial opens", () => {
    const bail = justiceParameters.pretrialBailMinor.value;
    const rich = adults.filter((p) => (p.liquidMinor ?? 0) >= bail * 2);
    expect(rich.length, where).toBeGreaterThan(0);
    // Cash bail is law again from tomorrow: the earlier case ended it today.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    setBailLaw(0);
    for (const person of rich.slice(0, 20)) {
      const before = core.cashJournal.nextSequence;
      const c = charge(person.id);
      if (!c || c.plea) continue;
      expect(pretrialOf(c)!.decision, `${where}: ${person.id}`).toBe("posted");
      const fines = api.moduleState(JUSTICE_MODULE_ID).table("fines");
      const held = fines.get(`bail:${c.id}`) as unknown as {
        postings: { accountId: string; deltaMinor: number }[];
      };
      expect(held, `${where}: no bail record for ${c.id}`).toBeDefined();
      expect(
        held.postings.map((x) => x.deltaMinor).sort((a, b) => a - b),
      ).toEqual([-bail, bail]);
      expect(held.postings[0]!.accountId, where).toBe(
        `cash:${person.id}:residual`,
      );
      expect(core.cashJournal.nextSequence, where).toBeGreaterThan(before);
      advanceCore(core, addDays(makeIsoDate(c.trialDate!), 1));
      const back = fines.get(`bail-return:${c.id}`) as unknown as {
        postings: { accountId: string; deltaMinor: number }[];
      };
      expect(back, `${where}: bail not returned for ${c.id}`).toBeDefined();
      expect(
        back.postings.find((x) => x.accountId === `cash:${person.id}:residual`)!
          .deltaMinor,
        where,
      ).toBe(bail);
      return;
    }
    throw new Error(`${where}: no defendant went to trial`);
  }, 1_200_000);
});
