/** Test-only ordered DTO transport through unchanged Native public common writers; no rule math lives here. */
import * as life from "../../../simulation/life";
import * as resources from "../../../simulation/resources";
import { recordWorldEvent } from "../../../simulation/world";
import { recordTownJobLoss } from "../../../simulation/living-world/town-labor-market";
import type { World } from "../../../simulation/types";
import type { FinanceFacts, FinanceEffectRequest } from "../town-finance-books";
import { financeFacts } from "./finance-facts";
export function execute<T>(
  world: World,
  gen: Generator<FinanceEffectRequest, T, FinanceFacts>,
  observed: FinanceEffectRequest[] = [],
) {
  let step = gen.next(),
    current = world;
  while (!step.done) {
    const request = step.value;
    observed.push(request);
    if (request.books !== undefined)
      current = { ...current, townFinances: request.books };
    switch (request.kind) {
      case "createResourcePosition":
        current = resources.createResourcePosition(current, request.input);
        break;
      case "createOrganization":
        current = life.createOrganization(current, request.input);
        break;
      case "recordOrganizationProfile":
        current = life.recordOrganizationProfile(current, request.input);
        break;
      case "recordTownJobLoss":
        current = recordTownJobLoss(current, request.input);
        break;
      case "recordWorldEvent":
        current = recordWorldEvent(current, request.input);
        break;
      case "createResourceFlow":
        current = resources.createResourceFlow(current, request.input);
        break;
      case "recordResourceTransferOutcome":
        current = resources.recordResourceTransferOutcome(
          current,
          request.input,
        );
        break;
    }
    step = gen.next(financeFacts(current));
  }
  return { world: current, result: step.value };
}
