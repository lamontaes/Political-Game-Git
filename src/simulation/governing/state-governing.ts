import { applyCharacterHistoryPlan } from "../character-history";
import { addDays, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createStableId } from "../ids";
import { createWorkRelationship } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { activeWorkRelationshipsAt } from "../life-queries";
import { SERVICE_FAMILIES } from "../legislation-service-families";
import { FISCAL_INSTRUMENT_FAMILIES } from "../legislation-fiscal-families";
import { PUBLIC_ADMINISTRATION_FAMILIES } from "../legislation-administration-families";
import { drawCanonicalName, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng, pickDistinct } from "../rng";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
} from "../legislation";
import { createWorkItem, workItemState } from "../time-work";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
  WorkItemStateRecord,
} from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  currentStateExecutiveHolders,
  type StateExecutiveHolderRecord,
} from "../nationwide-world/state-executives";
import { stateExecutiveTermRule } from "../nationwide-world/state-executive-term-rules";
import {
  LEGISLATIVE_INSTITUTION_STEP,
  createInstitutionStepHandler,
  recordGovernorDecisionOnMeasure,
  scheduleInstitutionStep,
  type ExecutiveDeskHandler,
} from "./legislative-clock";
import {
  GOVERNING_SEASON,
  STATE_GOVERNING_CALENDAR,
  scheduleGoverningSeasons,
} from "./governing-calendar";

/**
 * STATE GOVERNING — the shared practical loop every governorship runs.
 *
 * One set of producers for every office, whoever holds it. A matter is opened
 * on the canonical clock; the player decides, delegates or lets it lapse; a
 * non-player holder decides in the ordinary course. Each decision is a
 * canonical record with a recorded consequence, and the public part of it is a
 * public event News and recaps can read. Nothing here runs on menu open.
 *
 * Families (ALIVE44 chunk 8, compiled from 92H):
 *   E2 chief-of-staff appointment -> staff relationship -> delegation
 *   E1 agenda priority            -> agency implementation matter
 *   G1 agency implementation      -> dated progress or problem report
 *   E4 budget priorities          -> legislature's response on the clock
 *   E3 bill presented             -> sign, return, or law without signature;
 *                                    a signed bill becomes agency work
 *
 * Budget season, bill presentment dates, the action deadline and what an
 * unsigned bill does are the disclosed calendar in
 * `STATE_GOVERNING_CALENDAR`, not compiled state law.
 *
 * These are the office's own staffing and management choices. They claim no
 * statutory power: hiring personal staff and directing a priority are ordinary
 * office work, and nothing here appoints anyone who needs confirmation.
 *
 * Records link to a matter by tag (`matter:<event id>`), because an event is
 * not an entity another event can involve.
 */

export const STATE_GOVERNING_VERSION = "state-governing/v1";

export const GOVERNING_MATTER_OPENED = "governing.matter-opened" as const;
export const GOVERNING_MATTER_DECIDED = "governing.matter-decided" as const;
export const GOVERNING_OUTCOME = "governing.outcome" as const;

export const GOVERNING_TRANSITION = "governing:transition" as const;
export const GOVERNING_DEADLINE = "governing:matter-deadline" as const;
export const GOVERNING_NPC_DECISION = "governing:npc-decision" as const;
export const GOVERNING_FOLLOW_UP = "governing:follow-up" as const;

export type GoverningMatterFamily =
  "chief-of-staff" | "agenda" | "implementation" | "budget" | "bill";

export interface GoverningOffice {
  readonly officeKey: string;
  readonly stateUsps: string;
  readonly title: string;
  readonly jurisdictionId: EntityId;
  readonly organizationId: EntityId;
  readonly holderPersonId: EntityId;
  /** The elected-term relationship or opening tenure event. */
  readonly termId: EntityId;
  readonly termStartedAt: IsoDate | null;
  readonly termEndsAt: IsoDate | null;
  readonly controlledByPlayer: boolean;
  /** Whether the office's calendar is compiled law or the game's profile. */
  readonly calendarBasis: "verified" | "game-profile" | "mixed";
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

function officeFromHolder(
  world: World,
  holder: StateExecutiveHolderRecord,
): GoverningOffice | null {
  const jurisdictionId =
    stateJurisdictionForKey(`US-${holder.stateUsps}`)?.id ?? null;
  if (!jurisdictionId) return null;
  const rule = stateExecutiveTermRule(holder.stateUsps);
  const bases = rule ? Object.values(rule.basis) : ["game-profile"];
  return {
    officeKey: holder.officeKey,
    stateUsps: holder.stateUsps,
    title: holder.title,
    jurisdictionId,
    organizationId: holder.organizationId,
    holderPersonId: holder.personId,
    termId: holder.termId,
    termStartedAt: holder.startedAt,
    termEndsAt: holder.endExclusive,
    controlledByPlayer: controlledPersonId(world) === holder.personId,
    calendarBasis: bases.every((b) => b === "verified")
      ? "verified"
      : bases.every((b) => b === "game-profile")
        ? "game-profile"
        : "mixed",
  };
}

/** Every governorship this World has materialized, with its current holder. */
export function currentGoverningOffices(
  world: World,
): readonly GoverningOffice[] {
  return currentStateExecutiveHolders(world).flatMap((holder) => {
    const office = officeFromHolder(world, holder);
    return office ? [office] : [];
  });
}

export function governingOfficeForPerson(
  world: World,
  personId: EntityId,
): GoverningOffice | null {
  return (
    currentGoverningOffices(world).find(
      (office) => office.holderPersonId === personId,
    ) ?? null
  );
}

function governingOfficeByKey(
  world: World,
  officeKey: string,
): GoverningOffice | null {
  return (
    currentGoverningOffices(world).find(
      (office) => office.officeKey === officeKey,
    ) ?? null
  );
}

/* ------------------------------------------------------------------ *
 * Staff
 * ------------------------------------------------------------------ */

export const CHIEF_OF_STAFF_CLASSIFICATION =
  "service:executive-chief-of-staff" as const;

/** The office's current chief of staff, if one has been hired. */
export function chiefOfStaffFor(
  world: World,
  office: GoverningOffice,
): EntityId | null {
  for (const personId of world.personOrder) {
    const active = activeWorkRelationshipsAt(world, personId).some(
      ({ relationship, role }) =>
        relationship.organizationId === office.organizationId &&
        relationship.kind === "employment:executive-staff" &&
        role.occupationClassification === CHIEF_OF_STAFF_CLASSIFICATION,
    );
    if (active) return personId;
  }
  return null;
}

/** Qualitative, seeded from the person: never a number shown to the player. */
export interface StaffAssessment {
  readonly background: string;
  readonly strength: string;
  readonly caution: string;
  /** Internal weight for outcomes; never rendered. */
  readonly steadiness: number;
}

const BACKGROUNDS = [
  "Ran a state agency division for years",
  "Managed a statewide campaign",
  "Served as a senior legislative aide",
  "Came from local government administration",
  "Worked on budget analysis for the legislature",
] as const;
const STRENGTHS = [
  "keeps a large office moving on schedule",
  "has working relationships with legislators of both parties",
  "reads a budget quickly and spots trouble early",
  "is trusted by agency career staff",
  "handles the press calmly under pressure",
] as const;
const CAUTIONS = [
  "has little experience with the legislature",
  "tends to centralize decisions",
  "is new to this state's agencies",
  "can be slow when a matter is politically sensitive",
  "has a thin network outside the capital",
] as const;

export function staffAssessment(personId: EntityId): StaffAssessment {
  const rng = new SeededRng(
    `${STATE_GOVERNING_VERSION}:assessment:${personId}`,
  );
  return {
    background: rng.pick(BACKGROUNDS),
    strength: rng.pick(STRENGTHS),
    caution: rng.pick(CAUTIONS),
    steadiness: rng.integer(1, 4),
  };
}

/* ------------------------------------------------------------------ *
 * Agenda vocabulary
 * ------------------------------------------------------------------ */

const PROGRAM_FAMILIES = [
  ...SERVICE_FAMILIES,
  ...FISCAL_INSTRUMENT_FAMILIES,
  ...PUBLIC_ADMINISTRATION_FAMILIES,
];

export function programFamilyTitle(familyKey: string): string | null {
  return (
    PROGRAM_FAMILIES.find((family) => family.familyKey === familyKey)?.title ??
    null
  );
}

/* ------------------------------------------------------------------ *
 * Matter records
 * ------------------------------------------------------------------ */

export interface GoverningMatterOption {
  readonly key: string;
  readonly label: string;
  /** What choosing it does, in plain terms. */
  readonly effect: string;
  readonly tradeoff: string;
  readonly personId: EntityId | null;
  readonly assessment: StaffAssessment | null;
}

export interface GoverningMatter {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly family: GoverningMatterFamily;
  readonly officeKey: string;
  readonly holderPersonId: EntityId;
  readonly openedAt: IsoDate;
  readonly deadline: IsoDate;
  readonly title: string;
  readonly ask: string;
  /** What happens if nobody decides by the deadline. */
  readonly ifIgnored: string;
  readonly options: readonly GoverningMatterOption[];
  readonly subjectKey: string | null;
  /** The real bill this matter is about, where a legislature filed one. */
  readonly measureId: EntityId | null;
  readonly openedEvent: HistoricalEvent;
  readonly workItemId: EntityId | null;
  readonly decision: HistoricalEvent | null;
  readonly status: "open" | "decided" | "lapsed";
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function measureTitle(world: World, measureId: EntityId | null): string | null {
  if (!measureId) return null;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === measureId,
  );
  return measure ? `${measure.designation}, ${measure.shortTitle}` : null;
}

function subjectLabel(subjectKey: string | null): string {
  return (
    (subjectKey ? programFamilyTitle(subjectKey) : null) ?? "the priority"
  ).toLowerCase();
}

const BUDGET_FLAT = "budget:hold-flat";

function optionsFor(
  world: World,
  family: GoverningMatterFamily,
  event: HistoricalEvent,
): readonly GoverningMatterOption[] {
  switch (family) {
    case "chief-of-staff":
      return event.participants
        .filter((participant) => participant.role === "focus:candidate")
        .flatMap(({ personId }) => {
          const person = world.people[personId];
          if (!person) return [];
          const assessment = staffAssessment(personId);
          return [
            {
              key: `hire:${personId}`,
              label: `Hire ${personName(person)}`,
              effect:
                "Becomes chief of staff, recommends choices and can take matters you hand over.",
              tradeoff: `${assessment.background}; ${assessment.strength}, but ${assessment.caution}.`,
              personId,
              assessment,
            },
          ];
        });
    case "agenda": {
      const keys = event.tags
        .filter((tag) => tag.startsWith("program:"))
        .map((tag) => tag.slice("program:".length));
      return [
        ...keys.flatMap((familyKey) => {
          const title = programFamilyTitle(familyKey);
          return title
            ? [
                {
                  key: `priority:${familyKey}`,
                  label: title,
                  effect: `Agencies are told ${title.toLowerCase()} comes first this year.`,
                  tradeoff:
                    "Staff time and attention go here before other requests.",
                  personId: null,
                  assessment: null,
                },
              ]
            : [];
        }),
        {
          key: "priority:none",
          label: "No single priority",
          effect: "Agencies keep their current plans.",
          tradeoff: "Nothing is disrupted, and nothing is pushed forward.",
          personId: null,
          assessment: null,
        },
      ];
    }
    case "budget": {
      const keys = event.tags
        .filter((tag) => tag.startsWith("program:"))
        .map((tag) => tag.slice("program:".length));
      return [
        ...keys.flatMap((familyKey) => {
          const title = programFamilyTitle(familyKey);
          return title
            ? [
                {
                  key: `budget:${familyKey}`,
                  label: `Put more into ${title.toLowerCase()}`,
                  effect: `The budget you send the legislature asks for more for ${title.toLowerCase()}.`,
                  tradeoff:
                    "Other requests wait, and legislators may cut it back.",
                  personId: null,
                  assessment: null,
                },
              ]
            : [];
        }),
        {
          key: BUDGET_FLAT,
          label: "Hold spending where it is",
          effect: "The budget you send keeps this year's priorities.",
          tradeoff: "Easier to pass, and nothing new gets done.",
          personId: null,
          assessment: null,
        },
      ];
    }
    case "bill":
      return [
        {
          key: "bill:sign",
          label: "Sign it",
          effect: "It becomes law, and the agencies are told to carry it out.",
          tradeoff:
            "Its supporters are pleased; the work lands on your office.",
          personId: null,
          assessment: null,
        },
        {
          key: "bill:return",
          label: "Send it back unsigned",
          effect:
            "It goes back to the legislature, which may try to pass it over your objection.",
          tradeoff: "You stop it for now, and its supporters notice.",
          personId: null,
          assessment: null,
        },
      ];
    case "implementation":
      return [
        {
          key: "pace:fast",
          label: "Start now with existing staff",
          effect:
            "Work begins at once; a first report is due in about two months.",
          tradeoff: "Quicker, with a real chance of early problems.",
          personId: null,
          assessment: null,
        },
        {
          key: "pace:careful",
          label: "Plan it carefully first",
          effect:
            "Agencies plan before acting; a first report is due in about four months.",
          tradeoff: "Slower, and less likely to stumble.",
          personId: null,
          assessment: null,
        },
        {
          key: "pace:hold",
          label: "Hold it until the budget is settled",
          effect: "Nothing starts yet; the priority stays on the list.",
          tradeoff: "No risk now, and no progress to show.",
          personId: null,
          assessment: null,
        },
      ];
  }
}

const FAMILY_TEXT: Record<
  GoverningMatterFamily,
  {
    readonly title: (subject: string) => string;
    readonly ask: string;
    readonly ifIgnored: string;
  }
> = {
  "chief-of-staff": {
    title: () => "Choose a chief of staff",
    ask: "The office needs someone to run it day to day. Three people are available.",
    ifIgnored:
      "The office runs without a chief of staff. Nothing can be handed off, and every matter waits for you.",
  },
  agenda: {
    title: () => "Set the first priority",
    ask: "Agencies are asking what the governor wants done first.",
    ifIgnored: "Agencies keep their current plans. No priority is set.",
  },
  budget: {
    title: () => "Set the budget request",
    ask: "The budget office needs your priorities before the request goes to the legislature.",
    ifIgnored:
      "The budget office sends a request that keeps this year's priorities.",
  },
  bill: {
    title: (subject) => `A bill on ${subject} is on your desk`,
    ask: "The legislature passed it and sent it to you.",
    ifIgnored:
      "In this game, a bill the governor does not act on becomes law without a signature.",
  },
  implementation: {
    title: (subject) => `Direct the agencies on ${subject}`,
    ask: "The agencies are ready to act on your priority and need to know how fast to move.",
    ifIgnored: "The work does not start, and the priority stays unstarted.",
  },
};

const DEADLINE_DAYS: Record<GoverningMatterFamily, number> = {
  "chief-of-staff": 21,
  agenda: 30,
  implementation: 30,
  budget: 30,
  bill: 10,
};

function isFamily(value: string | null): value is GoverningMatterFamily {
  return value !== null && value in FAMILY_TEXT;
}

function matterFromEvent(
  world: World,
  event: HistoricalEvent,
): GoverningMatter | null {
  const family = tagValue(event, "matter-family:");
  const officeKey = tagValue(event, "office:");
  const deadline = tagValue(event, "deadline:");
  if (!isFamily(family) || !officeKey || !deadline) return null;
  const holderPersonId = event.participants.find(
    (participant) => participant.role === "agency:officeholder",
  )?.personId;
  if (!holderPersonId) return null;
  const subjectKey = tagValue(event, "subject:");
  const measureId = tagValue(event, "measure:") as EntityId | null;
  const decision =
    world.history.events.find(
      (candidate) =>
        candidate.type === GOVERNING_MATTER_DECIDED &&
        candidate.tags.includes(`matter:${event.id}`),
    ) ?? null;
  const workItem =
    world.history.workItems.find(
      (item) => item.stableKey === `${event.stableKey}:work`,
    ) ?? null;
  const text = FAMILY_TEXT[family];
  return {
    id: event.id,
    stableKey: event.stableKey,
    family,
    officeKey,
    holderPersonId,
    openedAt: event.occurredAt,
    deadline: makeIsoDate(deadline),
    title: text.title(
      measureTitle(world, measureId) ?? subjectLabel(subjectKey),
    ),
    ask: text.ask,
    ifIgnored:
      family === "bill" && measureId
        ? "No deadline for acting is established for this state's governor in the game, so the bill waits on your desk."
        : text.ifIgnored,
    options: optionsFor(world, family, event),
    subjectKey,
    measureId,
    openedEvent: event,
    workItemId: workItem?.id ?? null,
    decision,
    status: !decision
      ? "open"
      : decision.tags.includes("choice:lapsed")
        ? "lapsed"
        : "decided",
  };
}

export function governingMatters(
  world: World,
  officeKey?: string,
): readonly GoverningMatter[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === GOVERNING_MATTER_OPENED &&
        event.recordedAt <= world.currentDate &&
        (!officeKey || event.tags.includes(`office:${officeKey}`)),
    )
    .flatMap((event) => {
      const matter = matterFromEvent(world, event);
      return matter ? [matter] : [];
    });
}

export function governingMatterById(
  world: World,
  matterId: EntityId,
): GoverningMatter | null {
  const event = world.history.events.find((e) => e.id === matterId);
  return event && event.type === GOVERNING_MATTER_OPENED
    ? matterFromEvent(world, event)
    : null;
}

/** What the chief of staff would do, with a reason; null without one. */
export function staffRecommendation(
  world: World,
  matter: GoverningMatter,
): {
  readonly optionKey: string;
  readonly byPersonId: EntityId;
  readonly reason: string;
} | null {
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office) return null;
  const chief = chiefOfStaffFor(world, office);
  if (!chief || matter.options.length === 0) return null;
  const assessment = staffAssessment(chief);
  const rng = new SeededRng(`${matter.stableKey}:recommendation:${chief}`);
  switch (matter.family) {
    case "chief-of-staff":
      return null;
    case "agenda": {
      const real = matter.options.filter((o) => o.key !== "priority:none");
      const pick = real.length > 0 ? rng.pick(real) : matter.options[0]!;
      return {
        optionKey: pick.key,
        byPersonId: chief,
        reason: `${assessment.background}, and thinks ${pick.label.toLowerCase()} is where the office can show results.`,
      };
    }
    case "budget": {
      const priority = currentPriority(world, office);
      const match = priority
        ? matter.options.find((o) => o.key === `budget:${priority}`)
        : undefined;
      return match
        ? {
            optionKey: match.key,
            byPersonId: chief,
            reason: "It matches the priority you already set.",
          }
        : {
            optionKey: BUDGET_FLAT,
            byPersonId: chief,
            reason: "Nothing on the list is a stated priority yet.",
          };
    }
    case "bill":
      return matter.subjectKey &&
        currentPriority(world, office) === matter.subjectKey
        ? {
            optionKey: "bill:sign",
            byPersonId: chief,
            reason: "It moves the office's own priority.",
          }
        : rng.integer(0, 3) > 0
          ? {
              optionKey: "bill:sign",
              byPersonId: chief,
              reason: `${assessment.background}, and sees no reason to pick this fight.`,
            }
          : {
              optionKey: "bill:return",
              byPersonId: chief,
              reason: "Thinks the agencies cannot absorb it this year.",
            };
    case "implementation":
      return assessment.steadiness >= 2
        ? {
            optionKey: "pace:careful",
            byPersonId: chief,
            reason: "Would rather plan first than explain an early stumble.",
          }
        : {
            optionKey: "pace:fast",
            byPersonId: chief,
            reason: "Thinks the agencies are ready and delay costs momentum.",
          };
  }
}

/** The office's current first priority, from its latest agenda decision. */
export function currentPriority(
  world: World,
  office: GoverningOffice,
): string | null {
  const decision = [...world.history.events]
    .reverse()
    .find(
      (event) =>
        event.type === GOVERNING_MATTER_DECIDED &&
        event.tags.includes(`office:${office.officeKey}`) &&
        event.tags.includes("matter-family:agenda") &&
        event.involvedEntityIds.includes(office.holderPersonId),
    );
  const choice = decision ? tagValue(decision, "choice:priority:") : null;
  return choice && choice !== "none" ? choice : null;
}

/* ------------------------------------------------------------------ *
 * Opening matters
 * ------------------------------------------------------------------ */

function emptyContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function createCandidates(
  world: World,
  office: GoverningOffice,
  matterKey: string,
  count: number,
): { world: World; personIds: EntityId[] } {
  let next = world;
  const personIds: EntityId[] = [];
  const anchorYear = Number(world.currentDate.slice(0, 4));
  for (let index = 0; index < count; index += 1) {
    const stableKey = `${matterKey}:candidate:${index}`;
    const rng = new SeededRng(world.seed).fork(stableKey);
    next = applyCharacterHistoryPlan(next, {
      stableKey,
      mode: "quick-generated",
      personId: office.holderPersonId,
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey,
            ...drawCanonicalName(rng.fork("name")),
            identity: generatePersonIdentity(rng.fork("identity")),
            birthDate: makeIsoDate(
              `${anchorYear - rng.integer(34, 62)}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
            ),
            homeJurisdictionId: office.jurisdictionId,
          },
        },
      ],
    }).world;
    personIds.push(
      createStableId("person", `${next.id}:life-context-v1:${stableKey}`),
    );
  }
  return { world: next, personIds };
}

interface OpenMatterInput {
  readonly family: GoverningMatterFamily;
  readonly instance: string;
  readonly candidatePersonIds?: readonly EntityId[];
  readonly programKeys?: readonly string[];
  readonly subjectKey?: string | null;
  readonly sourceEventId?: EntityId | null;
  readonly measureId?: EntityId | null;
}

function matterStableKey(
  office: GoverningOffice,
  family: GoverningMatterFamily,
  instance: string,
): string {
  return `${STATE_GOVERNING_VERSION}:${office.officeKey}:${office.termId}:${family}:${instance}`;
}

function openMatter(
  world: World,
  office: GoverningOffice,
  input: OpenMatterInput,
): World {
  const stableKey = matterStableKey(office, input.family, input.instance);
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const deadline = addDays(world.currentDate, DEADLINE_DAYS[input.family]);
  const text = FAMILY_TEXT[input.family];
  const title = text.title(
    measureTitle(world, input.measureId ?? null) ??
      subjectLabel(input.subjectKey ?? null),
  );
  let next = recordWorldEvent(world, {
    stableKey,
    type: GOVERNING_MATTER_OPENED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      office.holderPersonId,
      office.organizationId,
      ...(input.candidatePersonIds ?? []),
    ],
    participants: [
      {
        personId: office.holderPersonId,
        role: "agency:officeholder",
        detail: office.title,
      },
      ...(input.candidatePersonIds ?? []).map((personId) => ({
        personId,
        role: "focus:candidate" as const,
        detail: null,
      })),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      STATE_GOVERNING_VERSION,
      `matter-family:${input.family}`,
      `office:${office.officeKey}`,
      `deadline:${deadline}`,
      ...(input.subjectKey ? [`subject:${input.subjectKey}`] : []),
      ...(input.sourceEventId ? [`source-event:${input.sourceEventId}`] : []),
      ...(input.measureId ? [`measure:${input.measureId}`] : []),
      ...(input.programKeys ?? []).map((key) => `program:${key}`),
    ],
    summary: `${office.title}: ${title}.`,
    context: emptyContext(),
  });
  const opened = next.history.events.at(-1)!;
  if (office.controlledByPlayer) {
    next = createWorkItem(next, {
      stableKey: `${stableKey}:work`,
      title,
      summary: text.ask,
      jurisdictionId: office.jurisdictionId,
      sourceEntityIds: [opened.id],
      focus: {
        kind: "other",
        targetKey: `governing-matter:${opened.id}`,
        sourceEntityId: opened.id,
      },
      effort: null,
      access: { kind: "private", personIds: [office.holderPersonId] },
      assignedPersonIds: [office.holderPersonId],
      playerRequirement: "decision",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
    // A real bill's action deadline is the state's law, which the game does
    // not compile: the bill waits on the desk rather than lapsing by rule.
    if (input.family === "bill" && input.measureId) return next;
    return scheduleFutureDueItem(next, {
      stableKey: `${stableKey}:deadline`,
      dueAt: deadline,
      transitionKey: GOVERNING_DEADLINE,
      entityIds: [opened.id],
      jurisdictionId: office.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [opened.id] },
    });
  }
  const rng = new SeededRng(`${stableKey}:npc-timing`);
  return scheduleFutureDueItem(next, {
    stableKey: `${stableKey}:npc`,
    dueAt: addDays(
      world.currentDate,
      rng.integer(3, DEADLINE_DAYS[input.family]),
    ),
    transitionKey: GOVERNING_NPC_DECISION,
    entityIds: [opened.id],
    jurisdictionId: office.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [opened.id] },
  });
}

/**
 * The first days in office: the office needs a chief of staff and a first
 * priority. Opened once per term, the day after entry.
 */
export function openTransitionMatters(world: World, officeKey: string): World {
  const office = governingOfficeByKey(world, officeKey);
  if (!office) return world;
  const key = matterStableKey(office, "chief-of-staff", "transition");
  if (world.history.events.some((event) => event.stableKey === key))
    return world;
  const candidates = createCandidates(world, office, key, 3);
  let next = openMatter(candidates.world, office, {
    family: "chief-of-staff",
    instance: "transition",
    candidatePersonIds: candidates.personIds,
  });
  const rng = new SeededRng(`${key}:agenda`);
  const pool = PROGRAM_FAMILIES.map((family) => family.familyKey);
  const programKeys: string[] = [];
  while (programKeys.length < 3 && pool.length > 0) {
    programKeys.push(pool.splice(rng.integer(0, pool.length), 1)[0]!);
  }
  next = openMatter(next, office, {
    family: "agenda",
    instance: "first-year",
    programKeys,
  });
  return next;
}

/* ------------------------------------------------------------------ *
 * Deciding
 * ------------------------------------------------------------------ */

export type GoverningDecisionMode = "player" | "delegated" | "officeholder";

function completeWork(
  world: World,
  matter: GoverningMatter,
  outcomeEventId: EntityId,
  status: "completed" | "cancelled",
): World {
  if (!matter.workItemId) return world;
  const previous = workItemState(world, matter.workItemId);
  if (previous.status === "completed" || previous.status === "cancelled")
    return world;
  const stableKey = `${matter.stableKey}:work:${status}`;
  const state: WorkItemStateRecord = {
    ...previous,
    id: createStableId("work-item-state", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentMoment,
    status,
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    outcomeEventId,
    supersedesStateId: previous.id,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [...world.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function decisionSummary(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
  option: GoverningMatterOption | null,
): { summary: string; visibility: "public" | "limited" } {
  const holder = world.people[office.holderPersonId];
  const who = holder ? personName(holder) : office.title;
  if (!option)
    return {
      summary:
        matter.family === "bill"
          ? `A bill on ${subjectLabel(matter.subjectKey)} became law without the signature of ${who}, ${office.title}.`
          : `${matter.title}: no decision was made by the deadline. ${matter.ifIgnored}`,
      visibility: matter.family === "bill" ? "public" : "limited",
    };
  switch (matter.family) {
    case "chief-of-staff": {
      const hired = option.personId ? world.people[option.personId] : null;
      return {
        summary: `${who}, ${office.title}, named ${hired ? personName(hired) : "a new"} chief of staff.`,
        visibility: "public",
      };
    }
    case "agenda":
      return option.key === "priority:none"
        ? {
            summary: `${who}, ${office.title}, left agency plans as they were.`,
            visibility: "limited",
          }
        : {
            summary: `${who}, ${office.title}, made ${option.label.toLowerCase()} the office's first priority.`,
            visibility: "public",
          };
    case "budget":
      return option.key === BUDGET_FLAT
        ? {
            summary: `${who}, ${office.title}, sent the legislature a budget that holds spending where it is.`,
            visibility: "public",
          }
        : {
            summary: `${who}, ${office.title}, asked the legislature for more money for ${subjectLabel(option.key.slice("budget:".length))}.`,
            visibility: "public",
          };
    case "bill":
      return option.key === "bill:sign"
        ? {
            summary: `${who}, ${office.title}, signed ${measureTitle(world, matter.measureId) ?? `a bill on ${subjectLabel(matter.subjectKey)}`} into law.`,
            visibility: "public",
          }
        : {
            summary: `${who}, ${office.title}, ${matter.measureId ? `vetoed ${measureTitle(world, matter.measureId) ?? "the bill"}` : `sent back a bill on ${subjectLabel(matter.subjectKey)} unsigned`}.`,
            visibility: "public",
          };
    case "implementation":
      return option.key === "pace:hold"
        ? {
            summary: `${office.title} held work on ${subjectLabel(matter.subjectKey)} until the budget is settled.`,
            visibility: "limited",
          }
        : {
            summary: `${office.title} directed state agencies to begin work on ${subjectLabel(matter.subjectKey)}.`,
            visibility: "public",
          };
  }
}

function applyConsequence(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
  option: GoverningMatterOption | null,
  decisionEventId: EntityId,
): World {
  if (!option) {
    // A lapsed bill still becomes law, so the agencies still get the work.
    return matter.family === "bill" && matter.subjectKey
      ? openMatter(world, office, {
          family: "implementation",
          instance: `law:${matter.id}`,
          subjectKey: matter.subjectKey,
          sourceEventId: decisionEventId,
        })
      : world;
  }
  switch (matter.family) {
    case "chief-of-staff": {
      if (!option.personId || !world.people[option.personId]) return world;
      return createWorkRelationship(world, {
        stableKey: `${matter.stableKey}:hire`,
        personId: option.personId,
        organizationId: office.organizationId,
        startedAt: world.currentDate,
        initialStatus: "active",
        kind: "employment:executive-staff",
        compensation: "paid",
        authority: "directs-others",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "simulated-event", eventId: decisionEventId },
        initialRole: {
          title: "Chief of Staff",
          occupationClassification: CHIEF_OF_STAFF_CLASSIFICATION,
          locationJurisdictionId: office.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 45, maximumHours: 60 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "mixed",
            interruptibility: "limited",
            locationJurisdictionId: office.jurisdictionId,
          },
        },
      });
    }
    case "agenda": {
      if (option.key === "priority:none") return world;
      const subjectKey = option.key.slice("priority:".length);
      return openMatter(world, office, {
        family: "implementation",
        instance: subjectKey,
        subjectKey,
        sourceEventId: decisionEventId,
      });
    }
    case "budget":
      return scheduleFollowUp(world, office, matter, decisionEventId, 90);
    case "bill": {
      if (matter.measureId) {
        // A real bill: the decision is the governor's legislative act, and
        // what follows (enactment, or the legislature's override) runs
        // through the legislature's own steps.
        const signed = option.key === "bill:sign";
        let next = recordGovernorDecisionOnMeasure(
          world,
          matter.measureId,
          signed ? "signed" : "vetoed",
          signed
            ? "The governor signed the bill."
            : "The governor vetoed the bill and returned it.",
        );
        next = scheduleInstitutionStep(next, matter.measureId);
        return signed
          ? openMatter(next, office, {
              family: "implementation",
              instance: `law:${matter.id}`,
              subjectKey: matter.subjectKey,
              measureId: matter.measureId,
              sourceEventId: decisionEventId,
            })
          : next;
      }
      return option.key === "bill:sign"
        ? openMatter(world, office, {
            family: "implementation",
            instance: `law:${matter.id}`,
            subjectKey: matter.subjectKey,
            sourceEventId: decisionEventId,
          })
        : scheduleFollowUp(world, office, matter, decisionEventId, 21);
    }
    case "implementation": {
      if (option.key === "pace:hold") return world;
      const days = option.key === "pace:fast" ? 60 : 120;
      return scheduleFutureDueItem(world, {
        stableKey: `${matter.stableKey}:report`,
        dueAt: addDays(world.currentDate, days),
        transitionKey: GOVERNING_FOLLOW_UP,
        entityIds: [matter.id, decisionEventId].sort(),
        jurisdictionId: office.jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [matter.id, decisionEventId].sort(),
        },
      });
    }
  }
}

function scheduleFollowUp(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
  decisionEventId: EntityId,
  days: number,
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${matter.stableKey}:report`,
    dueAt: addDays(world.currentDate, days),
    transitionKey: GOVERNING_FOLLOW_UP,
    entityIds: [matter.id, decisionEventId].sort(),
    jurisdictionId: office.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [matter.id, decisionEventId].sort(),
    },
  });
}

function recordDecision(
  world: World,
  matter: GoverningMatter,
  option: GoverningMatterOption | null,
  mode: GoverningDecisionMode | "lapsed",
  deciderPersonId: EntityId,
): World {
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    throw new Error("This matter no longer belongs to a current office.");
  const { summary, visibility } = decisionSummary(
    world,
    office,
    matter,
    option,
  );
  let next = recordWorldEvent(world, {
    stableKey: `${matter.stableKey}:decided`,
    type: GOVERNING_MATTER_DECIDED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      office.holderPersonId,
      office.organizationId,
      ...(matter.workItemId ? [matter.workItemId] : []),
      ...(option?.personId ? [option.personId] : []),
      ...(deciderPersonId !== office.holderPersonId ? [deciderPersonId] : []),
    ],
    participants: [
      { personId: deciderPersonId, role: "agency:decider", detail: mode },
      ...(option?.personId
        ? [
            {
              personId: option.personId,
              role: "impact:appointed" as const,
              detail: "Chief of Staff",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility,
    tags: [
      STATE_GOVERNING_VERSION,
      `matter-family:${matter.family}`,
      `office:${matter.officeKey}`,
      `matter:${matter.id}`,
      `choice:${option?.key ?? "lapsed"}`,
      `decided-by:${mode}`,
    ],
    summary,
    context: { ...emptyContext(), choice: option?.label ?? "No decision" },
  });
  const decision = next.history.events.at(-1)!;
  next = completeWork(
    next,
    matter,
    decision.id,
    option ? "completed" : "cancelled",
  );
  return applyConsequence(next, office, matter, option, decision.id);
}

export type GoverningActionResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };

function openMatterForPlayer(
  world: World,
  matterId: EntityId,
): GoverningMatter | string {
  const matter = governingMatterById(world, matterId);
  if (!matter) return "That matter is not on record.";
  if (matter.status !== "open") return "That matter has already been settled.";
  if (controlledPersonId(world) !== matter.holderPersonId)
    return "Only the officeholder can decide this.";
  if (world.currentDate > matter.deadline) return "The deadline has passed.";
  return matter;
}

/** The player's own decision. */
export function decideGoverningMatter(
  world: World,
  matterId: EntityId,
  optionKey: string,
): GoverningActionResult {
  const matter = openMatterForPlayer(world, matterId);
  if (typeof matter === "string") return { ok: false, world, reason: matter };
  const option = matter.options.find((o) => o.key === optionKey);
  if (!option)
    return { ok: false, world, reason: "That choice is not available." };
  return {
    ok: true,
    world: recordDecision(
      world,
      matter,
      option,
      "player",
      matter.holderPersonId,
    ),
  };
}

/** Hand the matter to the chief of staff, who takes their own recommendation. */
export function delegateGoverningMatter(
  world: World,
  matterId: EntityId,
): GoverningActionResult {
  const matter = openMatterForPlayer(world, matterId);
  if (typeof matter === "string") return { ok: false, world, reason: matter };
  const recommendation = staffRecommendation(world, matter);
  if (!recommendation)
    return {
      ok: false,
      world,
      reason:
        matter.family === "chief-of-staff"
          ? "Choosing the chief of staff is yours to do."
          : "There is no chief of staff to hand this to.",
    };
  const option = matter.options.find(
    (o) => o.key === recommendation.optionKey,
  )!;
  return {
    ok: true,
    world: recordDecision(
      world,
      matter,
      option,
      "delegated",
      recommendation.byPersonId,
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Canonical-time handlers
 * ------------------------------------------------------------------ */

function resolved(
  world: World,
  context: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function matterForDue(world: World, due: FutureDueItem) {
  for (const id of due.entityIds) {
    const matter = governingMatterById(world, id);
    if (matter) return matter;
  }
  return null;
}

/** Scheduled by term entry for the next day, when the office is on record. */
export function scheduleGoverningTransition(
  world: World,
  input: {
    readonly relationshipId: EntityId;
    readonly entryDate: IsoDate;
    readonly jurisdictionId: EntityId;
  },
): World {
  const stableKey = `${STATE_GOVERNING_VERSION}:transition:${input.relationshipId}`;
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(input.entryDate, 1),
    transitionKey: GOVERNING_TRANSITION,
    entityIds: [input.relationshipId],
    jurisdictionId: input.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [input.relationshipId],
    },
  });
}

export function governingTransitionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const office = currentGoverningOffices(world).find((candidate) =>
    due.entityIds.includes(candidate.termId),
  );
  if (!office)
    return resolved(
      world,
      "The term this transition belonged to is not current.",
    );
  return resolved(
    openTransitionMatters(world, office.officeKey),
    "The new office's first matters were opened.",
  );
}

export function governingDeadlineHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const matter = matterForDue(world, due);
  if (!matter || matter.status !== "open")
    return resolved(world, "The matter was already settled.");
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    return resolved(world, "The office changed hands before the deadline.");
  return resolved(
    recordDecision(world, matter, null, "lapsed", matter.holderPersonId),
    "The deadline passed without a decision.",
  );
}

export function governingNpcDecisionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const matter = matterForDue(world, due);
  if (!matter || matter.status !== "open")
    return resolved(world, "The matter was already settled.");
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    return resolved(world, "The office changed hands.");
  if (matter.options.length === 0)
    return resolved(
      recordDecision(world, matter, null, "lapsed", matter.holderPersonId),
      "No available choice.",
    );
  const recommendation = staffRecommendation(world, matter);
  const rng = new SeededRng(`${matter.stableKey}:npc-choice`);
  const recommended =
    recommendation && rng.integer(0, 4) > 0
      ? matter.options.find((o) => o.key === recommendation.optionKey)
      : undefined;
  const option = recommended ?? rng.pick(matter.options);
  return resolved(
    recordDecision(
      world,
      matter,
      option,
      "officeholder",
      matter.holderPersonId,
    ),
    "The officeholder decided.",
  );
}

export type ImplementationResult = "progress" | "problem" | "stalled";

interface FollowUpOutcome {
  readonly tag: string;
  readonly summary: string;
}

function implementationOutcome(
  world: World,
  matter: GoverningMatter,
  decision: HistoricalEvent,
  office: GoverningOffice | null,
  rng: SeededRng,
): FollowUpOutcome {
  const pace = tagValue(decision, "choice:");
  const chief = office ? chiefOfStaffFor(world, office) : null;
  const steadiness = chief ? staffAssessment(chief).steadiness : 0;
  const funded =
    office && matter.subjectKey
      ? world.history.events.some(
          (event) =>
            event.type === GOVERNING_OUTCOME &&
            event.tags.includes(`office:${office.officeKey}`) &&
            event.tags.includes(`funded:${matter.subjectKey}`),
        )
      : false;
  // A careful plan, a steady chief of staff and money the legislature
  // actually approved all lower the chance of an early problem; an office
  // that changed hands lets the work stall.
  const roll =
    rng.integer(0, 10) +
    (pace === "pace:careful" ? 3 : 0) +
    steadiness +
    (funded ? 2 : 0);
  const result: ImplementationResult = !office
    ? "stalled"
    : roll >= 6
      ? "progress"
      : "problem";
  const subject = subjectLabel(matter.subjectKey);
  return {
    tag: `implementation:${result}`,
    summary:
      result === "progress"
        ? `State agencies reported steady early progress on ${subject}.`
        : result === "problem"
          ? `State agencies reported delays and a staffing gap in the early work on ${subject}.`
          : `Work on ${subject} stalled after the office changed hands.`,
  };
}

function budgetOutcome(
  world: World,
  decision: HistoricalEvent,
  office: GoverningOffice | null,
  rng: SeededRng,
): FollowUpOutcome & { readonly funded: string | null } {
  const choice = tagValue(decision, "choice:budget:");
  const chief = office ? chiefOfStaffFor(world, office) : null;
  const skilled = chief
    ? staffAssessment(chief).strength.includes("legislators")
    : false;
  if (!choice || choice === "hold-flat")
    return {
      tag: "budget:passed-flat",
      summary: "The legislature passed a budget that holds spending steady.",
      funded: null,
    };
  const subject = subjectLabel(choice);
  const passed = rng.integer(0, 10) + (skilled ? 3 : 0) >= 5;
  return passed
    ? {
        tag: "budget:passed-with-request",
        summary: `The legislature passed a budget with more money for ${subject}, as the governor asked.`,
        funded: choice,
      }
    : {
        tag: "budget:request-cut",
        summary: `The legislature passed a budget that cut the governor's request for ${subject}.`,
        funded: null,
      };
}

function returnedBillOutcome(
  matter: GoverningMatter,
  rng: SeededRng,
): FollowUpOutcome & { readonly overridden: boolean } {
  const subject = subjectLabel(matter.subjectKey);
  const overridden =
    rng.integer(0, 100) < STATE_GOVERNING_CALENDAR.overrideSucceedsPercent;
  return overridden
    ? {
        tag: "bill:overridden",
        summary: `The legislature passed the bill on ${subject} over the governor's objection.`,
        overridden,
      }
    : {
        tag: "bill:returned-stands",
        summary: `The legislature did not pass the bill on ${subject} again; it does not become law.`,
        overridden,
      };
}

/** A dated follow-up: the recorded consequence of an earlier decision. */
export function governingFollowUpHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const matter = matterForDue(world, due);
  const decision = matter?.decision;
  if (!matter || !decision)
    return resolved(world, "No decided matter stands behind this report.");
  const office = governingOfficeByKey(world, matter.officeKey);
  const currentOffice =
    office && office.holderPersonId === matter.holderPersonId ? office : null;
  const rng = new SeededRng(`${due.stableKey}:outcome`);
  let outcome: FollowUpOutcome;
  let extraTags: string[] = [];
  let reopen: "implementation" | null = null;
  if (matter.family === "budget") {
    const budget = budgetOutcome(world, decision, currentOffice, rng);
    outcome = budget;
    if (budget.funded) extraTags = [`funded:${budget.funded}`];
  } else if (matter.family === "bill") {
    const returned = returnedBillOutcome(matter, rng);
    outcome = returned;
    if (returned.overridden) reopen = "implementation";
  } else {
    outcome = implementationOutcome(
      world,
      matter,
      decision,
      currentOffice,
      rng,
    );
  }
  let next = recordWorldEvent(world, {
    stableKey: `${due.stableKey}:outcome`,
    type: GOVERNING_OUTCOME,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: due.jurisdictionId ?? matter.openedEvent.jurisdictionId,
    involvedEntityIds: [matter.holderPersonId],
    participants: [
      {
        personId: matter.holderPersonId,
        role: "focus:responsible-office",
        detail: outcome.tag,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_GOVERNING_VERSION,
      `office:${matter.officeKey}`,
      outcome.tag,
      `matter:${matter.id}`,
      `decision:${decision.id}`,
      ...(matter.subjectKey ? [`subject:${matter.subjectKey}`] : []),
      ...extraTags,
    ],
    summary: outcome.summary,
    context: emptyContext(),
  });
  if (reopen && currentOffice && matter.subjectKey)
    next = openMatter(next, currentOffice, {
      family: "implementation",
      instance: `law:${matter.id}`,
      subjectKey: matter.subjectKey,
      sourceEventId: next.history.events.at(-1)!.id,
    });
  return resolved(next, outcome.summary);
}

/* ------------------------------------------------------------------ *
 * Seasons
 * ------------------------------------------------------------------ */

export function governingSeasonHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match =
    /^state-governing\/v1:season:(.+):(budget|bill):(\d{4}-\d{2}-\d{2})$/.exec(
      due.stableKey,
    );
  if (!match) return resolved(world, "Not a season item.");
  const [, officeKey, kind] = match;
  const office = governingOfficeByKey(world, officeKey!);
  let next = world;
  if (office) {
    const rng = new SeededRng(`${due.stableKey}:subject`);
    const pool = PROGRAM_FAMILIES.map((family) => family.familyKey);
    if (kind === "budget") {
      const priority = currentPriority(world, office);
      const programKeys = [
        ...(priority ? [priority] : []),
        ...pickDistinct(
          rng.fork("budget"),
          pool.filter((key) => key !== priority),
          priority ? 1 : 2,
        ),
      ];
      next = openMatter(next, office, {
        family: "budget",
        instance: due.dueAt,
        programKeys,
      });
    } else {
      next = openMatter(next, office, {
        family: "bill",
        instance: due.dueAt,
        subjectKey: rng.pick(pool),
      });
    }
    next = scheduleGoverningSeasons(next, officeKey!, office.jurisdictionId);
  }
  return resolved(next, `The ${kind} season arrived.`);
}

/**
 * A bill on the governor's desk. The player governor gets a bound matter; a
 * non-player governor acts on an authored disposition where the bill carries
 * one, and otherwise decides in the ordinary course through the same matter.
 * Without a materialized governorship, an authored disposition still stands
 * and nothing is invented.
 */
export const governorDesk: ExecutiveDeskHandler = (
  world,
  measure,
  blueprint,
) => {
  const stateUsps = blueprint.pack.jurisdictionKey.replace(/^US-/, "");
  const office = currentGoverningOffices(world).find(
    (candidate) => candidate.stateUsps === stateUsps,
  );
  const alreadyOpen = world.history.events.some(
    (event) =>
      event.type === GOVERNING_MATTER_OPENED &&
      event.tags.includes(`measure:${measure.id}`) &&
      event.tags.includes("matter-family:bill"),
  );
  if (alreadyOpen) return world;
  if (office && (office.controlledByPlayer || !blueprint.governorAction))
    return openMatter(world, office, {
      family: "bill",
      instance: `measure:${measure.id}`,
      measureId: measure.id,
    });
  if (blueprint.governorAction) {
    const next = recordGovernorDecisionOnMeasure(
      world,
      measure.id,
      blueprint.governorAction,
      blueprint.governorRationale,
    );
    return scheduleInstitutionStep(next, measure.id);
  }
  return world;
};

export const STATE_GOVERNING_HANDLERS = [
  [LEGISLATIVE_INSTITUTION_STEP, createInstitutionStepHandler(governorDesk)],
  [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
  [GOVERNING_SEASON, governingSeasonHandler],
  [GOVERNING_TRANSITION, governingTransitionHandler],
  [GOVERNING_DEADLINE, governingDeadlineHandler],
  [GOVERNING_NPC_DECISION, governingNpcDecisionHandler],
  [GOVERNING_FOLLOW_UP, governingFollowUpHandler],
] as const;

/** Recorded decisions and outcomes for an office, newest first. */
export function governingOutcomes(
  world: World,
  officeKey: string,
): readonly HistoricalEvent[] {
  return world.history.events
    .filter(
      (event) =>
        (event.type === GOVERNING_OUTCOME ||
          event.type === GOVERNING_MATTER_DECIDED) &&
        event.tags.includes(`office:${officeKey}`) &&
        event.recordedAt <= world.currentDate,
    )
    .reverse();
}
