import type { EntityId, IsoDate } from "./types";
export interface ImmigrationAdmission {
  readonly key: string;
  readonly measureId: EntityId;
  readonly stateKey: string;
  readonly townId: EntityId;
  readonly arrivedOn: IsoDate;
  readonly householdIndex: number;
  readonly personIds: readonly EntityId[];
  readonly basis: string;
}
