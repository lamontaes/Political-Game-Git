/**
 * The counted tier of one model, two tiers (owner, Oct 14, 2026; see
 * docs/design/one-model-two-tiers.md). Everyone a place holds who is not a
 * full person is in a counted group: one record per place, district,
 * household kind, income band, tenure and head's age band and work, with
 * its households and its members' identities kept as packed columns. A
 * member is an id, a name, a birth date, a sex, traits (small whole numbers)
 * and a household; nothing else about them exists until they are filled in
 * (no past, no ties outside the household, no sources of their own).
 *
 * Engines that still read counted people one by one get a record built from
 * these columns on demand (`personInput`, `householdView`): the stopgap
 * SG-CORE-counted-person-views, retired engine by engine as each reads groups.
 */
import { stopgap } from "./stopgaps";
import type { FinanceContractInput } from "./finance-types";
import type { ResidentHouseholdRecord } from "./residents";
import type {
  HouseholdInput,
  IsoDate,
  JobInput,
  PersonId,
  PersonInput,
  PlaceId,
  Source,
  WorkCommitmentInput,
} from "./types";

export const COUNTED_VIEWS_STOPGAP = "SG-CORE-counted-person-views";

/**
 * A full person returned to the counts (demoted) keeps their record, on the
 * inactive tier, at their place's counted tier: `counted:<place id>`.
 */
export const COUNTED_PLACE_PREFIX = "counted:";
export const countedPlaceOf = (placeId: string) =>
  `${COUNTED_PLACE_PREFIX}${placeId}`;
export function isDemoted(person: { readonly placeId: string }): boolean {
  return person.placeId.startsWith(COUNTED_PLACE_PREFIX);
}

/** A member's place in the counts. */
export const enum MemberState {
  Counted = 0,
  Filled = 1,
  Dead = 2,
  Moved = 3,
}

export type HouseholdKind = "one-adult" | "adults" | "with-children";
export type Tenure = "rent" | "mortgage" | "other";
export type HeadWork = "working" | "retired" | "not-working";

export interface GroupKey {
  readonly placeId: PlaceId;
  readonly district: string;
  readonly kind: HouseholdKind;
  /** 0 to 4: the national household-income fifth. */
  readonly incomeBand: number;
  readonly tenure: Tenure;
  /** The head's age band (`AGE_BANDS`). */
  readonly ageBand: string;
  readonly work: HeadWork;
}

export interface CountedGroup extends GroupKey {
  readonly index: number;
  readonly id: string;
  /** Household indices still counted in this group. */
  readonly households: Set<number>;
}

export interface CountedHousehold {
  readonly index: number;
  readonly id: string;
  placeId: PlaceId;
  group: number;
  /** Member indices, counted or not (fill-in takes the whole household). */
  members: number[];
  /** Pairs of member indices who are family to each other, flattened. */
  kin: number[];
  jobs: JobInput[];
  workCommitments: WorkCommitmentInput[];
  /** Retirement awards paid to a member (the rest of its spending is in the flows). */
  incomeContracts: FinanceContractInput[];
  source: Source;
  /** Yearly pay from recorded counted jobs, and retirement awards. */
  wagesMinorYear: number;
  retirementMinorYear: number;
  /** Working-age members the opening's employment target puts to work outside a recorded job. */
  unplacedWorkers: number;
  tenure: Tenure;
  /**
   * How many real households this record stands for (a town opened at its
   * Census count carries a sample of its households; absent means one).
   * Every reader of a count multiplies by it (`CountedStore.weightOf`).
   */
  weight?: number;
  /** The district it lives in, where its place has districts. */
  district?: string;
  /** Bumped when its members or their records change (readers' cached views go stale). */
  rev?: number;
  gone?: true;
}

/** Head-of-household age bands used for keys; the first that fits from the top. */
export const AGE_BANDS = [
  [65, "65-plus"],
  [45, "45-64"],
  [30, "30-44"],
  [18, "18-29"],
  [0, "under-18"],
] as const;

export function ageBandOf(age: number): string {
  return AGE_BANDS.find(([min]) => age >= min)![1];
}

export function ageOn(birthDate: string, date: string): number {
  return (
    Number(date.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (date.slice(5) < birthDate.slice(5) ? 1 : 0)
  );
}

export function groupId(key: GroupKey): string {
  return [
    "group",
    key.placeId,
    key.district,
    key.kind,
    `income-${key.incomeBand}`,
    key.tenure,
    key.ageBand,
    key.work,
  ].join(":");
}

/** Grows a typed array by doubling. */
function grown<T extends Int8Array | Uint8Array>(
  array: T,
  need: number,
  make: (size: number) => T,
): T {
  if (need <= array.length) return array;
  let size = Math.max(16, array.length);
  while (size < need) size *= 2;
  const next = make(size);
  next.set(array);
  return next;
}

/** Where a packed trait reader keeps its member (a symbol: not a trait key to for...in). */
const MEMBER = Symbol("member");

/**
 * A trait record read straight from the packed columns: `traits[key]` reads
 * the member's value, with no object per trait. Built once per store.
 */
export interface PackedTraits {
  readonly [key: string]: number;
}

export class CountedStore {
  // Member columns.
  readonly ids: string[] = [];
  readonly given: string[] = [];
  readonly family: string[] = [];
  readonly born: string[] = [];
  readonly household: number[] = [];
  readonly living: number[] = [];
  /** Opening cash, until each group holds its own account (SG-CORE-counted-cash-share). */
  readonly liquid: number[] = [];
  readonly jobId: (string | undefined)[] = [];
  readonly appearance: (string | undefined)[] = [];
  /** Interned: place, county, gender, pronouns, recipe, tier. */
  readonly placeIx: number[] = [];
  readonly countyIx: number[] = [];
  readonly genderIx: number[] = [];
  readonly pronounsIx: number[] = [];
  readonly recipeIx: number[] = [];
  readonly tierIx: number[] = [];
  state = new Uint8Array(0);
  traits = new Int8Array(0);
  readonly traitNames: string[] = [];
  readonly traitIndex = new Map<string, number>();
  readonly strings: string[] = [""];
  readonly stringIndex = new Map<string, number>([["", 0]]);
  readonly memberOf = new Map<PersonId, number>();
  /** One shared trait source per place (who exists is generated). */
  readonly traitSourceByPlace = new Map<PlaceId, Source>();

  readonly households: CountedHousehold[] = [];
  readonly householdOf = new Map<string, number>();
  readonly groups: CountedGroup[] = [];
  readonly groupOf = new Map<string, number>();
  private traitView?: new (member: number) => PackedTraits;
  /** One in-place trait reader per member, made on first read and kept (readers cache by record). */
  private readonly traitViews: (PackedTraits | undefined)[] = [];
  /** Members packed from the opening (later ones were born or moved in during play). */
  openingMembers = 0;
  /** Each household's people as records, kept until the household changes (`touch`). */
  private readonly peopleViews = new Map<
    number,
    { rev: number; people: readonly PersonInput[] }
  >();
  /** Bumped by every change to who is counted or how they are grouped. */
  version = 0;
  /** Bumped only when someone joins or leaves the counts (not on a regroup). */
  membersVersion = 0;

  constructor(traitNames: readonly string[] = []) {
    for (const name of traitNames) this.traitSlot(name);
  }

  get memberCount(): number {
    return this.ids.length;
  }

  intern(value: string | undefined): number {
    if (value === undefined) return 0;
    let ix = this.stringIndex.get(value);
    if (ix === undefined) {
      ix = this.strings.length;
      this.strings.push(value);
      this.stringIndex.set(value, ix);
    }
    return ix;
  }

  text(ix: number): string | undefined {
    return ix ? this.strings[ix] : undefined;
  }

  private traitSlot(name: string): number {
    let ix = this.traitIndex.get(name);
    if (ix !== undefined) return ix;
    if (this.ids.length)
      throw new Error(`A trait was added after members were packed: ${name}`);
    ix = this.traitNames.length;
    this.traitNames.push(name);
    this.traitIndex.set(name, ix);
    return ix;
  }

  /** Make room for every trait a batch of people carries, before packing any. */
  addTraitNames(people: Iterable<PersonInput>): void {
    for (const person of people)
      for (const name of Object.keys(person.traits))
        if (!this.traitIndex.has(name)) this.traitSlot(name);
  }

  /** Pack one person as a counted member of household `household`. */
  addMember(person: PersonInput, household: number): number {
    this.version++;
    this.membersVersion++;
    const m = this.ids.length;
    const width = this.traitNames.length;
    this.ids.push(person.id);
    this.given.push(person.givenName);
    this.family.push(person.familyName);
    this.born.push(person.birthDate);
    this.household.push(household);
    this.living.push(person.livingCostDailyMinor);
    this.liquid.push(person.liquidMinor);
    this.jobId.push(person.jobId);
    this.appearance.push(person.looks?.appearanceSeed);
    this.placeIx.push(this.intern(person.placeId));
    this.countyIx.push(this.intern(person.countyId));
    this.genderIx.push(this.intern(person.looks?.gender));
    this.pronounsIx.push(this.intern(person.looks?.pronouns));
    this.recipeIx.push(this.intern(person.looks?.recipeVersion));
    this.tierIx.push(this.intern(person.tier));
    this.state = grown(this.state, m + 1, (n) => new Uint8Array(n));
    this.state[m] = MemberState.Counted;
    this.traits = grown(this.traits, (m + 1) * width, (n) => new Int8Array(n));
    for (const [name, value] of Object.entries(person.traits)) {
      const ix = this.traitIndex.get(name);
      if (ix === undefined)
        throw new Error(`Unknown trait for a counted member: ${name}`);
      if (!Number.isInteger(value) || value < -127 || value > 127)
        throw new Error(`A counted trait is not a small whole number: ${name}`);
      this.traits[m * width + ix] = value;
    }
    if (
      person.sharedTraitSource &&
      !this.traitSourceByPlace.has(person.placeId)
    )
      this.traitSourceByPlace.set(person.placeId, person.sharedTraitSource);
    this.memberOf.set(person.id, m);
    const h = this.households[household];
    if (h) this.touch(h);
    return m;
  }

  trait(member: number, name: string): number | undefined {
    const ix = this.traitIndex.get(name);
    return ix === undefined
      ? undefined
      : this.traits[member * this.traitNames.length + ix];
  }

  /** A member's traits as a plain record (for a filled-in person or a reader that copies). */
  traitRecord(member: number): Record<string, number> {
    const width = this.traitNames.length,
      base = member * width,
      out: Record<string, number> = {};
    for (let i = 0; i < width; i++)
      out[this.traitNames[i]!] = this.traits[base + i]!;
    return out;
  }

  /** A member's traits read in place from the columns. */
  packedTraits(member: number): PackedTraits {
    if (!this.traitView) {
      const traits = () => this.traits;
      const width = () => this.traitNames.length;
      const View = function (this: { [MEMBER]: number }, m: number) {
        this[MEMBER] = m;
      } as unknown as new (member: number) => PackedTraits;
      this.traitNames.forEach((name, ix) =>
        Object.defineProperty(View.prototype, name, {
          get(this: { [MEMBER]: number }) {
            return traits()[this[MEMBER] * width() + ix];
          },
          enumerable: true,
        }),
      );
      this.traitView = View;
    }
    return (this.traitViews[member] ??= new this.traitView(member));
  }

  isCounted(member: number): boolean {
    return this.state[member] === MemberState.Counted;
  }

  /** The counted member behind a person id, if they are still counted. */
  countedMember(personId: PersonId): number | undefined {
    const m = this.memberOf.get(personId);
    return m !== undefined && this.isCounted(m) ? m : undefined;
  }

  group(key: GroupKey): CountedGroup {
    const id = groupId(key);
    let ix = this.groupOf.get(id);
    if (ix === undefined) {
      ix = this.groups.length;
      this.groups.push({ ...key, index: ix, id, households: new Set() });
      this.groupOf.set(id, ix);
    }
    return this.groups[ix]!;
  }

  /** A household's members or their records changed. */
  touch(h: CountedHousehold): void {
    h.rev = (h.rev ?? 0) + 1;
    this.peopleViews.delete(h.index);
  }

  /** A household's counted people as records (in-place traits), built once per change. */
  peopleOf(h: CountedHousehold): readonly PersonInput[] {
    const held = this.peopleViews.get(h.index);
    if (held && held.rev === (h.rev ?? 0)) return held.people;
    const people = this.countedMembers(h).map((m) =>
      this.personInput(m, "packed"),
    );
    this.peopleViews.set(h.index, { rev: h.rev ?? 0, people });
    return people;
  }

  /** How many members of a household are still counted, without a list. */
  countedCount(h: CountedHousehold): number {
    let n = 0;
    for (const m of h.members) if (this.state[m] === MemberState.Counted) n++;
    return n;
  }

  /** How many real households a record stands for (one unless the opening gave it a weight). */
  weightOf(h: CountedHousehold): number {
    return h.weight ?? 1;
  }

  /** The people a household record stands for: its counted members times its weight. */
  weightedCount(h: CountedHousehold): number {
    return this.countedCount(h) * (h.weight ?? 1);
  }

  /**
   * Every counted person in a place, weighted. A fill-in or a move out
   * changes it; a place with no weights gives its plain count.
   */
  weightedPeople(placeId: PlaceId): number {
    let n = 0;
    for (const h of this.liveHouseholds())
      if (h.placeId === placeId) n += this.weightedCount(h);
    return n;
  }

  /**
   * A household record leaves the counts as one real household (filled in):
   * the rest of the households it stood for go to the other households of
   * its group, or of its place when it was alone in the group, so the people
   * counted stay the same. Returns the people that had nowhere to go.
   */
  releaseWeight(h: CountedHousehold): number {
    const rest = this.weightOf(h) - 1;
    if (rest <= 0) return 0;
    const people = rest * this.countedCount(h);
    if (people <= 0) return 0;
    const near = (pool: Iterable<CountedHousehold>) => {
      const targets: CountedHousehold[] = [];
      let size = 0;
      for (const other of pool) {
        if (other === h || other.gone) continue;
        const n = this.countedCount(other);
        if (!n) continue;
        targets.push(other);
        size += n;
      }
      return { targets, size };
    };
    const group = h.group >= 0 ? this.groups[h.group] : undefined;
    let found = near(
      [...(group?.households ?? [])].map((i) => this.households[i]!),
    );
    if (!found.size)
      found = near(
        [...this.liveHouseholds()].filter((x) => x.placeId === h.placeId),
      );
    if (!found.size) return people;
    const added = people / found.size;
    this.version++;
    for (const other of found.targets)
      other.weight = this.weightOf(other) + added;
    return 0;
  }

  /** A household still counted, by id. */
  liveHousehold(id: string): CountedHousehold | undefined {
    const ix = this.householdOf.get(id);
    const h = ix === undefined ? undefined : this.households[ix];
    return h && !h.gone ? h : undefined;
  }

  /** The ids of a household's counted members. */
  memberIdsOf(h: CountedHousehold): PersonId[] {
    return this.countedMembers(h).map((m) => this.ids[m]!);
  }

  /** Counted members of a household (the ones not filled in, dead or moved). */
  countedMembers(h: CountedHousehold): number[] {
    return h.members.filter((m) => this.isCounted(m));
  }

  /** Every household still counted, in record order. */
  *liveHouseholds(): Iterable<CountedHousehold> {
    for (const h of this.households) if (!h.gone) yield h;
  }

  /**
   * A counted member as a person record, built from the columns now. Its
   * traits are read in place (`packed`) for readers that only look values
   * up; a record that becomes a full person takes a plain copy.
   */
  personInput(
    member: number,
    traits: "plain" | "packed" = "plain",
  ): PersonInput {
    stopgap(COUNTED_VIEWS_STOPGAP);
    const h = this.households[this.household[member]!]!;
    const familyIds: PersonId[] = [];
    const kin = h.kin;
    for (let i = 0; i < kin.length; i += 2) {
      if (kin[i] === member) familyIds.push(this.ids[kin[i + 1]!]!);
      else if (kin[i + 1] === member) familyIds.push(this.ids[kin[i]!]!);
    }
    if (familyIds.length > 1) familyIds.sort();
    const placeId = this.strings[this.placeIx[member]!]!;
    const looks: Record<string, string> = {};
    const gender = this.genderIx[member]!,
      pronouns = this.pronounsIx[member]!,
      recipe = this.recipeIx[member]!,
      appearance = this.appearance[member];
    if (gender) looks.gender = this.strings[gender]!;
    if (pronouns) looks.pronouns = this.strings[pronouns]!;
    if (appearance) looks.appearanceSeed = appearance;
    if (recipe) looks.recipeVersion = this.strings[recipe]!;
    const person: PersonInput = {
      id: this.ids[member]!,
      givenName: this.given[member]!,
      familyName: this.family[member]!,
      birthDate: this.born[member]! as IsoDate,
      placeId,
      householdId: h.id,
      tier: (this.strings[this.tierIx[member]!] ||
        "weekly") as PersonInput["tier"],
      traits:
        traits === "plain"
          ? this.traitRecord(member)
          : this.packedTraits(member),
      liquidMinor: this.liquid[member]!,
      livingCostDailyMinor: this.living[member]!,
      source: h.source,
      familyIds,
      knownIds: [],
      looks,
      pastFacts: [],
    };
    const county = this.countyIx[member]!;
    if (county) person.countyId = this.strings[county]!;
    const traitSource = this.traitSourceByPlace.get(placeId);
    if (traitSource) person.sharedTraitSource = traitSource;
    const jobId = this.jobId[member];
    if (jobId) person.jobId = jobId;
    return person;
  }

  /** A household as the record readers of the old per-person counts expect. */
  householdView(h: CountedHousehold): ResidentHouseholdRecord {
    return new HouseholdView(this, h);
  }

  /** Pack a household record (the opening's, a newcomer's) into the store. */
  addHousehold(
    record: ResidentHouseholdRecord,
    facts: {
      tenure: Tenure;
      unplacedWorkers: number;
      /** Real households this record stands for (omit for one). */
      weight?: number;
    },
  ): CountedHousehold {
    const prior = this.householdOf.get(record.household.id);
    // A household filled in and later returned to the counts comes back
    // under its own id, as a new entry.
    if (prior !== undefined && !this.households[prior]!.gone)
      throw new Error(`Duplicate counted household: ${record.household.id}`);
    const index = this.households.length;
    const members = record.people.map((person) =>
      this.addMember(person, index),
    );
    const position = new Map(record.people.map((p, i) => [p.id, members[i]!]));
    const kin: number[] = [];
    for (const person of record.people)
      for (const other of person.familyIds) {
        const a = position.get(person.id)!,
          b = position.get(other);
        if (b !== undefined && a < b) kin.push(a, b);
      }
    const wages = record.jobs
      .filter((job) => job.endsAt === undefined)
      .reduce((n, job) => n + job.wageDailyMinor * 365, 0);
    const incomeContracts = record.contracts.filter(
      (row) => row.recipientIncome,
    );
    const retirement = incomeContracts.reduce(
      (n, row) => n + (row.amountMinor * 12) / Math.max(1, row.periodMonths),
      0,
    );
    const h: CountedHousehold = {
      index,
      id: record.household.id,
      placeId: record.household.placeId,
      group: -1,
      members,
      kin,
      jobs: [...record.jobs],
      workCommitments: [...record.workCommitments],
      incomeContracts,
      source: record.household.source,
      wagesMinorYear: Math.round(wages),
      retirementMinorYear: Math.round(retirement),
      unplacedWorkers: facts.unplacedWorkers,
      tenure: facts.tenure,
      ...(facts.weight !== undefined && facts.weight !== 1
        ? { weight: facts.weight }
        : {}),
    };
    this.households.push(h);
    this.householdOf.set(h.id, index);
    return h;
  }

  /** Put a household in the group its facts key it to today. */
  regroup(h: CountedHousehold, key: GroupKey): void {
    this.version++;
    if (h.group >= 0) this.groups[h.group]!.households.delete(h.index);
    const group = this.group(key);
    group.households.add(h.index);
    h.group = group.index;
  }

  /** Take a household out of the counts (filled in, moved away or emptied). */
  retire(h: CountedHousehold, state: MemberState): void {
    this.version++;
    this.membersVersion++;
    this.touch(h);
    for (const m of h.members)
      if (this.state[m] === MemberState.Counted) this.state[m] = state;
    if (h.group >= 0) this.groups[h.group]!.households.delete(h.index);
    h.gone = true;
  }
}

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
export class CountedHouseholdMap implements ReadonlyMap<
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
    return h ? this.store.householdView(h) : undefined;
  }
  has(id: string): boolean {
    return this.live(id) !== undefined;
  }
  *entries(): MapIterator<[string, ResidentHouseholdRecord]> {
    for (const h of this.store.liveHouseholds())
      yield [h.id, this.store.householdView(h)];
  }
  *keys(): MapIterator<string> {
    for (const h of this.store.liveHouseholds()) yield h.id;
  }
  *values(): MapIterator<ResidentHouseholdRecord> {
    for (const h of this.store.liveHouseholds())
      yield this.store.householdView(h);
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
export class CountedPersonHouseholdMap implements ReadonlyMap<
  PersonId,
  string
> {
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

/** The store as plain data for a snapshot, and back. */
export function encodeStore(store: CountedStore): unknown {
  return {
    ...Object.fromEntries(
      Object.entries(store).filter(
        ([key]) =>
          ![
            "state",
            "traits",
            "traitView",
            "traitViews",
            "peopleViews",
            // Cache keys, not state: a restored store starts its own count.
            "version",
            "membersVersion",
          ].includes(key),
      ),
    ),
    state: [...store.state.subarray(0, store.memberCount)],
    traits: [
      ...store.traits.subarray(0, store.memberCount * store.traitNames.length),
    ],
    households: store.households.map((h) => ({ ...h })),
    groups: store.groups.map((g) => ({ ...g, households: [...g.households] })),
  };
}

export function decodeStore(data: unknown): CountedStore {
  const raw = data as Record<string, unknown> & {
    state: number[];
    traits: number[];
    groups: (Omit<CountedGroup, "households"> & { households: number[] })[];
  };
  const store = new CountedStore();
  for (const [key, value] of Object.entries(raw)) {
    if (
      [
        "state",
        "traits",
        "groups",
        "traitView",
        "traitViews",
        "version",
      ].includes(key)
    )
      continue;
    (store as unknown as Record<string, unknown>)[key] = value;
  }
  store.state = Uint8Array.from(raw.state);
  store.traits = Int8Array.from(raw.traits);
  (store as unknown as { groups: CountedGroup[] }).groups = raw.groups.map(
    (g) => ({ ...g, households: new Set(g.households) }),
  );
  return store;
}
