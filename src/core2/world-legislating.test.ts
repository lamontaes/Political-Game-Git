/**
 * M3-10 (first slice): the town's state legislature meets on its real session
 * calendar and passes laws on its own. At the session's end the majority
 * leader brings their priorities; each bill goes through committee, both
 * chambers and the governor; what passes becomes law in force on the state's
 * own effective date.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws, LAWS_MODULE_ID } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { effectsOn, openLawEffects } from "./modules/law-effects";
import {
  openWorldLegislating,
  sessionAgendaDates,
  sessionsOf,
  stateAnswer,
} from "./modules/world-legislating";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`world-legislating:${Date.now()}`).digest("hex");
// Places whose legislature's 2026 session reaches its floor day after the start.
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((k) => sessionAgendaDates(k).some((d) => d > START))
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("M3-10 other governments legislate", () => {
  it("the state legislature passes its own laws at its session's end and they take effect", () => {
    const tried: string[] = [];
    let report: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 6 && !report; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      tried.push(`${state} ${key}`);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openLawEffects(core);
      openWorldLegislating(core);
      const api = coreAPI(core);
      const end = [...sessionAgendaDates(state)]
        .filter((d) => d > START)
        .sort()[0]!;
      advanceCore(core, end);
      const session = sessionsOf(api).find((s) => s.stateKey === state);
      expect(session, `${state} ${key}: no session record`).toBeDefined();
      expect(session!.bills.length).toBeGreaterThan(0);
      const passed = session!.bills.filter((b) =>
        ["enacted", "signed", "overridden"].includes(b.status),
      );
      if (!passed.length) continue;
      // Each passed act is on the books with the state's own effective date;
      // on that date it is the state's law in force.
      const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
      const effective = passed
        .flatMap((b) => laws.query("bySeries", [state, b.question]))
        .map((r) => (r as unknown as { effectiveDate: string }).effectiveDate)
        .sort();
      expect(effective.length).toBeGreaterThanOrEqual(passed.length);
      advanceCore(core, effective[effective.length - 1]!);
      for (const bill of passed) {
        const rows = laws.query("bySeries", [state, bill.question]);
        expect(rows.length, `${bill.number} ${bill.question}`).toBeGreaterThan(
          0,
        );
        expect(stateAnswer(api, state, bill.question)).not.toBeNull();
      }
      const reached = [...core.people.keys()].filter((id) =>
        effectsOn(api, id).some((e) =>
          passed.some((b) => b.question === e.question),
        ),
      );
      report = {
        seed,
        state,
        place: key,
        sessionEnd: end,
        effective,
        leader: session!.leader,
        bills: session!.bills,
        residentsReached: reached.length,
      };
    }
    expect(report, `no act passed in ${tried.join(", ")}`).not.toBeNull();
    govReport("world-legislating", JSON.stringify(report));
  });
});
