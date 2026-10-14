/**
 * The executive's desk (M3-05), in random places: the town's department
 * heads are appointed by the authority its form of government names, with
 * reasons and the council's confirmation; the state's cabinet is chosen by
 * the governor and confirmed by the senate; a mayor vetoes only where the
 * state gives the office a veto; and a governor's order reaches the law.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawChain, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { mayorVeto, openLegislature } from "./modules/legislature";
import {
  appoint,
  experienceFromAge,
  appointmentsIn,
  issueOrder,
  openExecutive,
  orderableBy,
  townForm,
} from "./modules/executive";
import { answerIn } from "./modules/world-legislating";
import { governments, openBudgets } from "./modules/budgets";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`executive:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function world(states: readonly string[], salt: string) {
  const state = pick(states, `${salt}:state`);
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const key = pick(places, `${salt}:place`).key;
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: key,
      startedAt: START,
      minimumPeople: 250,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openRecord(core);
  openLegislature(core);
  openBudgets(core);
  openExecutive(core, seed);
  return {
    core,
    api: coreAPI(core),
    where: `seed ${seed}, ${state} place ${key}`,
  };
}
const all = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("the executive's desk", () => {
  it("department heads and the cabinet are appointed with reasons and confirmation, and the mayor's veto follows the state's law", () => {
    const { core, api, where } = world(all, "appoint");
    const town = lawChain(api).townPlaceId;
    const heads = [...appointmentsIn(api, town)];
    const form = townForm(api);
    const governed = townSeats(api).some(
      (s) =>
        (s.office.kind === "council" || s.office.kind === "mayor") && s.holder,
    );
    const playerAppoints = townSeats(api).some(
      (s) =>
        (s.office.kind === "mayor" || s.office.kind === "council") &&
        s.holder?.personId === core.playerId,
    );
    if (governed && !playerAppoints)
      expect(heads.length, `${where} (${form})`).toBeGreaterThan(0);
    if (!governed) expect(heads.length, where).toBe(0);
    // Where the player holds the appointing office, their posts wait for
    // their own choice; they name someone they pick.
    if (governed && playerAppoints && !heads.length) {
      const pickee = [...core.people.values()]
        .filter((p) => p.placeId === town && p.id !== core.playerId)
        .sort((a, b) => a.id.localeCompare(b.id))[0]!;
      const post = form === "council-manager" ? "city-manager" : "police-chief";
      const named = appoint(api, { post, personId: pickee.id });
      if (named) expect(named.holderId).toBe(pickee.id);
      heads.push(...appointmentsIn(api, town));
    }
    // One post per person.
    expect(new Set(heads.map((h) => h.holderId)).size, where).toBe(
      heads.length,
    );
    for (const row of heads) {
      // A resident of the town, chosen for recorded reasons.
      expect(core.people.get(row.holderId)?.placeId, where).toBe(town);
      expect(row.reasons[0]!.candidateId).toBe(row.holderId);
      if (row.confirmation)
        expect(row.confirmation.yes).toBeGreaterThan(row.confirmation.no);
      // On the town government's payroll.
      const job = core.people.get(row.holderId)?.jobId;
      const employer = job ? core.jobs.get(job)?.organizationId : undefined;
      if (
        governments(api).some((g) => g.level === "city" || g.level === "county")
      )
        expect(
          governments(api).some((g) => g.organizationId === employer),
          `${where} ${row.title}`,
        ).toBe(true);
    }
    const state = lawChain(api).stateKey;
    const cabinet = appointmentsIn(api, state);
    const governor = townSeats(api).some((s) => s.office.kind === "governor");
    if (governor) expect(cabinet.length, where).toBeGreaterThan(0);
    for (const row of cabinet)
      expect(row.identity?.familyName.length).toBeGreaterThan(0);
    // The form follows the mayor's real powers.
    const veto = mayorVeto(api);
    if (form !== "council-manager")
      expect(form).toBe(veto.veto ? "strong-mayor" : "weak-mayor-council");
    govReport(
      "executive-appointments",
      JSON.stringify({
        where,
        form,
        veto,
        heads: heads.map(
          (h) =>
            `${h.title}: ${h.holderId} by ${h.appointedBy}${h.confirmation ? ` (${h.confirmation.yes}-${h.confirmation.no})` : ""}`,
        ),
        cabinet: cabinet.map(
          (c) =>
            `${c.title}: ${c.identity?.givenName} ${c.identity?.familyName}`,
        ),
      }),
    );
  }, 300_000);

  it("a governor who may restore voting rights by order does, and it becomes the state's law", () => {
    const states = ["US-IA", "US-KY", "US-VA"];
    const { core, api, where } = world(states, "order");
    if (!orderableBy(api).includes("restore-voting-after-sentence")) return;
    const governor = townSeats(api).find(
      (s) => s.office.kind === "governor",
    )!.holder!;
    const state = lawChain(api).stateKey;
    const question =
      "us-policy-positions:justice-public-safety.restore-voting-after-sentence";
    issueOrder(api, {
      executiveId: `official:${governor.id}`,
      order: "restore-voting-after-sentence",
    });
    advanceCore(core, "2026-01-08");
    expect(answerIn(api, state, question), where).toBe(1);
    issueOrder(api, {
      executiveId: `official:${governor.id}`,
      order: "restore-voting-after-sentence",
      revoke: true,
    });
    advanceCore(core, "2026-01-10");
    expect(answerIn(api, state, question), where).toBe(-1);
  }, 300_000);

  it("appointment qualification rises smoothly with adult years, so a young adult is eligible but rarely preferred", () => {
    const date = "2026-06-01";
    const born = (age: number) => ({ birthDate: `${2026 - age}-01-01` });
    let previous = experienceFromAge(born(18), date);
    expect(previous).toBe(0);
    let biggestStep = 0;
    for (let age = 19; age <= 90; age += 1) {
      const now = experienceFromAge(born(age), date);
      expect(now).toBeGreaterThan(previous);
      biggestStep = Math.max(biggestStep, now - previous);
      previous = now;
    }
    // No jump at 25 or anywhere else: the largest one-year gain is small.
    expect(biggestStep).toBeLessThan(0.02);
    // A 22-year-old counts (more than zero) but trails a 45-year-old.
    expect(experienceFromAge(born(22), date)).toBeGreaterThan(0);
    expect(experienceFromAge(born(22), date)).toBeLessThan(
      experienceFromAge(born(45), date),
    );
  });
});
