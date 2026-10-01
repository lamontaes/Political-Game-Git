import { addDays } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { stateJurisdictionForKey } from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createStableId } from "./ids";
import { activePartnershipsAt } from "./life-queries";
import { scheduleFutureDueItem } from "./future-transitions";
import type {
  EntityId,
  IsoDate,
  LawExposureChannel,
  LawExposureNewsProvenance,
  LawExposureRecord,
  MoneyAmount,
  World,
} from "./types";

/**
 * When an enacted law reaches a person (spec 5, "Exposure").
 *
 * Every lane that makes a law do something to people (a tax collected, a
 * paycheck withheld, a benefit paid, a class that got smaller, a rent that
 * rose) calls `recordLawExposure` from the record that shows it happened. The
 * exposure names the person, the law and section, how it reached them and the
 * money next to their pay. The person's partner gets a family exposure,
 * because a spouse's paycheck is felt at home.
 *
 * This writes no opinion. It schedules a reflection a few days later, which
 * forms views of the officials behind the law (`living-world/official-views.ts`).
 */

export interface LawExposureInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly measureId: EntityId;
  readonly sectionKey?: string | null;
  readonly channel: LawExposureChannel;
  readonly direction: LawExposureRecord["direction"];
  readonly amount: MoneyAmount | null;
  readonly cadence: LawExposureRecord["cadence"];
  readonly sourceRecordId: EntityId;
  /** Write a family exposure for each active partner. Default true. */
  readonly includeFamily?: boolean;
}

/**
 * How big a law's effect felt to the person, as a share of a month's pay.
 *
 * PLACEHOLDER (research: felt-size-of-non-money-law-effects): a
 * law that took away or granted a right or an eligibility, with no money on
 * the record, is felt like a tenth of a month's pay, the loss at which a
 * money effect starts to count (Fable audit, card L3). One size, read by every
 * reader of exposures (`official-views.ts`, `law-interest-groups.ts`), so a
 * view and a group weigh the same loss the same way.
 */
export const NON_MONEY_FELT_SIZE = {
  monthsOfPay: 0.1,
  basis: "PLACEHOLDER",
  researchQuestionId: "felt-size-of-non-money-law-effects",
} as const;

export type LawExposureFeltSize =
  /** The share of a month's pay; `estimated` for a non-money effect. */
  | { readonly share: number; readonly estimated: boolean }
  /** Money whose size next to pay is unknown: the pay is not on record. */
  | "unmeasured"
  /** No side to feel: a non-money effect neither a loss nor a gain. */
  | null;

/**
 * The felt size of an exposure against `monthlyPayMinor`, the pay it lands
 * on (the reader decides whose: the person's own, or a household's).
 */
export function lawExposureFeltSize(
  exposure: Pick<LawExposureRecord, "direction" | "amount">,
  monthlyPayMinor: number,
): LawExposureFeltSize {
  if (exposure.direction === "none") return null;
  if (exposure.amount === null)
    return { share: NON_MONEY_FELT_SIZE.monthsOfPay, estimated: true };
  if (monthlyPayMinor <= 0) return "unmeasured";
  return {
    share: exposure.amount.minorUnits / monthlyPayMinor,
    estimated: false,
  };
}

// PLACEHOLDER: pay is read over the four weeks before the exposure and scaled
// to an average month (365.25 / 12 days).
const PAY_WINDOW_DAYS = 28;
const DAYS_PER_MONTH = 365.25 / 12;

/**
 * Records that a law reached a person, and their partners. Idempotent on the
 * stable key, so a replayed transition writes nothing twice. A law without an
 * enactment or an operative starting-law identity, or a missing person, is refused.
 */
export function recordLawExposure(
  world: World,
  input: LawExposureInput,
): World {
  if (!world.people[input.personId])
    throw new Error("A law exposure needs a person in the world.");
  if (!recordedLawAt(world, input.measureId, world.currentDate))
    throw new Error("Only a recorded law in force can reach a person.");
  if ((input.amount === null) !== (input.cadence === null))
    throw new Error("A law exposure's amount and cadence go together.");
  if (input.amount !== null && input.amount.minorUnits < 0)
    throw new Error("A law exposure's amount is never negative.");
  if (input.direction === "none" && input.amount !== null)
    throw new Error("A non-money exposure carries no amount.");
  let next = append(world, {
    stableKey: input.stableKey,
    personId: input.personId,
    measureId: input.measureId,
    sectionKey: input.sectionKey ?? null,
    channel: input.channel,
    relation: "own",
    viaPersonId: null,
    direction: input.direction,
    amount: input.amount,
    cadence: input.cadence,
    monthlyPay: monthlyPay(world, input.personId, world.currentDate),
    sourceRecordId: input.sourceRecordId,
  });
  if (input.includeFamily === false) return next;
  for (const partnership of activePartnershipsAt(world, input.personId)) {
    for (const partnerId of partnership.personIds) {
      if (partnerId === input.personId || !world.people[partnerId]) continue;
      next = append(next, {
        stableKey: `${input.stableKey}:family:${partnerId}`,
        personId: partnerId,
        measureId: input.measureId,
        sectionKey: input.sectionKey ?? null,
        channel: input.channel,
        relation: "family",
        viaPersonId: input.personId,
        direction: input.direction,
        amount: input.amount,
        cadence: input.cadence,
        monthlyPay: monthlyPay(world, partnerId, world.currentDate),
        sourceRecordId: input.sourceRecordId,
      });
    }
  }
  return next;
}

/**
 * Word of mouth: a person tells someone they know what a law did to them. The
 * hearer gets a friend exposure naming the teller, with the teller's amount and
 * pay, since it is the teller's hardship or windfall they heard about. Only a
 * person's own exposure is passed on; hearsay is not retold.
 */
export function recordHeardExposure(
  world: World,
  told: LawExposureRecord,
  hearerId: EntityId,
): World {
  if (told.relation !== "own")
    throw new Error("Only a person's own exposure is passed on.");
  if (!world.people[hearerId] || hearerId === told.personId)
    throw new Error("Word of mouth needs another person in the world.");
  return append(world, {
    stableKey: `${told.stableKey}:heard:${hearerId}`,
    personId: hearerId,
    measureId: told.measureId,
    sectionKey: told.sectionKey,
    channel: told.channel,
    relation: "friend",
    viaPersonId: told.personId,
    direction: told.direction,
    amount: told.amount,
    cadence: told.cadence,
    monthlyPay: told.monthlyPay,
    sourceRecordId: told.sourceRecordId,
  });
}

export const OFFICIAL_VIEW_TRANSITION_KEY = "people:official-view-reflection";
// PLACEHOLDER: "reflection happens within days" (spec 5); three days.
const REFLECTION_DAYS = 3;

/*
 * The reflection is scheduled here, where the exposure is written, and run by
 * living-world/official-views.ts. Keeping the scheduler here means the tax
 * collector and the other writers do not load the reflection's dependencies.
 */
export function officialViewReflectionKey(exposure: LawExposureRecord): string {
  return `official-view:reflect:${exposure.id}`;
}

/** Schedules the reflection on one exposure. The player decides their own mind. */
export function scheduleOfficialViewReflection(
  world: World,
  exposure: LawExposureRecord,
): World {
  if (exposure.direction === "none") return world;
  if (
    world.control.kind === "person" &&
    world.control.personId === exposure.personId
  )
    return world;
  const stableKey = officialViewReflectionKey(exposure);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, REFLECTION_DAYS),
    transitionKey: OFFICIAL_VIEW_TRANSITION_KEY,
    // The exposure itself is named in the key; due items reference people.
    entityIds: [exposure.personId],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: `official-view:reflect` },
  });
}

/** Everything a law has done to one person, oldest first. */
export function lawExposuresOf(
  world: World,
  personId: EntityId,
): readonly LawExposureRecord[] {
  return (world.history.lawExposures ?? []).filter(
    (row) => row.personId === personId,
  );
}

/** Everyone a law has reached, oldest first. */
export function lawExposuresFrom(
  world: World,
  measureId: EntityId,
): readonly LawExposureRecord[] {
  return (world.history.lawExposures ?? []).filter(
    (row) => row.measureId === measureId,
  );
}

/**
 * A person's pay from work over the four weeks before `at`, scaled to a month.
 * Null when the game keeps no money record for them.
 */
export function monthlyPay(
  world: World,
  personId: EntityId,
  at: IsoDate,
): MoneyAmount | null {
  const tracked = world.history.resourcePositions.some(
    (row) => row.owner.kind === "person" && row.owner.personId === personId,
  );
  if (!tracked) return null;
  const from = addDays(at, -PAY_WINDOW_DAYS);
  const flows = new Set(
    world.history.resourceFlows
      .filter(
        (row) =>
          row.basisReference.kind === "work" &&
          row.recipient.kind === "person" &&
          row.recipient.personId === personId,
      )
      .map((row) => row.id),
  );
  let total = 0;
  let currency: MoneyAmount["currency"] | null = null;
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (!flows.has(outcome.resourceFlowId)) continue;
    if (outcome.occurredAt <= from || outcome.occurredAt > at) continue;
    total += outcome.transferredAmount.minorUnits;
    currency = outcome.transferredAmount.currency;
  }
  if (currency === null) {
    const position = world.history.resourcePositions.find(
      (row) => row.owner.kind === "person" && row.owner.personId === personId,
    )!;
    currency = position.openingBalance.currency;
  }
  return {
    minorUnits: Math.round((total * DAYS_PER_MONTH) / PAY_WINDOW_DAYS),
    currency,
  };
}

/** Resolve starting identities through the same legal reader as their producers.
 * A prefix alone is never evidence that a starting law exists or is operative.
 * Use the law's jurisdiction, not the hearer's home: family exposure may cross
 * a state boundary without changing which law affected the original person.
 */
function recordedLawAt(
  world: World,
  measureId: EntityId,
  at: IsoDate,
): boolean {
  if (measureId.startsWith("starting-law:")) {
    const identity = /^starting-law:([^:]+):(.+)$/.exec(measureId);
    if (!identity) return false;
    const [, placeKey, questionKey] = identity;
    const jurisdiction =
      placeKey === "US"
        ? NATIONAL_ELECTION_JURISDICTION
        : stateJurisdictionForKey(placeKey!);
    if (!jurisdiction) return false;
    const question = Object.values(
      world.policyCatalog?.propositions ?? {},
    ).find((row) => row.stableKey === questionKey);
    if (!question) return false;
    const law = lawInForce(world, jurisdiction.id, question.id, at);
    return law?.origin === "in-force-at-start" && law.measureId === measureId;
  }
  return enactedBy(world, measureId, at);
}

export function enactedBy(
  world: World,
  measureId: EntityId,
  at: IsoDate,
): boolean {
  return (world.history.legislativeEnactments ?? []).some(
    (row) =>
      row.measureId === measureId &&
      row.outcome === "enacted" &&
      row.resolvedAt <= at,
  );
}

function append(
  world: World,
  draft: Omit<LawExposureRecord, "id" | "sequence" | "recordedAt">,
): World {
  const existing = world.history.lawExposures ?? [];
  if (existing.some((row) => row.stableKey === draft.stableKey)) return world;
  const record: LawExposureRecord = {
    ...draft,
    id: createStableId("law-exposure", `${world.id}:${draft.stableKey}`),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      lawExposures: [...existing, record],
    },
  };
  // A story read in the news carries no opinion weight: nothing reflects on it.
  return record.relation === "news"
    ? next
    : scheduleOfficialViewReflection(next, record);
}

/**
 * Records that a person read a published story about what an enacted law did
 * (relation "news"). It carries no money, no pay and no opinion weight, and
 * names its story record by record. Idempotent on the stable key. The press
 * desk derives every field from the records (`press/story-exposure.ts`).
 */
export function recordNewsLawExposure(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly measureId: EntityId;
    readonly sectionKey: string | null;
    readonly channel: LawExposureChannel;
    readonly news: LawExposureNewsProvenance;
  },
): World {
  if (!world.people[input.personId])
    throw new Error("A law exposure needs a person in the world.");
  if (!enactedBy(world, input.measureId, world.currentDate))
    throw new Error("Only an enacted law can reach a person.");
  return append(world, {
    stableKey: input.stableKey,
    personId: input.personId,
    measureId: input.measureId,
    sectionKey: input.sectionKey,
    channel: input.channel,
    relation: "news",
    viaPersonId: null,
    direction: "none",
    amount: null,
    cadence: null,
    monthlyPay: null,
    sourceRecordId: input.news.knowledgeId,
    news: input.news,
  });
}

/**
 * Saved exposures must reconcile: a real person, a recorded law in force on or
 * before the exposure, a source record that came first, and a family row that
 * names whose effect it was.
 */
export function assertLawExposureIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const rows = world.history.lawExposures ?? [];
  if (rows.length === 0) return;
  const hasNews = rows.some((row) => row.relation === "news");
  const knowledgeById = new Map(
    (hasNews ? world.history.knowledge : []).map((row) => [row.id, row]),
  );
  const publicationsById = new Map(
    (hasNews ? (world.history.publications ?? []) : []).map((row) => [
      row.id,
      row,
    ]),
  );
  const pressById = new Map(
    (hasNews ? (world.history.pressRecords ?? []) : []).map((row) => [
      row.id,
      row,
    ]),
  );
  const eventsById = new Map(world.history.events.map((row) => [row.id, row]));
  const keys = new Set<string>();
  let lastSequence = -1;
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`Duplicate entity ID: ${row.id}`);
    ids.add(row.id);
    if (keys.has(row.stableKey))
      throw new Error("Duplicate law exposure identity.");
    keys.add(row.stableKey);
    if (row.sequence <= lastSequence)
      throw new Error("Law exposures must be in sequence order.");
    lastSequence = row.sequence;
    if (!world.people[row.personId])
      throw new Error("A law exposure names a person not in the world.");
    if (!recordedLawAt(world, row.measureId, row.recordedAt))
      throw new Error("A law exposure names a law not recorded by then.");
    if (
      !ids.has(row.sourceRecordId) &&
      !eventsById.has(row.sourceRecordId) &&
      !(row.relation === "news" && knowledgeById.has(row.sourceRecordId))
    )
      throw new Error("A law exposure's source record is missing.");
    if (
      (row.relation === "family" || row.relation === "friend") !==
      (row.viaPersonId !== null)
    )
      throw new Error(
        "Only a family or friend exposure names whose effect it was.",
      );
    if ((row.relation === "news") !== (row.news !== undefined))
      throw new Error("Only a news exposure names the story it came from.");
    if (row.news) {
      const knowledge = knowledgeById.get(row.news.knowledgeId);
      const publication = publicationsById.get(row.news.publicationId);
      const story = publication && eventsById.get(publication.sourceEventId);
      const lead = pressById.get(row.news.storyLeadId);
      const basis = eventsById.get(row.news.basisEventId);
      if (
        !knowledge ||
        knowledge.id !== row.sourceRecordId ||
        knowledge.personId !== row.personId ||
        knowledge.sequence >= row.sequence ||
        knowledge.learnedAt > row.recordedAt ||
        knowledge.source.kind !== "media" ||
        knowledge.source.reference !== publication?.id ||
        !story ||
        knowledge.eventId !== story.id ||
        !story.tags.includes(`press.lead:${row.news.storyLeadId}`) ||
        !lead ||
        lead.kind !== "story-lead" ||
        !lead.basisEventIds.includes(row.news.basisEventId) ||
        !basis
      )
        throw new Error("A news exposure's provenance does not reconcile.");
    }
    if (
      row.relation === "news" &&
      (row.direction !== "none" ||
        row.amount !== null ||
        row.monthlyPay !== null)
    )
      throw new Error("A news exposure carries no money.");
    if ((row.amount === null) !== (row.cadence === null))
      throw new Error("A law exposure's amount and cadence go together.");
    if (row.direction === "none" && row.amount !== null)
      throw new Error("A non-money exposure carries no amount.");
  }
}
