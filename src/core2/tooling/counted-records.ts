/**
 * Counted households as the old per-person records, for tests and proof
 * scripts only (pool item core-counted-views-delete): nothing in play reads a
 * counted household through a record; engines read the groups' columns.
 */
import type { CountedHousehold, CountedStore } from "../counted-groups";
import { residentsRuntime } from "../modules/residents";
import type { FinanceContractInput } from "../finance-types";
import type { ResidentHouseholdRecord } from "../residents";
import type {
  CoreState,
  HouseholdInput,
  JobInput,
  PersonId,
  PersonInput,
  WorkCommitmentInput,
} from "../types";

/** A household seen as the old per-person record, its people built on first read. */
class HouseholdView implements ResidentHouseholdRecord {
  constructor(
    private readonly store: CountedStore,
    private readonly h: CountedHousehold,
  ) {}
  get household(): HouseholdInput {
    return {
      id: this.h.id,
      placeId: this.h.placeId,
      memberIds: this.store
        .countedMembers(this.h)
        .map((m) => this.store.ids[m]!),
      source: this.h.source,
    };
  }
  get people(): readonly PersonInput[] {
    return this.store.peopleOf(this.h);
  }
  get jobs(): readonly JobInput[] {
    return this.h.jobs;
  }
  get workCommitments(): readonly WorkCommitmentInput[] {
    return this.h.workCommitments;
  }
  get contracts(): readonly FinanceContractInput[] {
    return this.h.incomeContracts;
  }
}

/** The counted households as a read-only map by household id (readers of the old records). */
class CountedHouseholdMap implements ReadonlyMap<
  string,
  ResidentHouseholdRecord
> {
  constructor(private readonly store: CountedStore) {}
  get size(): number {
    let n = 0;
    for (const h of this.store.liveHouseholds()) n += h.gone ? 0 : 1;
    return n;
  }
  private live(id: string): CountedHousehold | undefined {
    const ix = this.store.householdOf.get(id);
    const h = ix === undefined ? undefined : this.store.households[ix];
    return h && !h.gone ? h : undefined;
  }
  get(id: string): ResidentHouseholdRecord | undefined {
    const h = this.live(id);
    return h ? new HouseholdView(this.store, h) : undefined;
  }
  has(id: string): boolean {
    return this.live(id) !== undefined;
  }
  *entries(): MapIterator<[string, ResidentHouseholdRecord]> {
    for (const h of this.store.liveHouseholds())
      yield [h.id, new HouseholdView(this.store, h)];
  }
  *keys(): MapIterator<string> {
    for (const h of this.store.liveHouseholds()) yield h.id;
  }
  *values(): MapIterator<ResidentHouseholdRecord> {
    for (const h of this.store.liveHouseholds())
      yield new HouseholdView(this.store, h);
  }
  [Symbol.iterator](): MapIterator<[string, ResidentHouseholdRecord]> {
    return this.entries();
  }
  forEach(
    fn: (
      value: ResidentHouseholdRecord,
      key: string,
      map: ReadonlyMap<string, ResidentHouseholdRecord>,
    ) => void,
  ): void {
    for (const [key, value] of this.entries()) fn(value, key, this);
  }
}

/** Counted person id to household id (readers of the old index). */
class CountedPersonHouseholdMap implements ReadonlyMap<PersonId, string> {
  constructor(private readonly store: CountedStore) {}
  get size(): number {
    let n = 0;
    for (let m = 0; m < this.store.memberCount; m++)
      if (this.store.isCounted(m)) n++;
    return n;
  }
  get(id: PersonId): string | undefined {
    const m = this.store.countedMember(id);
    return m === undefined
      ? undefined
      : this.store.households[this.store.household[m]!]!.id;
  }
  has(id: PersonId): boolean {
    return this.store.countedMember(id) !== undefined;
  }
  *entries(): MapIterator<[PersonId, string]> {
    for (let m = 0; m < this.store.memberCount; m++)
      if (this.store.isCounted(m))
        yield [
          this.store.ids[m]!,
          this.store.households[this.store.household[m]!]!.id,
        ];
  }
  *keys(): MapIterator<PersonId> {
    for (const [key] of this.entries()) yield key;
  }
  *values(): MapIterator<string> {
    for (const [, value] of this.entries()) yield value;
  }
  [Symbol.iterator](): MapIterator<[PersonId, string]> {
    return this.entries();
  }
  forEach(
    fn: (
      value: string,
      key: PersonId,
      map: ReadonlyMap<PersonId, string>,
    ) => void,
  ): void {
    for (const [key, value] of this.entries()) fn(value, key, this);
  }
}

/** The counted households of a world, by household id, as records. */
export function countedRecords(
  core: CoreState,
): ReadonlyMap<string, ResidentHouseholdRecord> {
  return new CountedHouseholdMap(residentsRuntime(core)!.store);
}

/** The counted person to household id index of a world. */
export function countedHouseholdOfPerson(
  core: CoreState,
): ReadonlyMap<PersonId, string> {
  return new CountedPersonHouseholdMap(residentsRuntime(core)!.store);
}
