import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "./modules/justice";
import justiceParameters from "./data/justice/parameters.json" with { type: "json" };

// A target who turns witness, and a prosecutor's desk that weighs on the
// charge (pool item gov-u1-the-rest): in the world the owner plays (a place
// drawn from all 56), two targets of one investigation are charged. A target
// who would plead gives the other up when the sentence cut outweighs the
// closeness the two have; their testimony adds to the case against the other;
// and a desk full of open matters lowers the worth of charging another.
const seed = process.env.JUSTICE_WITNESS_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "justice-witness");
const where = `seed ${seed}, ${place.name} (${place.key})`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const table = (name: string) => api.moduleState(JUSTICE_MODULE_ID).table(name);
const people = [...core.people.values()]
  .filter((p) => p.alive && p.tier !== "husk")
  .sort((a, b) => a.id.localeCompare(b.id));
let counter = 0;
function investigation(strengths: readonly number[], office = "office:test") {
  counter += 1;
  const row: InvestigationRow = {
    id: `investigation:test:${counter}`,
    complaintIds: [],
    crimeId: `crime:test:${counter}`,
    prosecutorOfficeId: `${office}:${counter}`,
    prosecutorPersonId: null,
    opened: true,
    date: core.date,
    reasons: {},
    targets: strengths.map((strength, at) => ({
      personId: people[at + counter * 2]!.id,
      crimeIds: [],
      evidence: [],
      strength,
    })),
    status: "open",
  };
  table("investigations").put(row as never);
  return row;
}
const casesOf = (row: InvestigationRow) =>
  row.targets.map(
    (t) =>
      table("cases").get(`case:${row.id}:${t.personId}`) as unknown as CaseRow,
  );

describe(`justice witness and workload, ${where}`, () => {
  it("one target at most turns witness, pleads for a cut, and strengthens the case against the other", () => {
    const row = investigation([0.9, 0.9]);
    chargeDecision(api, row.id);
    const cases = casesOf(row);
    const witnesses = cases.filter((c) => c.cooperated);
    expect(witnesses.length, where).toBeLessThanOrEqual(1);
    for (const witness of witnesses) {
      expect(witness.plea, where).toBe(true);
      expect(witness.testifiedAgainst, where).toHaveLength(1);
      const other = cases.find((c) => c.defendantId !== witness.defendantId)!;
      // The other target's evidence carries the testimony, with its reason.
      expect(other.evidence, where).toBeGreaterThan(0.9 - 1e-9);
      expect(other.reasons.testimony?.witnesses, where).toBe(1);
      expect(witness.reasons.cooperation?.sentenceCut, where).toBe(
        justiceParameters.cooperationSentenceShare.value,
      );
    }
  });

  it("a full desk lowers the worth of charging: the same evidence is charged on an empty desk and declined on a full one", () => {
    // Evidence just over the charging bar on an empty desk.
    const bar = justiceParameters.chargeBar.value;
    const weight = justiceParameters.prosecutorWorkloadWeight.value;
    const strength = bar + 0.5 * weight;
    const empty = investigation([strength]);
    chargeDecision(api, empty.id);
    expect(casesOf(empty)[0]!.status, where).not.toBe("no-charge");
    expect(casesOf(empty)[0]!.reasons.charge?.workload, where).toBeLessThan(0);
    // The same evidence on a desk already carrying many open matters.
    const full = investigation([strength]);
    for (let n = 0; n < 40; n += 1)
      table("investigations").put({
        ...full,
        id: `investigation:busy:${counter}:${n}`,
        status: "open",
      } as never);
    chargeDecision(api, full.id);
    const declined = casesOf(full)[0]!;
    expect(declined.status, where).toBe("no-charge");
    expect(declined.reasons.charge?.workload, where).toBeLessThan(
      casesOf(empty)[0]!.reasons.charge!.workload!,
    );
  });
});
