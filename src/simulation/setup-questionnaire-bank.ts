import type {
  AmbiguityDeclaration,
  DimensionNudge,
  HypothesisSupport,
} from "./player-model";
import type { LifeVoiceBand } from "./voice-bands";

/** The fixed opening questionnaire has been withdrawn from play. These types
 * remain for old answer records and for a future grounded calibration route. */
export const SETUP_BANK_VERSION = "pg-setup-bank-v5-text39";

export interface AuthoredSource {
  readonly sourceDocument: string;
  readonly reference: string;
}
export type TransparencyVerdict =
  "non-transparent" | "policy-docket-flagged" | "playtest-abstraction-flagged";
export type QuestionnaireRegister =
  | "lived-personal"
  | "lived-relational"
  | "lived-moral"
  | "civic-lived"
  | "policy-lived"
  | "policy-docket";
export interface TransparencyReview {
  readonly verdict: TransparencyVerdict;
  readonly note: string;
}
export interface QuestionnaireOption {
  readonly key: string;
  readonly text: string;
  readonly nudges: readonly DimensionNudge[];
  readonly hypotheses: readonly HypothesisSupport[];
  readonly ambiguity: AmbiguityDeclaration | null;
}
export type SetupRelationshipContext =
  | "adult-at-home"
  | "sibling"
  | "friend"
  | "classmate"
  | "teacher"
  | "neighbor"
  | "coworker"
  | "boss"
  | "partner";
export type SetupSceneContext =
  | "home"
  | "school"
  | "workplace"
  | "street"
  | "shop"
  | "public-meeting"
  | "institution";
export type SetupAgencyKey =
  | "answers-for-themselves"
  | "paid-work"
  | "responsible-for-somebody"
  | "in-school";
export interface QuestionnaireEligibility {
  readonly bands: readonly LifeVoiceBand[];
  readonly agency: readonly SetupAgencyKey[];
  readonly relationships: readonly SetupRelationshipContext[];
  readonly settings: readonly SetupSceneContext[];
}
export interface QuestionnaireItem {
  readonly key: string;
  readonly source: AuthoredSource;
  readonly review: TransparencyReview;
  readonly register: QuestionnaireRegister;
  readonly fixedOrdinal: number | null;
  readonly followUpTo?: {
    readonly questionKey: string;
    readonly choiceId: string;
  };
  readonly prompt: string;
  readonly options: readonly QuestionnaireOption[];
  readonly observationWeight: number;
  readonly eligibility: QuestionnaireEligibility;
}

export const WITHDRAWN_SETUP_ITEMS: readonly QuestionnaireItem[] = [];
export const ALL_AUTHORED_SETUP_ITEMS: readonly QuestionnaireItem[] = [];
export const SETUP_QUESTIONNAIRE_BANK: readonly QuestionnaireItem[] = [];
export const FIXED_OPENING_KEYS_BY_BAND: Readonly<
  Record<LifeVoiceBand, readonly string[]>
> = { "middle-childhood": [], adolescence: [], adult: [] };
export const FIXED_OPENING_KEYS: readonly string[] = [];
