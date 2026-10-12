/** Until the credit engine (M1-06) writes real lines, one named business gets a prime-linked line for proofs. */
import { linkCreditLineToPrime } from "./modules/macro";
import { stopgap } from "./stopgaps";
import type { CoreAPI, Source } from "./types";

export function standInPrimeLine(
  api: CoreAPI,
  borrowerId: string,
  lenderId: string,
  limitMinor: number,
  spreadPct: number,
): string {
  stopgap("SG-WORLD-credit-line-stand-in");
  const id = `facility:stand-in:${borrowerId}`;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "Federal Reserve Survey of Terms of Business Lending: small business lines price at prime plus a spread.",
    estimatedFrom: "One stand-in line for the M1-02 proof until M1-06 credit.",
  };
  api.addCreditFacility({
    id,
    borrowerId,
    lenderId,
    limitMinor,
    active: true,
    annualInterestParameter: "zero",
    source,
  });
  linkCreditLineToPrime(api, id, spreadPct, source);
  return id;
}
