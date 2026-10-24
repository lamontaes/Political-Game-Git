/** Generated play evidence: a counted worker who retires is paid the award the retirement-claims engine sizes, not their place's average. */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { JOBS_DATA, JOBS_MODULE_ID } from "./modules/jobs";
import { retirementClaims } from "./modules/retirement-claims";
import { residentsRuntime } from "./modules/residents";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Play a year in a drawn place; the first place where a counted worker retires is the proof. */
function playUntilRetirement() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const draw = drawPlace(
      createHash("sha256").update(`${base}:${attempt}`).digest("hex"),
      "world-jobs-counted-retiree-income",
    );
    tried.push(`${draw.name} (${draw.key}), seed ${draw.seed}`);
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    for (let day = 0; day < 365; day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const retired = (
      api.moduleState(JOBS_MODULE_ID).table("changes").rows() as unknown as {
        kind: string;
        personId: string;
        id: string;
        reasonKey: string;
        values: Record<string, number>;
      }[]
    ).filter(
      // A counted worker who chose to retire; an official who died leaves work too.
      (row) =>
        row.kind === "left-work" &&
        row.reasonKey === JOBS_DATA.reasons.retired &&
        row.values.counted === 1,
    );
    // The place counts only if a counted worker who retired holds a counted
    // claim; otherwise the next drawn place is tried (bounded, loud on exhaustion).
    const claims = retirementClaims(core);
    const withClaim = retired.filter(
      (row) => claims.get(row.personId)?.counted,
    );
    if (withClaim.length)
      return { core, retired: withClaim, where: tried.join("; ") };
  }
  return { core: null, retired: [], where: tried.join("; ") };
}

it("pays each counted worker who retired their own claim, once, and no place-average flow", () => {
  setBookkeeping(false);
  try {
    const { core, retired, where } = playUntilRetirement();
    expect(
      retired.length,
      `no counted worker retired with a counted claim in ${where}`,
    ).toBeGreaterThan(0);
    console.log(
      `jobs-counted-retire-claim: ${where}; ${retired.length} counted retirees, first ${retired[0]!.id}`,
    );
    const flows = [...residentsRuntime(core!)!.flows.values()];
    // No flow carries a place average for retirees added in play.
    expect(
      flows.filter((f) => f.id.startsWith("residents:retirement:added:")),
      where,
    ).toEqual([]);
    const claims = retirementClaims(core!);
    // The retirement claimed on the day; each award is the claim flow, once.
    for (const row of retired) {
      const claim = claims.get(row.personId)!;
      expect(claim.counted, `${where}: ${row.id} claim is counted`).toBe(true);
      const own = flows.filter(
        (f) => f.id === `retirement-claim:${row.personId}`,
      );
      expect(own.length, `${where}: ${row.id}`).toBe(1);
      expect(own[0]!.amountMinor, `${where}: ${row.id}`).toBe(
        claim.monthlyMinor,
      );
      expect(claim.monthlyMinor, `${where}: ${row.id} award`).toBeGreaterThan(
        0,
      );
    }
  } finally {
    setBookkeeping(true);
  }
}, 2_400_000);
