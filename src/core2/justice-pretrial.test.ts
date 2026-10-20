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
    // Many early ids are officials who plead at once; go on until some defendants go to trial.
    for (const person of poor.slice(0, 60)) {
      if (held.length >= 6) break;
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
    for (const person of poor.slice(60, 120)) {
      if (freed >= 6) break;
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
});
