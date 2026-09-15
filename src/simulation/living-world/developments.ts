import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { homeLocalGovernmentStatus } from "../nationwide-world/local-governments";
import { publishPublicEvent } from "../public-information";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { LIVING_WORLD_WRITER_VERSION } from "./opening";

/**
 * Background public developments: small matters that change while a life
 * goes on, on the canonical clock, through registered transitions.
 *
 * Every stage is an ordinary event; public stages are published through the
 * existing public-information system. Publication is not knowledge: nobody
 * learns anything here unless a record says they did. Each later stage is
 * chosen when it comes due, from what is true then, and "no public update"
 * is always a possible result.
 */
export const DEVELOPMENT_STEP_TRANSITION_KEY = "living-world:development-step";
export const PUBLIC_COMMENT_EVENT = "civic.public-comment-submitted";
const MATTER_TAG = "matter:";
const STAGE_TAG = "stage:";
const FAMILY_TAG = "family:";

export type DevelopmentFamily = "local-matter" | "international";
export type DevelopmentImportance = "minor" | "notable" | "major";

interface StageDefinition {
  readonly type: `${string}.${string}`;
  readonly importance: DevelopmentImportance;
  /** Null for a stage that ends the matter. */
  readonly nextAfterDays: readonly [number, number] | null;
}

const LOCAL_STAGES: Readonly<Record<string, StageDefinition>> = {
  "proposal-posted": {
    type: "civic.local-matter-proposal-posted",
    importance: "minor",
    nextAfterDays: [8, 15],
  },
  "comment-period-extended": {
    type: "civic.local-matter-comment-extended",
    importance: "minor",
    nextAfterDays: [10, 18],
  },
  "revised-proposal-posted": {
    type: "civic.local-matter-revised",
    importance: "notable",
    nextAfterDays: null,
  },
  "proposal-withdrawn": {
    type: "civic.local-matter-withdrawn",
    importance: "notable",
    nextAfterDays: null,
  },
};

const INTERNATIONAL_STAGES: Readonly<Record<string, StageDefinition>> = {
  reported: {
    type: "international.development-reported",
    importance: "notable",
    nextAfterDays: [6, 13],
  },
  persisted: {
    type: "international.development-persisted",
    importance: "minor",
    nextAfterDays: [9, 16],
  },
  eased: {
    type: "international.development-eased",
    importance: "notable",
    nextAfterDays: null,
  },
};

/**
 * Authored, deliberately generic subjects for this fictional setting. They
 * name no real site, figure, price or foreign government, and assert no
 * authority beyond a local government posting a proposal for comment.
 */
const LOCAL_SUBJECTS = [
  "operating hours at a public facility",
  "the repair schedule for several local roads",
  "the rules for reserving a public park shelter",
  "the location of a recycling drop-off site",
] as const;

const INTERNATIONAL_SUBJECTS = [
  {
    reported:
      "Shipping delays were reported along a busy international trade route.",
    persisted:
      "The shipping delays along the international trade route continued.",
    eased:
      "Shipping along the international trade route returned closer to its usual pace.",
  },
  {
    reported:
      "Several governments opened talks over fishing rights in shared waters.",
    persisted:
      "Talks over fishing rights in shared waters continued without an agreement.",
    eased:
      "The governments in the fishing-rights talks announced an interim arrangement.",
  },
] as const;

function matterKey(family: DevelopmentFamily, ordinal = 1): string {
  return `${LIVING_WORLD_WRITER_VERSION}:development:${family}:${ordinal}`;
}

function matterOrdinal(matterId: string): number {
  return Number(matterId.slice(matterId.lastIndexOf(":") + 1));
}

function matterFamilyFromKey(matterId: string): DevelopmentFamily | null {
  if (matterId.includes(":development:local-matter:")) return "local-matter";
  if (matterId.includes(":development:international:")) return "international";
  return null;
}

/** Days between one matter concluding and the next one in its family. */
const SUCCESSOR_AFTER_DAYS: readonly [number, number] = [20, 45];

function matterEvents(
  world: World,
  matterId: string,
): readonly HistoricalEvent[] {
  return world.history.events
    .filter((event) => event.tags.includes(`${MATTER_TAG}${matterId}`))
    .sort((a, b) => a.sequence - b.sequence);
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

interface LocalContext {
  readonly jurisdictionId: EntityId;
  readonly governmentName: string;
  readonly involved: readonly EntityId[];
}

function localContext(
  world: World,
  playerPersonId: EntityId,
): LocalContext | null {
  const person = world.people[playerPersonId];
  if (!person) return null;
  const government = homeLocalGovernmentStatus(world, playerPersonId)
    .governments[0];
  if (!government) return null;
  return {
    jurisdictionId: person.homeJurisdictionId,
    governmentName: government.name,
    involved: government.organizationId
      ? [government.organizationId]
      : [person.homeJurisdictionId],
  };
}

function writeStage(
  world: World,
  input: {
    readonly family: DevelopmentFamily;
    readonly matterId: string;
    readonly stage: string;
    readonly definition: StageDefinition;
    readonly occurredAt: IsoDate;
    readonly jurisdictionId: EntityId | null;
    readonly involved: readonly EntityId[];
    readonly summary: string;
    readonly subjectIndex: number;
  },
): { world: World; eventId: EntityId } {
  const stableKey = `${input.matterId}:stage:${matterEvents(world, input.matterId).length + 1}:${input.stage}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: input.definition.type,
    occurredAt: input.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: input.involved.length ? [...input.involved] : [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      LIVING_WORLD_WRITER_VERSION,
      `${FAMILY_TAG}${input.family}`,
      `${MATTER_TAG}${input.matterId}`,
      `${STAGE_TAG}${input.stage}`,
      `importance:${input.definition.importance}`,
      `subject:${input.subjectIndex}`,
    ],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = publishPublicEvent(next, {
    stableKey: `${stableKey}:publication`,
    sourceEventId: eventId,
  });
  return { world: next, eventId };
}

function scheduleStep(
  world: World,
  matterId: string,
  afterDays: readonly [number, number],
  entityIds: readonly EntityId[],
  jurisdictionId: EntityId | null,
  source: FutureDueItem["provenance"],
): World {
  const count = world.history.futureDueItems.filter((item) =>
    item.stableKey.startsWith(`${matterId}:step:`),
  ).length;
  const rng = new SeededRng(world.seed).fork(`${matterId}:step:${count + 1}`);
  return scheduleFutureDueItem(world, {
    stableKey: `${matterId}:step:${count + 1}`,
    dueAt: addDays(
      world.currentDate,
      rng.integer(afterDays[0], afterDays[1] + 1),
    ),
    transitionKey: DEVELOPMENT_STEP_TRANSITION_KEY,
    entityIds: [...new Set(entityIds)].sort(),
    jurisdictionId,
    provenance: source,
  });
}

function previousSubject(
  world: World,
  family: DevelopmentFamily,
  ordinal: number,
): number | null {
  if (ordinal <= 1) return null;
  const earlier = matterEvents(world, matterKey(family, ordinal - 1))[0];
  return earlier ? Number(tagValue(earlier, "subject:") ?? -1) : null;
}

/** Opens one matter, never repeating the subject of the one before it. */
function startMatter(
  world: World,
  family: DevelopmentFamily,
  ordinal: number,
  residentId: EntityId,
  occurredAt: IsoDate,
): World | null {
  const matterId = matterKey(family, ordinal);
  const rng = new SeededRng(world.seed).fork(`${matterId}:start`);
  const pool =
    family === "local-matter"
      ? LOCAL_SUBJECTS.length
      : INTERNATIONAL_SUBJECTS.length;
  const avoid = previousSubject(world, family, ordinal);
  const subjects = [...Array(pool).keys()].filter((index) => index !== avoid);
  const subjectIndex = subjects[rng.integer(0, subjects.length)]!;
  if (family === "local-matter") {
    const local = localContext(world, residentId);
    if (!local) return null;
    const written = writeStage(world, {
      family,
      matterId,
      stage: "proposal-posted",
      definition: LOCAL_STAGES["proposal-posted"]!,
      occurredAt,
      jurisdictionId: local.jurisdictionId,
      involved: local.involved,
      summary: `${local.governmentName} posted a proposal about ${LOCAL_SUBJECTS[subjectIndex]} and opened a public comment period.`,
      subjectIndex,
    });
    return scheduleStep(
      written.world,
      matterId,
      LOCAL_STAGES["proposal-posted"]!.nextAfterDays!,
      [residentId, ...local.involved],
      local.jurisdictionId,
      { kind: "initialization", reference: matterId },
    );
  }
  const written = writeStage(world, {
    family,
    matterId,
    stage: "reported",
    definition: INTERNATIONAL_STAGES.reported!,
    occurredAt,
    jurisdictionId: null,
    involved: [],
    summary: INTERNATIONAL_SUBJECTS[subjectIndex]!.reported,
    subjectIndex,
  });
  return scheduleStep(
    written.world,
    matterId,
    INTERNATIONAL_STAGES.reported!.nextAfterDays!,
    [world.id, residentId],
    null,
    { kind: "initialization", reference: matterId },
  );
}

/**
 * Seeds a new life's modest recent public past: one local proposal already
 * open for comment and one international development already reported, each
 * with a first dated record and its next check scheduled. New lives only.
 */
export function ensureLivingWorldDevelopments(
  world: World,
  playerPersonId: EntityId,
): World {
  if (
    world.history.events.some((event) =>
      event.tags.includes(`${MATTER_TAG}${matterKey("international")}`),
    )
  )
    return world;
  if (!world.people[playerPersonId]) return world;
  const rng = new SeededRng(world.seed).fork(
    `${LIVING_WORLD_WRITER_VERSION}:developments`,
  );
  const local = startMatter(
    world,
    "local-matter",
    1,
    playerPersonId,
    addDays(world.currentDate, -rng.fork("local:age").integer(1, 6)),
  );
  return (
    startMatter(
      local ?? world,
      "international",
      1,
      playerPersonId,
      addDays(world.currentDate, -rng.fork("international:age").integer(0, 4)),
    ) ??
    local ??
    world
  );
}

/**
 * A resident's explicit public comment on an open local proposal. It is part
 * of the matter's record, visible to its handlers, and changes which
 * continuations are available; it guarantees none of them.
 */
export function submitPublicComment(
  world: World,
  personId: EntityId,
  matterId: string,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  const stages = matterEvents(world, matterId).filter(
    (event) => tagValue(event, FAMILY_TAG) === "local-matter",
  );
  const latest = stages.at(-1);
  if (
    !latest ||
    LOCAL_STAGES[tagValue(latest, STAGE_TAG) ?? ""]?.nextAfterDays === null
  )
    return world;
  const stableKey = `${matterId}:comment:${personId}:${stages.length}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: PUBLIC_COMMENT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: latest.jurisdictionId,
    involvedEntityIds: [personId, ...latest.involvedEntityIds],
    participants: [
      { personId, role: "agency:actor", detail: "Submitted a public comment" },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      LIVING_WORLD_WRITER_VERSION,
      `${MATTER_TAG}${matterId}:comment`,
      "provenance:player-choice",
      "time-neutral",
    ],
    summary: "You submitted a public comment on the posted proposal.",
    context: {
      location: null,
      socialContext: "A public comment period.",
      pressure: null,
      choice: "Submit a public comment",
      motivation: null,
      immediateReaction: null,
    },
  });
}

function commentsSince(
  world: World,
  matterId: string,
  sinceSequence: number,
): number {
  return world.history.events.filter(
    (event) =>
      event.type === PUBLIC_COMMENT_EVENT &&
      event.tags.includes(`${MATTER_TAG}${matterId}:comment`) &&
      event.sequence > sinceSequence,
  ).length;
}

/**
 * When a matter's next check comes due, its continuation is chosen from what
 * is true now. A revision is only available after public comment; "no public
 * update" leaves the matter where it is and checks again later.
 */
export function developmentStepTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== DEVELOPMENT_STEP_TRANSITION_KEY)
    throw new Error(
      "The development step handler received another transition.",
    );
  const matterId = dueItem.stableKey.slice(
    0,
    dueItem.stableKey.lastIndexOf(":step:"),
  );
  if (matterEvents(world, matterId).length === 0) {
    const family = matterFamilyFromKey(matterId);
    const residentId = dueItem.entityIds.find((id) => world.people[id]);
    const started =
      family && residentId
        ? startMatter(
            world,
            family,
            matterOrdinal(matterId),
            residentId,
            world.currentDate,
          )
        : null;
    return started
      ? {
          world: started,
          status: "resolved",
          reasonKey: "living-world:matter-started",
          context: null,
          outcomeEventId: started.history.events.findLast((event) =>
            event.tags.includes(`${MATTER_TAG}${matterId}`),
          )!.id,
        }
      : {
          world,
          status: "cancelled",
          reasonKey: "living-world:successor-unavailable",
          context: null,
          outcomeEventId: null,
        };
  }
  const stages = matterEvents(world, matterId).filter((event) =>
    tagValue(event, STAGE_TAG),
  );
  const latest = stages.at(-1);
  const family = latest
    ? (tagValue(latest, FAMILY_TAG) as DevelopmentFamily | null)
    : null;
  const done = (reason: string): FutureTransitionHandlerResult => ({
    world,
    status: "cancelled",
    reasonKey: `living-world:${reason}`,
    context: null,
    outcomeEventId: null,
  });
  if (!latest || !family) return done("matter-absent");
  const table = family === "local-matter" ? LOCAL_STAGES : INTERNATIONAL_STAGES;
  const current = table[tagValue(latest, STAGE_TAG)!];
  if (!current || current.nextAfterDays === null)
    return done("matter-concluded");
  const rng = new SeededRng(world.seed).fork(dueItem.stableKey);
  const subjectIndex = Number(tagValue(latest, "subject:") ?? 0);

  const latestStage = tagValue(latest, STAGE_TAG)!;
  let stage: string | null;
  let summary = "";
  if (family === "local-matter") {
    // The government that posted it is re-read now, for the resident whose
    // home it serves; if it is no longer recorded, nothing moves.
    const residentId = dueItem.entityIds.find((id) => world.people[id]);
    const poster = residentId
      ? homeLocalGovernmentStatus(world, residentId).governments[0]?.name
      : undefined;
    if (!poster) return done("actor-absent");
    const subject = LOCAL_SUBJECTS[subjectIndex] ?? LOCAL_SUBJECTS[0];
    const commented = commentsSince(world, matterId, latest.sequence) > 0;
    const options = commented
      ? ["revised-proposal-posted"]
      : latestStage === "comment-period-extended"
        ? ["proposal-withdrawn", "quiet"]
        : ["proposal-withdrawn", "comment-period-extended", "quiet"];
    const chosen = options[rng.integer(0, options.length)]!;
    stage = chosen === "quiet" ? null : chosen;
    summary =
      stage === "revised-proposal-posted"
        ? `${poster} posted a revised proposal about ${subject} after the public comment period.`
        : stage === "proposal-withdrawn"
          ? `${poster} withdrew its proposal about ${subject}.`
          : `${poster} extended the public comment period on its proposal about ${subject}.`;
  } else {
    const options =
      latestStage === "persisted"
        ? ["eased", "quiet"]
        : ["persisted", "eased", "quiet"];
    const chosen = options[rng.integer(0, options.length)]!;
    stage = chosen === "quiet" ? null : chosen;
    const subject =
      INTERNATIONAL_SUBJECTS[subjectIndex] ?? INTERNATIONAL_SUBJECTS[0];
    summary = stage ? subject[stage as "persisted" | "eased"] : "";
  }

  let next = world;
  let outcomeEventId: EntityId | null = null;
  let definition = current;
  if (stage) {
    definition = table[stage]!;
    const written = writeStage(next, {
      family,
      matterId,
      stage,
      definition,
      occurredAt: world.currentDate,
      jurisdictionId: latest.jurisdictionId,
      involved: latest.involvedEntityIds.filter((id) => id !== world.id),
      summary,
      subjectIndex,
    });
    next = written.world;
    outcomeEventId = written.eventId;
  }
  if (stage && definition.nextAfterDays === null) {
    const successor = matterKey(family, matterOrdinal(matterId) + 1);
    next = scheduleStep(
      next,
      successor,
      SUCCESSOR_AFTER_DAYS,
      dueItem.entityIds,
      dueItem.jurisdictionId,
      {
        kind: "simulated",
        sourceEntityIds: dueItem.entityIds.filter(
          (id) =>
            world.people[id] || world.jurisdictions[id] || id === world.id,
        ),
      },
    );
  }
  if (definition.nextAfterDays)
    next = scheduleStep(
      next,
      matterId,
      definition.nextAfterDays,
      dueItem.entityIds,
      dueItem.jurisdictionId,
      {
        kind: "simulated",
        sourceEntityIds: dueItem.entityIds.filter(
          (id) =>
            world.people[id] || world.jurisdictions[id] || id === world.id,
        ),
      },
    );
  return {
    world: next,
    status: "resolved",
    reasonKey: stage
      ? `living-world:${stage}`
      : "living-world:no-public-update",
    context: null,
    outcomeEventId,
  };
}

export interface PublicMatterView {
  readonly matterId: string;
  readonly family: DevelopmentFamily;
  readonly stage: string;
  readonly concluded: boolean;
  readonly latestEventId: EntityId;
  readonly occurredAt: IsoDate;
  readonly summary: string;
  /** Local matters only: whether the life can still comment. */
  readonly openForComment: boolean;
}

/** The public matters this save records, current stage first. Pure. */
export function projectPublicMatters(
  world: World,
): readonly PublicMatterView[] {
  const matters = new Map<string, HistoricalEvent>();
  for (const event of world.history.events) {
    const matterId = tagValue(event, MATTER_TAG);
    if (
      !matterId ||
      !tagValue(event, STAGE_TAG) ||
      event.recordedAt > world.currentDate
    )
      continue;
    const previous = matters.get(matterId);
    if (!previous || event.sequence > previous.sequence)
      matters.set(matterId, event);
  }
  return [...matters.entries()]
    .map(([matterId, latest]) => {
      const family = tagValue(latest, FAMILY_TAG) as DevelopmentFamily;
      const stage = tagValue(latest, STAGE_TAG)!;
      const table =
        family === "local-matter" ? LOCAL_STAGES : INTERNATIONAL_STAGES;
      const concluded = table[stage]?.nextAfterDays === null;
      return {
        matterId,
        family,
        stage,
        concluded,
        latestEventId: latest.id,
        occurredAt: latest.occurredAt,
        summary: latest.summary,
        openForComment: family === "local-matter" && !concluded,
      };
    })
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) ||
        a.matterId.localeCompare(b.matterId),
    );
}

export interface MeaningfulChangeRef {
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly occurredAt: IsoDate;
  readonly family: DevelopmentFamily;
  readonly importance: DevelopmentImportance;
  readonly visibility: "public" | "known" | "public-and-known";
  readonly knownToPerson: boolean;
  readonly publicationId: EntityId | null;
  readonly matterId: string;
  readonly stage: string;
  /** A stable fact handle, so a reader never parses prose. */
  readonly subjectIds: readonly EntityId[];
  readonly status: string;
}

/**
 * Background developments recorded after `sinceSequence`, for any person.
 * "known" comes only from that person's own knowledge records or direct
 * participation; public availability is never treated as knowing. Pure.
 */
export function projectMeaningfulChanges(
  world: World,
  personId: EntityId,
  sinceSequence: number,
): readonly MeaningfulChangeRef[] {
  const publications = world.history.publications ?? [];
  return world.history.events
    .filter(
      (event) =>
        event.sequence >= sinceSequence &&
        event.recordedAt <= world.currentDate &&
        tagValue(event, MATTER_TAG) !== null &&
        tagValue(event, STAGE_TAG) !== null,
    )
    .flatMap((event) => {
      const known =
        event.participants.some(
          (participant) => participant.personId === personId,
        ) ||
        world.history.knowledge.some(
          (record) =>
            record.personId === personId &&
            record.eventId === event.id &&
            record.learnedAt <= world.currentDate,
        );
      const publication = publications.find(
        (row) =>
          row.sourceEventId === event.id &&
          row.correctsPublicationId === null &&
          row.publishedAt <= world.currentDate,
      );
      const isPublic =
        event.visibility === "public" && publication !== undefined;
      if (!isPublic && !known) return [];
      const visibility: MeaningfulChangeRef["visibility"] =
        isPublic && known ? "public-and-known" : isPublic ? "public" : "known";
      return [
        {
          eventId: event.id,
          sequence: event.sequence,
          occurredAt: event.occurredAt,
          family: tagValue(event, FAMILY_TAG) as DevelopmentFamily,
          importance: (tagValue(event, "importance:") ??
            "minor") as DevelopmentImportance,
          visibility,
          knownToPerson: known,
          publicationId: publication?.id ?? null,
          matterId: tagValue(event, MATTER_TAG)!,
          stage: tagValue(event, STAGE_TAG)!,
          subjectIds: event.involvedEntityIds.filter((id) => id !== world.id),
          status: tagValue(event, STAGE_TAG)!,
        },
      ];
    });
}
