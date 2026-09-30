import type { EntityId, IsoDate } from "./types";
export interface VoterIdentificationRecord {
  readonly personId: EntityId;
  readonly estimatedCurrentId: boolean;
  readonly acquiredOn: IsoDate | null;
  readonly stateKey: string;
  readonly basis: string;
}
export interface VoterIdTripRecord {
  readonly key: string;
  readonly personId: EntityId;
  readonly stateKey: string;
  readonly on: IsoDate;
  readonly costCents: number;
  readonly missedWork: readonly {
    workRelationshipId: EntityId;
    minutes: number;
  }[];
  readonly reason: string;
}
export interface VoterIdentificationStore {
  readonly people: Readonly<Record<string, VoterIdentificationRecord>>;
  readonly trips: readonly VoterIdTripRecord[];
  readonly ballots?: readonly IdentifiedBallot[];
}
export interface IdentifiedBallot {
  readonly key: string;
  readonly contestId: EntityId;
  readonly personId: EntityId;
  readonly candidatePersonId: EntityId;
  readonly castOn: IsoDate;
  readonly kind: "regular" | "provisional";
  readonly cureBy: IsoDate | null;
  readonly curedOn: IsoDate | null;
  readonly cureReason?: string;
  readonly eligibilityReason: string;
  readonly choiceReason: string;
}
