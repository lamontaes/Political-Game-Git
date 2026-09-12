import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { currentOpeningLifeScene } from "./life-scene-flow";
import { formatMinute, projectPlayerCalendar } from "./player-calendar";
import { projectOrdinaryDay } from "./ordinary-life";
import { completedActivityHere } from "./scene-venues";

/**
 * Today, as four answers rather than a stack of panels.
 *
 * The day used to be the place every system that had anything to do with time
 * mounted itself: the ordinary day, the education-and-work stack, the private
 * personnel panel and the whole campaign, one after another. The owner's word
 * for the result was "completely confusing", and it was not that any of those
 * panels was wrong — it was that the day had stopped answering the questions a
 * day answers. What is happening? What is next? What is waiting on me? What can
 * I do with the time?
 *
 * This is those four, read from records that already exist. It owns no state
 * and writes nothing; every action it points at is somebody else's canonical
 * writer, reached through the workspace that owns it.
 */

export interface TodayNext {
  readonly activityId: EntityId;
  /** "10:00 AM" today, or the date and time when it is another day. */
  readonly when: string;
  readonly title: string;
  readonly locationLabel: string;
}

export interface TodayOverview {
  readonly dateLabel: string;
  readonly timeLabel: string;
  readonly placeName: string | null;
  /** One sentence: the situation in front of the character right now. */
  readonly now: string;
  /**
   * Where "now" came from: a scene waiting in the room, a planned activity
   * the character has just finished where they are, or the ordinary day.
   */
  readonly nowKind: "scene" | "activity" | "day";
  /** The first commitment of the character's own that has not ended. */
  readonly next: TodayNext | null;
  readonly waiting: readonly {
    readonly key: string;
    readonly sentence: string;
  }[];
}

export function projectToday(world: World, personId: EntityId): TodayOverview {
  const day = projectOrdinaryDay(world, personId);
  const finished = completedActivityHere(world, personId);
  const scene = finished ? null : currentOpeningLifeScene(world, personId);
  // What was finished there is said once, by the activity panel that did it.
  const now = finished
    ? `You are at ${finished.location.label}.`
    : (scene?.prose ?? day.opening);

  const moment = world.currentMoment;
  const calendar = projectPlayerCalendar(world, personId);
  const upcoming = calendar.days
    .flatMap((entry) => entry.entries)
    .find(
      (entry) =>
        entry.group === "yours" &&
        entry.status === "scheduled" &&
        (entry.end.date > moment.date ||
          (entry.end.date === moment.date &&
            entry.end.minuteOfDay > moment.minuteOfDay)),
    );

  return {
    dateLabel: day.dateLabel,
    timeLabel: day.timeLabel,
    placeName: finished ? finished.location.label : day.placeName,
    now,
    nowKind: finished ? "activity" : scene ? "scene" : "day",
    next: upcoming
      ? {
          activityId: upcoming.activityId,
          when:
            upcoming.start.date === moment.date
              ? formatMinute(upcoming.start.minuteOfDay)
              : `${upcoming.start.date}, ${formatMinute(upcoming.start.minuteOfDay)}`,
          title: upcoming.title,
          locationLabel: upcoming.locationLabel,
        }
      : null,
    waiting: day.pending.map((entry) => ({
      key: entry.key,
      sentence: entry.sentence,
    })),
  };
}

/**
 * Who the character is at work, said before anything is offered.
 *
 * Work is one destination for every life, so the first thing it has to do is
 * say which life this is: somebody with no job yet, somebody studying, a
 * candidate, a staffer, a member, a judge. Every line is a role title or an
 * enrollment the record already holds — a campaign writes the candidate's work
 * relationship itself, so a candidate is named here by the same record that
 * made them one. Nothing is inferred from a panel being mounted.
 */
export interface WorkRole {
  /** The role titles this character currently holds, as recorded. */
  readonly roles: readonly string[];
  /** How many programs of study are active. */
  readonly studying: number;
  /** One sentence for the top of Work. */
  readonly sentence: string;
}

export function projectWorkRole(world: World, personId: EntityId): WorkRole {
  const roles = [
    ...new Set(
      activeWorkRelationshipsAt(world, personId).map(
        (entry) => entry.role.title,
      ),
    ),
  ];
  const studying = activeEducationEnrollmentsAt(world, personId).length;
  const study =
    studying === 0
      ? ""
      : studying === 1
        ? "You are a student."
        : `You are enrolled in ${studying} programs.`;
  const sentence =
    roles.length === 0
      ? `You do not hold a job or an office right now.${study ? ` ${study}` : ""}`
      : `${roles.length === 1 ? "Your role" : "Your roles"}: ${roles.join("; ")}.${study ? ` ${study}` : ""}`;
  return { roles, studying, sentence };
}
