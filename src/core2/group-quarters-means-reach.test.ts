/**
 * A means-tested program reaches a group-quarters room only where its own
 * rule serves the room's type. Newport, Vermont (5048850), seed
 * `group-quarters-means-reach-1`, holds a prison and a nursing home: the
 * Medicaid expansion reaches the nursing-home rooms and not the cells, and
 * the assistance work requirement and the welfare line reach neither.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  selectResidents,
  townFacts,
  type PeopleSelector,
} from "./law-reach/group-b-people";
import reachB from "./data/laws/reach-group-b.json" with { type: "json" };
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const selectorOf = (policy: string): PeopleSelector =>
  (reachB.policies as Record<string, { people: PeopleSelector }>)[policy]!
    .people;

it("Medicaid serves nursing-home rooms, no program serves a cell, and assistance serves no room", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(
    "group-quarters-means-reach-1",
    gameStartDate(),
    { twoLevel: true, placeKey: "5048850" },
  );
  const api = coreAPI(core);
  const town = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string }
  ).townPlaceId;
  const facts = townFacts(api, town);
  const stateKey = "US-VT";
  const roomOf = new Map<string, string>();
  for (const h of residentsRuntime(core as CoreState)!.store.liveHouseholds())
    if (h.quarters) roomOf.set(h.id, h.quarters);
  const types = (selector: PeopleSelector) =>
    new Set(
      selectResidents(facts, selector, stateKey)
        .map((r) => roomOf.get(r.householdId))
        .filter((type) => type !== undefined),
    );
  const medicaid = types({
    ...selectorOf(
      "us-policy-positions:health-human-services.expand-medicaid-eligibility",
    ),
    // Every age, so the room's type is the only thing that can leave it out.
    ageFrom: undefined,
    ageBelow: undefined,
  });
  expect(medicaid.has("nursing")).toBe(true);
  expect(medicaid.has("adultCorrectional")).toBe(false);
  const assistance = types(
    selectorOf(
      "us-policy-positions:health-human-services.work-requirement-for-assistance",
    ),
  );
  expect(assistance.size).toBe(0);
  const welfare = types(
    (reachB.budgetLines as Record<string, { people: PeopleSelector }>)
      .welfareAndMedicaid!.people,
  );
  expect(welfare.size).toBe(0);
}, 300_000);
