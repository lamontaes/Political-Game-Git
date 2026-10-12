/** Existing common Native writers; stamped row intake checks complete public-parent saved receipts before projecting the canonical prefix. */
import * as resources from "../../../simulation/resources";
import { createOrganization } from "../../../simulation/life";
import { recordLawExposure } from "../../../simulation/law-exposure";
import { recordWorldEvent } from "../../../simulation/world";
import { recordEventKnowledge } from "../../../simulation/records";
import { applyLawConsequences } from "../../../simulation/enacted-law-effects";
import { expect } from "vitest";
import { rentEffectFacts } from "./rent-effect-facts";
import type { World, IsoDate } from "../../../simulation/types";
import type { RentEffectRequest, RentEffectFacts } from "../rent-effects";
export function executeRent<T>(
  world: World,
  expected: World,
  generator: Generator<RentEffectRequest, T, RentEffectFacts>,
  dates: readonly IsoDate[],
) {
  let current = world,
    step = generator.next();
  while (!step.done) {
    const request = step.value;
    switch (request.kind) {
      case "createOrganization":
        current = createOrganization(current, request.input);
        break;
      case "recordLawExposure":
        current = recordLawExposure(current, request.input);
        break;
      case "recordWorldEvent":
        current = recordWorldEvent(current, request.input);
        break;
      case "recordEventKnowledge":
        current = recordEventKnowledge(current, request.input);
        break;
      case "applyLawConsequences":
        current = applyLawConsequences(current, request.input);
        break;
      case "createResourceFlow":
        current = resources.createResourceFlow(current, request.input);
        break;
      case "createResourceObligation":
        current = resources.createResourceObligation(current, request.input);
        break;
      case "recordResourceFlowTerms":
        current = resources.recordResourceFlowTerms(current, request.input);
        break;
      case "recordResourceObligationState":
        current = resources.recordResourceObligationState(
          current,
          request.input,
        );
        break;
      case "recordResourceTransferOutcomes":
        current = resources.recordResourceTransferOutcomes(
          current,
          request.input,
        );
        break;
      case "recordHousingTenureState":
        current = resources.recordHousingTenureState(current, request.input);
        break;
      case "recordDwellingOccupancyState":
        current = resources.recordDwellingOccupancyState(
          current,
          request.input,
        );
        break;
      case "stampTerms":
      case "stampEvent": {
        const field =
          request.kind === "stampTerms" ? "resourceFlowTerms" : "events";
        const saved = expected.history[field].find(
          (row) => row.id === request.record.id,
        )!;
        expect(saved).toEqual(request.record);
        expect({
          ...current.history[field].at(-1)!,
          lawEffectStamps: request.record.lawEffectStamps,
        }).toEqual(saved);
        const cutoff = saved.sequence + 1;
        const history = Object.fromEntries(
          Object.entries(expected.history).map(([key, value]) => [
            key,
            key === "nextSequence"
              ? cutoff
              : Array.isArray(value)
                ? value.filter(
                    (row) =>
                      typeof row?.sequence !== "number" ||
                      row.sequence < cutoff,
                  )
                : value,
          ]),
        ) as unknown as World["history"];
        current = { ...current, history };
        break;
      }
    }
    step = generator.next(rentEffectFacts(current, dates));
  }
  expect(current).toEqual(expected);
  return { world: current, result: step.value };
}
