import type { LawEffectStampedRecord } from "./law-effect-stamp";
import type { EntityId, IsoDate } from "./types";
export interface LibraryChallenge {
  readonly key: string;
  readonly townId: EntityId;
  readonly personId: EntityId;
  readonly titleKey: string;
  readonly filedOn: IsoDate;
  readonly reason: string;
  readonly principleRecordIds: readonly EntityId[];
  readonly faithParticipationIds: readonly EntityId[];
  readonly schoolChildIds: readonly EntityId[];
}
export interface LibraryDecision extends LawEffectStampedRecord {
  readonly challengeKey: string;
  readonly meetingKey: string;
  readonly on: IsoDate;
  readonly authority: "local" | "state";
  readonly authorityReason: string;
  readonly ballots: readonly {
    personId: EntityId;
    remove: boolean;
    score: number;
    principleRecordIds: readonly EntityId[];
    reason: string;
  }[];
  readonly removed: boolean;
  readonly staffHours: number;
  readonly legalHours: number;
  readonly expenseCents: number;
}
export interface LibraryMaterialsStore {
  readonly challenges: readonly LibraryChallenge[];
  readonly decisions: readonly LibraryDecision[];
}
