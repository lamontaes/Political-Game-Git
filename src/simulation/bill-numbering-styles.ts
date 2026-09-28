import {
  DEFAULT_LOWER_NAME,
  DEFAULT_LOWER_TEMPLATE,
  DEFAULT_UPPER_NAME,
  DEFAULT_UPPER_TEMPLATE,
  type ChamberNumberingStyle,
  type StateBillNumberingStyle,
} from "./bill-numbering-derivation";
import { STATE_BILL_NUMBERING_STYLES } from "./bill-numbering-styles.generated";

/**
 * Each state's own bill prefixes, chamber names and numbering period, read
 * from the recorded research (decision OCD-LEG-NUM-001). The table is
 * generated; this is how the rest of the game asks it.
 */

const BY_KEY = new Map(
  STATE_BILL_NUMBERING_STYLES.map((style) => [style.jurisdictionKey, style]),
);

/**
 * The labeled game default for a place with no recorded pattern: the plain
 * American prefixes, a House and a Senate, numbering by the year.
 */
export function gameDefaultBillNumberingStyle(
  jurisdictionKey: string,
): StateBillNumberingStyle {
  return {
    jurisdictionKey,
    lower: {
      template: DEFAULT_LOWER_TEMPLATE,
      templateBasis: "game-default",
      name: DEFAULT_LOWER_NAME,
      nameBasis: "game-default",
    },
    upper: {
      template: DEFAULT_UPPER_TEMPLATE,
      templateBasis: "game-default",
      name: DEFAULT_UPPER_NAME,
      nameBasis: "game-default",
    },
    period: "annual",
    biennialOpensIn: "odd",
    periodBasis: "game-default",
  };
}

/** A state's numbering style, or null where the research records none. */
export function recordedStateBillNumberingStyle(
  jurisdictionKey: string,
): StateBillNumberingStyle | null {
  return BY_KEY.get(jurisdictionKey) ?? null;
}

/** A state's numbering style, falling back to the labeled game default. */
export function stateBillNumberingStyle(
  jurisdictionKey: string,
): StateBillNumberingStyle {
  return (
    recordedStateBillNumberingStyle(jurisdictionKey) ??
    gameDefaultBillNumberingStyle(jurisdictionKey)
  );
}

/**
 * Which side of a state legislature a chamber key is. A unicameral body
 * numbers the way its recorded ("lower") samples do.
 */
export function stateChamberStyle(
  style: StateBillNumberingStyle,
  chamberKey: string,
): ChamberNumberingStyle {
  return chamberKey === "senate" ? style.upper : style.lower;
}

/** The prefix a template opens with: "HB" from "HB {n}", "H." from "H.{n}". */
export function templatePrefix(template: string): string {
  return template.split("{")[0]!.trim().replace(/-$/, "");
}
