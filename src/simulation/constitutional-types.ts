import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeVoteRecord,
} from "./types";
import type { VoteThresholdRule } from "./legislature-rules";
import type {
  AmendableRuleField,
  RuleChangeApplicability,
  RuleChangeValue,
} from "./enacted-rule-changes";

export type ConstitutionalProcessKind =
  | "federal-amendment"
  | "state-amendment"
  | "state-revision"
  | "municipal-charter";
export type ConstitutionalRuleDelta =
  | {
      readonly kind: "proposal-threshold";
      readonly numerator: number;
      readonly denominatorParts: number;
    }
  | {
      /** Changes one rule the game reads; see `enacted-rule-changes.ts`. */
      readonly kind: "rule-field";
      readonly officeKey: string;
      readonly field: AmendableRuleField;
      readonly value: RuleChangeValue;
      readonly applicability?: RuleChangeApplicability;
    }
  | {
      /**
       * Writes a policy into, or takes it out of, a state's constitution: one
       * proposition of the World's policy catalog. See `policy-provisions.ts`
       * for what it does and does not change.
       */
      readonly kind: "policy-provision";
      readonly propositionId: EntityId;
      readonly stance: PolicyProvisionStance;
    }
  | { readonly kind: "text-only"; readonly unsupportedEffect: string };
/** Whether an amendment puts a policy into the constitution or takes it out. */
export type PolicyProvisionStance = "adopt" | "repeal";
/** A narrow measure identity extension; ordinary bill records cannot enter this process. */
export interface ConstitutionalMeasureRecord extends Pick<
  LegislativeMeasureRecord,
  | "id"
  | "stableKey"
  | "sequence"
  | "jurisdictionId"
  | "designation"
  | "shortTitle"
  | "sponsorPersonId"
  | "introducedAt"
> {
  readonly processKind: ConstitutionalProcessKind;
  readonly jurisdictionKey: "US" | `US-${string}` | "us-nv-carson-city";
  readonly text: string;
  readonly textVersion: string;
  readonly sponsoringAuthority: string;
  readonly proposalRule: VoteThresholdRule | null;
  readonly sourceSha256: string;
  readonly ratificationMode:
    | "state-legislatures"
    | "state-conventions"
    | "statewide-electors"
    | "nevada-enactment";
  readonly deadlineAt: IsoDate | null;
  readonly delayedOperativeAt: IsoDate | null;
  readonly ruleDelta: ConstitutionalRuleDelta;
  readonly ordinaryMeasureId: EntityId | null;
  readonly provenance: "authored-game-proposal";
}
export interface ConstitutionalVoteRecord extends Omit<
  LegislativeVoteRecord,
  "purpose"
> {
  readonly purpose: "constitutional-proposal";
}
export type ConstitutionalActionDetail =
  | { readonly kind: "proposed" }
  | {
      readonly kind: "proposal-vote";
      /** A chamber key of the proposing legislature. */
      readonly bodyKey: string;
      readonly vote: ConstitutionalVoteRecord;
    }
  | {
      readonly kind: "state-ratification";
      readonly stateKey: string;
      readonly body: "state-legislature" | "state-convention";
      readonly approved: boolean;
      readonly authenticationKey: string;
    }
  | {
      readonly kind: "statewide-vote";
      readonly yes: number;
      readonly no: number;
      readonly electionAt: IsoDate;
      readonly statementFiledAt: IsoDate;
    }
  | { readonly kind: "charter-enactment"; readonly enactmentId: EntityId }
  | {
      readonly kind: "position";
      readonly personId: EntityId;
      readonly position: "support" | "oppose" | "undecided";
    };
export interface ConstitutionalActionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly occurredAt: IsoDate;
  readonly eventId: EntityId;
  readonly detail: ConstitutionalActionDetail;
}
export interface ConstitutionalRuleVersionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly jurisdictionKey: "US" | `US-${string}`;
  readonly measureId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly operativeAt: IsoDate;
  readonly threshold: VoteThresholdRule;
}
