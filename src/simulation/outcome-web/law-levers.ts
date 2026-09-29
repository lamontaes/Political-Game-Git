import { RENT_LAW_KEYS } from "../living-world/town-rent";
import {
  HOUSING_SUPPLY_LAW_EFFECT,
  HOUSING_SUPPLY_LAWS,
} from "../living-world/housing-market";

/**
 * Laws that act in the world through their own area's records rather than
 * through a link in the outcome web: "laws move levers, levers move their own
 * area's measures". Each lever names the question, the file whose code reads
 * the law in force and changes money, people or places, and what it moves.
 * A lever is listed only where that code runs in the watched world and both
 * directions work: repealing the law undoes the change from then on.
 */
export interface LawLever {
  /** The qualified policy question (`<pack>:<question key>`). */
  readonly question: string;
  /** The file whose code acts on the law in force. */
  readonly module: string;
  /** What changes, in plain words. */
  readonly moves: string;
}

const HOUSING_SUPPLY_MOVES = `the town's home prices, and the rents that follow them, from a year after it takes effect: about ${Math.round((1 - Math.exp(HOUSING_SUPPLY_LAW_EFFECT.fiveYearLogChange)) * 100)}% lower five years on than without it`;

export const LAW_LEVERS: readonly LawLever[] = [
  {
    question: RENT_LAW_KEYS.rightToCounsel,
    module: "living-world/town-rent.ts",
    moves:
      "a tenant who answers an eviction case gets a lawyer, who keeps the home up to four months behind or on a plan the household's pay carries",
  },
  {
    question: RENT_LAW_KEYS.rentStabilization,
    module: "living-world/town-rent.ts",
    moves:
      "a covered renewal is held to the general price rise plus five points, at most 10%",
  },
  ...HOUSING_SUPPLY_LAWS.map((question) => ({
    question,
    module: "living-world/housing-market.ts",
    moves: HOUSING_SUPPLY_MOVES,
  })),
];

/** The levers that act on a policy question. */
export function lawLeversFor(question: string): readonly LawLever[] {
  return LAW_LEVERS.filter((lever) => lever.question === question);
}
