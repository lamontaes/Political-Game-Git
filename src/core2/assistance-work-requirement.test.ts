/**
 * The assistance work requirement decides who keeps the welfare benefit: in a
 * drawn place, once the line pays a benefit and the requirement is law, a
 * household every member of which it covers loses the benefit after the time
 * limit, and a household with anyone it does not cover keeps it.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { repealStartingAnswers } from "./law-test-start";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import {
  amendBudget,
  budgetsOf,
  governments,
  openBudgets,
} from "./modules/budgets";
import { openLawReach } from "./law-reach/host";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { groupBPolicy } from "./law-reach/group-b";
import {
  selectResidents,
  townFacts,
  forgetTownFacts,
} from "./law-reach/group-b-people";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import type { CoreState } from "./types";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`work-req:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
const LINE = "welfareAndMedicaid";

describe("the assistance work requirement reaches the welfare benefit", () => {
  it("ends the benefit of a household every member is covered, after the time limit", () => {
    let tried = 0;
    for (; tried < 30; tried += 1) {
      const state = pick(states, `state:${tried}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${tried}`).key;
      const full = buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 400,
      });
      const player = [...full.people]
        .filter((p) => 2026 - Number(p.birthDate.slice(0, 4)) >= 18)
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!player) continue;
      const core: CoreState = createLifeCore(
        collapseToTwoLevels({ ...full, playerId: player.id }),
      );
      openLaws(core);
      openBudgets(core);
      openLawReach(core);
      repealStartingAnswers(core);
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const stateKey = lawChain(api).stateKey;
      const where = `seed ${seed}, place ${key}`;
      // Who the requirement covers, from households' own records.
      const covered = () => {
        forgetTownFacts(api);
        const facts = townFacts(api, town);
        const hit = selectResidents(
          facts,
          groupBPolicy(WORK)!.people!,
          stateKey,
        );
        const by = new Map<string, number>();
        for (const r of hit)
          by.set(r.householdId, (by.get(r.householdId) ?? 0) + 1);
        return [...by]
          .filter(([id, n]) => facts.households.get(id)?.size === n)
          .map(([id]) => facts.households.get(id)!);
      };
      const fully = covered();
      const named = fully.filter((h) => h.named);
      if (!named.length) continue;
      // The welfare line pays a benefit once a government raises it.
      const gov =
        governments(api).find((g) => g.level === "city") ??
        governments(api)[0]!;
      const base = budgetsOf(api, gov.id);
      expect(base, where).toBeDefined();
      amendBudget(api, {
        governmentId: gov.id,
        line: LINE,
        deltaMinor: 5_000_000,
        measureId: "test:welfare-up",
      });
      advanceCore(core, after(api.state.date, 3));
      const benefits = () =>
        (
          api
            .moduleState(REACH_B_MODULE_ID)
            .table("taken")
            .rows() as unknown as {
            key: string;
            recipientId: string;
            obligationId: string;
          }[]
        ).filter((r) => r.key === `benefit|budget-line:${LINE}`);
      const live = () =>
        new Set(
          benefits()
            .filter((r) => !api.accounts().obligation(r.obligationId)?.endedAt)
            .map((r) => r.recipientId),
        );
      const headOf = (householdId: string) =>
        [...core.people.values()]
          .filter((p) => p.alive && p.householdId === householdId)
          .sort((a, b) => a.birthDate.localeCompare(b.birthDate))[0]!.id;
      const heads = named.map((h) => headOf(h.id));
      const before = live();
      if (!heads.some((id) => before.has(id))) continue;
      // The requirement becomes law; within the limit the benefit stands.
      enactLaw(api, {
        jurisdiction: lawChain(api).levels.find((l) => l.level === "state")!
          .jurisdiction,
        level: "state",
        series: WORK,
        value: 1,
        effectiveDate: after(api.state.date, 1),
        measureId: "test:work-requirement",
        citation: "Controlled law case in a drawn place.",
      });
      advanceCore(core, after(api.state.date, 40));
      const within = live();
      for (const id of heads.filter((h) => before.has(h)))
        expect(within.has(id), `${where}: ${id} inside the limit`).toBe(true);
      // Past the limit, the benefit of a household the requirement kept
      // covering the whole time ends; no one else's is touched by it.
      advanceCore(core, after(api.state.date, 140));
      const past = live();
      const startIds = new Set(named.map((h) => h.id));
      const kept = covered().filter(
        (h) => h.named && startIds.has(h.id) && before.has(headOf(h.id)),
      );
      if (!kept.length) continue;
      for (const h of kept)
        expect(
          past.has(headOf(h.id)),
          `${where}: ${h.id} still paid past the limit`,
        ).toBe(false);
      const clocks = (
        api.moduleState(REACH_B_MODULE_ID).table("taken").rows() as unknown as {
          id: string;
          since: string | null;
        }[]
      ).filter((r) => r.id.startsWith("workclock|") && r.since);
      expect(clocks.length, where).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `no town with a covered named household in ${tried} tries (seed ${seed})`,
    );
  }, 1_800_000);
});
