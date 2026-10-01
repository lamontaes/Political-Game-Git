import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import taxPayload from "../../../docs/codex/effect-batches/team-3/tax-kind-registration.json";
import startingLaws from "../../../data/research/laws/starting-law-2026.json";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import {
  enterLifePath,
  scheduleLifePathSession,
  applyLifePathSessionCompletion,
} from "../life-paths2";
import { stateIncomeTaxSchedule } from "../income-tax-withholding";
import { resourceFlowTermsAt } from "../resource-queries";
import { recordResourceTransferOutcome } from "../resources";
import { serializeWorld, deserializeWorld } from "../serialization";
import { createLawConsequenceRegistry } from "../law-consequence-registry";
import { validateLawConsequences } from "../law-consequence-validation";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "../state-income-tax-law";
import { TEAM_3_TAX_REGISTRATION } from "./tax";
import type { LawConsequenceRow } from "../law-consequence-types";
import type { World } from "../types";

const keys = [
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
];
const seen = new Set<string>();
const sample = Array.from({ length: 5 }, (_, index) => {
  const seed = `tax-kind:first-five:${index}`;
  const place = drawRandomPlace(seed, (candidate) => {
    const state = candidate.stateJurisdictionKey;
    if (!state || seen.has(state)) return false;
    const read = stateIncomeTaxSchedule(state, "single", seed);
    return (
      read.kind === "schedule" &&
      !read.estimatedFromAverage &&
      keys.every((key) => {
        const question =
          startingLaws.questions[key as keyof typeof startingLaws.questions];
        const answers = question.answers as Record<string, { answer: string }>;
        return answers[state]?.answer === "yes";
      })
    );
  });
  seen.add(place.stateJurisdictionKey!);
  return { seed, place };
});
const rowFor = (key: string): LawConsequenceRow =>
  structuredClone(
    taxPayload.rows.find((item) => item.questionKey === key)!.row,
  ) as LawConsequenceRow;

function wageInput(seed: string, placeKey: string) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    startAge: 30,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
  });
  let world = enterLifePath(created.world, "shop-assistant").world;
  const work = world.history.workRelationships.at(-1)!;
  world = scheduleLifePathSession(world, work.id).world;
  const activity = world.history.scheduledActivities.at(-1)!;
  world = applyLifePathSessionCompletion(world, activity.id);
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === "life-paths2:pay" &&
      item.entityIds.includes(work.id),
  )!;
  const flow = world.history.resourceFlows.find((item) =>
    due.entityIds.includes(item.id),
  )!;
  const terms = resourceFlowTermsAt(world, flow.id)!;
  world = recordResourceTransferOutcome(world, {
    stableKey: `tax-kind:completed-work-settlement:${work.id}`,
    resourceFlowId: flow.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    attemptedAmount: terms.amount,
    transferredAmount: terms.amount,
    status: "completed",
    reasonKind: null,
    note: "Controlled immediate settlement of a recorded completed shift; ordinary payday advancement is not claimed.",
    provenance: {
      kind: "authored",
      note: "Tax-kind activity fixture uses actual completed work and recorded compensation terms.",
    },
  });
  const outcome = world.history.resourceTransferOutcomes.at(-1)!;
  const propositions = { ...world.policyCatalog.propositions };
  for (const key of keys) {
    const question = Object.values(propositions).find(
      (item) => item.stableKey === key,
    )!;
    propositions[question.id] = { ...question, consequences: [rowFor(key)] };
  }
  world = { ...world, policyCatalog: { ...world.policyCatalog, propositions } };
  return { world, personId: created.playerPersonId, outcome };
}

describe.each(sample)(
  "tax kind in $place.displayName ($seed)",
  ({ seed, place }) => {
    it("changes actual named-payer records once and preserves canonical reopening", () => {
      const input = wageInput(seed, place.key);
      let world: World = input.world;
      const registry = createLawConsequenceRegistry([TEAM_3_TAX_REGISTRATION]);
      expect(
        validateLawConsequences(keys.map(rowFor), registry.capabilities),
      ).toEqual([]);
      expect(
        world.history.statutoryTaxLiabilities?.some(
          (item) => item.sourceOutcomeId === input.outcome.id,
        ),
      ).not.toBe(true);
      for (const key of keys) {
        const row = rowFor(key);
        const context = {
          onDate: world.currentDate,
          activity: "assessment" as const,
          activityId: input.outcome.id,
          subjectIds: [input.personId],
        };
        const resolved = TEAM_3_TAX_REGISTRATION.resolve(world, row, context);
        expect(resolved).toHaveLength(1);
        const first = TEAM_3_TAX_REGISTRATION.apply(world, resolved[0]!);
        if (key === keys[0]) expect(first).not.toBe(world);
        world = first;
        const liability = world.history.statutoryTaxLiabilities!.find(
          (item) =>
            item.sourceOutcomeId === input.outcome.id &&
            item.lawEffectStamps?.some((stamp) => stamp.questionKey === key),
        )!;
        expect(liability.payer).toEqual({
          kind: "person",
          personId: input.personId,
        });
        expect(liability.liability!.minorUnits).toBeGreaterThan(0);
        const payment = world.history.statutoryTaxPayments!.find(
          (item) => item.liabilityId === liability.id,
        )!;
        expect(payment.amount.minorUnits).toBeGreaterThan(0);
        expect(
          payment.lawEffectStamps?.some(
            (stamp) =>
              stamp.questionKey === key &&
              stamp.sourceRecordIds?.includes(liability.id),
          ),
        ).toBe(true);
        expect(TEAM_3_TAX_REGISTRATION.apply(world, resolved[0]!)).toBe(world);
        expect(() =>
          TEAM_3_TAX_REGISTRATION.apply(world, {
            ...resolved[0]!,
            value: {
              type: "amount",
              value: liability.liability!.minorUnits + 1,
              unit: "minor",
              currency: "USD",
            },
          }),
        ).toThrow("does not match");
      }
      const reopened = deserializeWorld(serializeWorld(world));
      expect(reopened.history.statutoryTaxLiabilities).toEqual(
        world.history.statutoryTaxLiabilities,
      );
      expect(reopened.history.statutoryTaxPayments).toEqual(
        world.history.statutoryTaxPayments,
      );
      for (const key of keys) {
        const resolved = TEAM_3_TAX_REGISTRATION.resolve(
          reopened,
          rowFor(key),
          {
            onDate: reopened.currentDate,
            activity: "assessment",
            activityId: input.outcome.id,
            subjectIds: [input.personId],
          },
        );
        expect(TEAM_3_TAX_REGISTRATION.apply(reopened, resolved[0]!)).toBe(
          reopened,
        );
      }
      mkdirSync("test-results/team-3-tax-kind", { recursive: true });
      writeFileSync(
        `test-results/team-3-tax-kind/${place.stateJurisdictionKey}.json`,
        JSON.stringify(
          {
            seed,
            placeKey: place.key,
            placeName: place.displayName,
            stateKey: place.stateJurisdictionKey,
            person: world.people[input.personId],
            sourceOutcome: input.outcome,
            liabilities: world.history.statutoryTaxLiabilities!.filter(
              (item) => item.sourceOutcomeId === input.outcome.id,
            ),
            payments: world.history.statutoryTaxPayments,
          },
          null,
          2,
        ),
      );
    }, 120_000);
  },
);
