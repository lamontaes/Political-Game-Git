/** Complete retained household home/tenure/pay-carry selection and necessary kind/price/decision constants. */
import type {
  DwellingClassification,
  HousingTenureKind,
} from "../../simulation/types";
// STOPGAP: economy.home-choice-native-thresholds
export const TOWN_HOME_KINDS = {
  "small-apartment": "residential:apartment",
  rowhouse: "residential:rowhouse",
  "suburban-house": "residential:house",
  "large-house": "residential:large-house",
  "mobile-home": "residential:mobile-home",
  "rural-farmhouse": "residential:farmhouse",
} as const satisfies Record<string, DwellingClassification>;
export type TownHomeKind = keyof typeof TOWN_HOME_KINDS;
export const TOWN_TENURE_KINDS = {
  rented: "lease:rented",
  owned: "ownership:owned",
  mortgaged: "ownership:mortgaged",
} as const satisfies Record<string, HousingTenureKind>;
export const TOWN_HOME_DECISIONS = {
  buyAtPayOfPayment: 1 / 0.28,
  severeRentBurden: 0.5,
  downsizeFromAge: 65,
  evictionOnRecordDays: 7 * 365,
} as const;
export const TOWN_HOME_PRICE_FACTOR: Readonly<Record<TownHomeKind, number>> = {
  "small-apartment": 0.6,
  rowhouse: 0.8,
  "suburban-house": 1,
  "large-house": 1.6,
  "mobile-home": 0.35,
  "rural-farmhouse": 1,
};
export function homeForNewHousehold(
  household: {
    readonly members: readonly {
      readonly age: number;
    }[];
  },
  working: boolean,
  payMinor: number | null,
  paymentMinor: number | null,
  mayBorrow = true,
  farm = false,
): {
  readonly kind: TownHomeKind;
  readonly tenure: HousingTenureKind;
} {
  const head = Math.max(0, ...household.members.map((member) => member.age));
  const carries = (kind: TownHomeKind) =>
    mayBorrow &&
    working &&
    paymentMinor !== null &&
    payMinor !== null &&
    payMinor >=
      paymentMinor *
        TOWN_HOME_PRICE_FACTOR[kind] *
        TOWN_HOME_DECISIONS.buyAtPayOfPayment;
  const tenure =
    head < 60 ? TOWN_TENURE_KINDS.mortgaged : TOWN_TENURE_KINDS.owned;
  if (farm && carries("rural-farmhouse"))
    return { kind: "rural-farmhouse", tenure };
  if (household.members.length >= 5 && carries("large-house"))
    return { kind: "large-house", tenure };
  if (carries("suburban-house")) return { kind: "suburban-house", tenure };
  if (carries("mobile-home")) return { kind: "mobile-home", tenure };
  return {
    kind: household.members.length <= 2 ? "small-apartment" : "rowhouse",
    tenure: TOWN_TENURE_KINDS.rented,
  };
}
