/**
 * Links of the outcome web's prices, credit and place-services family that no
 * engine can carry yet. Each marker below is a registered stopgap that names
 * what is missing; the sites that can carry a link read the web directly
 * (finance-state.ts for prices, place-prices.ts for electricity, transit trips
 * and broadband subscriptions).
 */
import type { CoreAPI } from "../types";

export function registerPricesWebGaps(api: CoreAPI): void {
  api.stopgap("SG-EFFECT-WEB-prices-gov-borrowing");
  api.stopgap("SG-EFFECT-WEB-prices-high-cost-loans");
  api.stopgap("SG-EFFECT-WEB-prices-roads-condition");
  api.stopgap("SG-EFFECT-WEB-prices-transit-service");
  api.stopgap("SG-EFFECT-WEB-prices-rail-ridership");
  api.stopgap("SG-EFFECT-WEB-prices-past-due-debt");
  api.stopgap("SG-EFFECT-WEB-prices-nondisaster-transfers");
}
