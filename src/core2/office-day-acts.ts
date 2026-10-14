/**
 * Acts of office in the day's choices (office play, OFFICE-LOCAL): office
 * hours with the office's casework, a town hall, an interview and a meeting
 * with a department head. They are offered to the officeholder the player
 * controls, take the hours their row names, and run through the engines
 * that own each act (constituent cases, meetings, the press, relationships).
 *
 * Doing or simulating: the player may prepare what they will say or decide
 * (`prepareAct`); whatever they leave is the character's own, by the same
 * rule those engines use for any official. Other officials keep their
 * background equivalents in those engines (office hours on the cases
 * calendar, town halls from causes, interviews the outlets ask for).
 */
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreData,
  CoreState,
  PersonState,
} from "./types";
import type { ModuleRow } from "./module-data";
import { extendData } from "./data";
import { decisionLean } from "./trait-decisions";
import { campaignParameter } from "./campaign-views";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";
import { casesFor, handleCase } from "./modules/constituent-cases";
import { holdTownHall } from "./modules/meetings";
import {
  answerInterview,
  candidateAnswers,
  followersOf,
  officeholderSpeaker,
  outletsHere,
  requestInterview,
} from "./modules/press";
import { appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";

export const OFFICE_DUTY = "office-duty";
const DEPARTMENT_HEAD = "department-head";

const act = (
  id: string,
  effortParameter: string,
  actKinds: readonly string[],
  targetKind = OFFICE_DUTY,
): ActionDefinition => ({
  id,
  actKinds,
  goalKinds: ["change-condition"],
  need: "safety",
  effortParameter,
  effectParameter: "one",
  targetKind,
  effect: id,
  emotion: {
    moodMultiplierParameter: "one",
    stressMultiplierParameter: "one",
  },
});

export const OFFICE_ACTS: readonly ActionDefinition[] = [
  act("office-hours", "officeHoursActHours", [
    "engage",
    "cooperate",
    "follow-rules",
  ]),
  act("town-hall", "townHallActHours", ["speak-out", "engage", "take-risk"]),
  act("interview", "interviewActHours", ["speak-out", "take-risk"]),
  act(
    "meet-department-head",
    "meetHeadActHours",
    ["cooperate", "engage"],
    DEPARTMENT_HEAD,
  ),
];

const HOURS = (
  value: number,
  citation: string,
  estimatedFrom: string,
  spread: [number, number],
) => ({ value, tag: "ESTIMATED" as const, citation, estimatedFrom, spread });

/** The core data with the acts of office and their hours. */
export function officeDayData(base: CoreData): CoreData {
  return extendData(base, {
    actions: [...OFFICE_ACTS],
    parameters: {
      officeHoursActHours: HOURS(
        2,
        "A local official's office hours: a two-hour block once or twice a month is the common published schedule for council members' constituent hours.",
        "Published council office-hour schedules; two hours is the modal block.",
        [1, 4],
      ),
      townHallActHours: HOURS(
        1.5,
        "A local town hall runs about an hour to ninety minutes (Congressional Management Foundation 2017, 'Citizen-Centric Advocacy'; local forums run the same length).",
        "Typical town hall length.",
        [1, 2.5],
      ),
      interviewActHours: HOURS(
        0.75,
        "A local newspaper or radio interview with an official: about thirty minutes to an hour with travel.",
        "Typical local interview length.",
        [0.5, 1.5],
      ),
      meetHeadActHours: HOURS(
        1,
        "A standing meeting between an elected official and a department head: about an hour.",
        "Typical one-on-one briefing length.",
        [0.5, 2],
      ),
    } as unknown as CoreData["parameters"],
  });
}

// ---- Who may take them ---------------------------------------------------

/** The person the player controls, for whom the acts are offered. */
const controlled = (api: CoreAPI) =>
  snapshotExplicitControlV1(api.state).personId ??
  (api.state as CoreState).playerId;

export interface OfficeActHost {
  /** The local offices the actor holds now. */
  officesOf(api: CoreAPI, personId: string): readonly string[];
  /** Keep the act on the record, done by the player or the character. */
  keep(
    api: CoreAPI,
    row: {
      personId: string;
      kind: string;
      how: "did" | "own-choice";
      recordId: string;
      position: number | null;
      detail: string;
    },
  ): void;
  /** What the player prepared for an act, if anything. */
  prepared(api: CoreAPI, personId: string, actId: string): Prepared | null;
  /** The prepared content is used once. */
  clearPrepared(api: CoreAPI, personId: string, actId: string): void;
}

export interface Prepared {
  /** Positions by question for a town hall or an interview; null declines. */
  readonly answers?: Readonly<Record<string, number | null>>;
  /** Decisions by case id for office hours. */
  readonly cases?: Readonly<Record<string, "help" | "decline">>;
}

export function officeActProviders(host: OfficeActHost) {
  const holds = (api: CoreAPI, actor: Readonly<PersonState>) =>
    actor.id === controlled(api) && host.officesOf(api, actor.id).length > 0;
  return {
    [OFFICE_DUTY]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] =>
      holds(api, actor)
        ? [
            {
              definition: action,
              targetId: host.officesOf(api, actor.id)[0]!,
              availableHours: api.parameter(action.effortParameter),
            },
          ]
        : [],
    [DEPARTMENT_HEAD]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] =>
      holds(api, actor)
        ? appointmentsIn(api, lawChain(api).townPlaceId)
            .filter(
              (row) =>
                row.holderId !== actor.id &&
                api.state.people.get(row.holderId)?.alive,
            )
            .map((row) => ({
              definition: action,
              targetId: row.holderId,
              availableHours: api.parameter(action.effortParameter),
            }))
        : [],
  };
}

// ---- What they do --------------------------------------------------------

export function officeActHandlers(host: OfficeActHost) {
  return {
    /**
     * The office's open cases are decided: the player's prepared decisions,
     * else the character's own sense of duty, the rule every office uses
     * for a case nobody decided. stopgapId: SG-OFFICE-case-rule-copy
     */
    "office-hours": (api: CoreAPI, actorId: string) => {
      const prepared = host.prepared(api, actorId, "office-hours");
      const person = api.state.people.get(actorId);
      for (const row of casesFor(api, actorId)) {
        if (row.status !== "open") continue;
        const chosen = prepared?.cases?.[row.id];
        let decision = chosen;
        let duty: number | null = null;
        if (!decision) {
          api.stopgap("SG-OFFICE-case-rule-copy");
          duty =
            campaignParameter("constituentHelpBase") +
            (person
              ? decisionLean(
                  api.state,
                  person,
                  "constituent-cases.handle-case",
                  "help",
                  "turn-away",
                )
              : 0);
          decision = duty > 0 ? "help" : "decline";
        }
        handleCase(api, row.id, decision);
        host.keep(api, {
          personId: actorId,
          kind: "case",
          how: chosen ? "did" : "own-choice",
          recordId: row.id,
          position: duty,
          detail: decision,
        });
      }
      host.clearPrepared(api, actorId, "office-hours");
    },
    /** A town hall: the host answers as prepared, or from their own view. */
    "town-hall": (api: CoreAPI, actorId: string) => {
      const prepared = host.prepared(api, actorId, "town-hall");
      const row = holdTownHall(api, {
        hostId: actorId,
        ...(prepared?.answers ? { answers: prepared.answers } : {}),
      });
      host.keep(api, {
        personId: actorId,
        kind: "town-hall",
        how: prepared?.answers ? "did" : "own-choice",
        recordId: row.id,
        position: null,
        detail: `${row.attendeeIds.length} came; ${row.questions.length} questions`,
      });
      host.clearPrepared(api, actorId, "town-hall");
    },
    /**
     * An interview with the outlet that reaches the most people here. The
     * outlet decides whether it has room and interest; the answers are the
     * player's where prepared, else the official's own positions.
     */
    interview: (api: CoreAPI, actorId: string) => {
      const outlet = [...outletsHere(api)]
        .map((o) => ({ o, reach: followersOf(api, o.id).length }))
        .sort(
          (a, b) => b.reach - a.reach || a.o.id.localeCompare(b.o.id),
        )[0]?.o;
      if (!outlet) return;
      const asked = requestInterview(api, {
        outletId: outlet.id,
        personId: actorId,
      });
      const prepared = host.prepared(api, actorId, "interview");
      if (asked.status !== "invited") {
        host.keep(api, {
          personId: actorId,
          kind: "interview",
          how: prepared ? "did" : "own-choice",
          recordId: asked.id,
          position: null,
          detail: `declined: ${asked.reason ?? "no reason"}`,
        });
        return;
      }
      const speaker = officeholderSpeaker(api, actorId) ?? {
        personId: actorId,
        party: null,
        filing: null,
      };
      const own = candidateAnswers(api, asked.questions, speaker);
      const answers = own.map((a) =>
        prepared?.answers && a.question in prepared.answers
          ? {
              question: a.question,
              position: prepared.answers[a.question] ?? null,
            }
          : a,
      );
      const done = answerInterview(api, asked.id, answers);
      host.keep(api, {
        personId: actorId,
        kind: "interview",
        how: prepared?.answers ? "did" : "own-choice",
        recordId: done.id,
        position: null,
        detail: `${outlet.id}: ${done.status}`,
      });
      host.clearPrepared(api, actorId, "interview");
    },
    /** An hour with a department head: they come to know each other. */
    "meet-department-head": (
      api: CoreAPI,
      actorId: string,
      offer: ActOffer,
    ) => {
      const hours = api.parameter("meetHeadActHours");
      api.relationship(actorId, offer.targetId, "contact", hours);
      host.keep(api, {
        personId: actorId,
        kind: "meet-department-head",
        how: "did",
        recordId: offer.targetId,
        position: null,
        detail: `${hours} hours`,
      });
    },
  };
}

export type { ModuleRow };
