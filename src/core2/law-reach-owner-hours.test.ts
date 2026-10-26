import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { groupBPolicy } from "./law-reach/group-b";
import {
  reachParameter,
  selectResidents,
  townFacts,
} from "./law-reach/group-b-people";
import { lawChain } from "./modules/laws";
import { ownerOf } from "./modules/business";
import { coreAPI } from "./state";

// A work requirement counts an owner's hours at their own business: self-
// employment is work (BLS CPS 2023: unincorporated self-employed average 34.9
// hours). An adult with no job and no business is still reached by it.
const WORK =
  "us-policy-positions:health-human-services.medicaid-work-requirement";
const seed = process.env.OWNER_HOURS_SEED ?? randomBytes(8).toString("hex");
const REPRO_SEED =
  "5bc87ba8c575d498bfcfbac8353c3cae24df7a433ca9e816da727ccfaff83c9e";
const MONTHLY_HOURS_LIMIT = "medicaidWorkHoursPerMonth";

describe(`a business owner under the Medicaid work requirement (seed ${seed})`, () => {
  it("is not read as working no hours, while an adult with no job or business still is reached", () => {
    const tried: string[] = [];
    // The recorded repro first (Montgomery, Michigan: the town newspaper's
    // owner), then drawn places, so the test also holds where it draws.
    for (let i = -1; i < 20; i += 1) {
      const place =
        i < 0
          ? { name: "Montgomery, Michigan", key: "2655220", seed: REPRO_SEED }
          : drawPlace(`${seed}:${i}`, "owner-hours");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      // The town's press outlets enroll their owners in the first weeks.
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const api = coreAPI(core);
      const chain = lawChain(api);
      const facts = townFacts(api, chain.townPlaceId);
      // A named owner the world records no work commitment for.
      const ownerIds = [...core.finance.businesses.keys()]
        .map((orgId) => ownerOf(api, orgId))
        .filter((id): id is string => !!id && core.people.has(id));
      const bare = facts.residents.find(
        (r) =>
          r.named &&
          ownerIds.includes(r.id) &&
          !(core.work.commitmentsByPerson.get(r.id)?.size ?? 0),
      );
      if (!bare) {
        tried.push(`${where}: no owner without a work commitment`);
        continue;
      }
      const people = groupBPolicy(WORK)!.people!;
      const reached = new Set(
        selectResidents(facts, people, chain.stateKey).map((r) => r.id),
      );
      // The owner's recorded hours reach the requirement's monthly hours.
      const monthly =
        (bare.weeklyMinutes * reachParameter("weeksPerYear")) /
        reachParameter("monthsPerYear") /
        reachParameter("minutesPerHour");
      expect(
        monthly,
        `${where}: ${bare.id} hours a month against ${reachParameter(MONTHLY_HOURS_LIMIT)}`,
      ).toBeGreaterThanOrEqual(reachParameter(MONTHLY_HOURS_LIMIT));
      expect(reached.has(bare.id), `${where}: ${bare.id} (owner) reached`).toBe(
        false,
      );
      // Someone with no job, no business and no recorded hours is still reached.
      const idle = facts.residents.find(
        (r) => r.named && reached.has(r.id) && !ownerIds.includes(r.id),
      );
      if (!idle) {
        tried.push(`${where}: no idle adult the requirement reaches`);
        continue;
      }
      expect(idle.weeklyMinutes, `${where}: ${idle.id}`).toBe(0);
      return;
    }
    throw new Error(`No drawn place had both witnesses: ${tried.join("; ")}`);
  }, 900_000);
});
