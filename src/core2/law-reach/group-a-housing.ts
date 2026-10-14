/**
 * Law reach, group A: housing laws the housing engine carries out. Allowing
 * more homes on single-family lots opens the town's residential land to
 * apartments (the housing engine's builders read it each month); a right to
 * counsel in eviction makes the government that passed it pay a tenant's
 * lawyer in every eviction case the housing engine opens.
 */
import type { PolicyHandler } from "../modules/law-effects";
import { lawChain } from "../modules/laws";
import {
  HOUSING_MODULE_ID,
  setHousingZoning,
  setRightToCounsel,
} from "../modules/housing";
import { openingZoning } from "../housing-construction";
import { reachParameter, yesLevels } from "./group-a-records";
import { governmentFor } from "./group-a-money";

export const MULTIFAMILY_KEY =
  "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones";
export const COUNSEL_KEY =
  "us-policy-positions:housing-land-use.right-to-counsel-in-eviction";

export const multifamilyZoning: PolicyHandler = (api, change) => {
  if (!api.state.modules.has(HOUSING_MODULE_ID)) return;
  setHousingZoning(api, lawChain(api).townPlaceId, {
    multifamilyLandShare: change.inForce
      ? reachParameter("multifamilyAllowedLandShare")
      : openingZoning().multifamilyLandShare,
  });
};

export const rightToCounsel: PolicyHandler = (api, change) => {
  if (!api.state.modules.has(HOUSING_MODULE_ID)) return;
  const gov = change.inForce
    ? governmentFor(api, yesLevels(api, COUNSEL_KEY))
    : null;
  setRightToCounsel(
    api,
    lawChain(api).townPlaceId,
    gov !== null,
    gov?.organizationId,
  );
};
