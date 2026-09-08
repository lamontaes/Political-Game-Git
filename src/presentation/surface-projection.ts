import type { SceneSurfaceContentClass } from "../environment/environment-scene-spec";
import { measurePosition } from "../simulation/legislation";
import type { EntityId, World } from "../simulation/types";
import { projectMeasureBriefing } from "./legislation-projection";

/**
 * WHAT THE ROOM IS ALLOWED TO KNOW.
 *
 * `surface-binding.ts` already decides what a room may SAY: a slot declares
 * the classes it could carry, an owner either holds the fact or does not, and
 * an unowned class shows the decoration the scene was painted with. This
 * module supplies the owners, and it exists because the honest answer to
 * "which fact goes on this screen" is not one question but three:
 *
 *   1. Does the world contain the fact?      — the simulation answers.
 *   2. Could this surface have come by it?   — the ROOM answers, through the
 *                                              `information_access` it declares.
 *   3. May the player-facing presentation
 *      reveal it?                            — the PROJECTION answers, here.
 *
 * The third question is the one a monitor is most likely to get wrong, because
 * a screen in a room is a rendering surface with the whole `World` behind it
 * and nothing between them. So there is something between them: every fact a
 * surface can show is enumerated below, is carried with the DISCLOSURE CHANNEL
 * it travelled down, and is derived from a projection that was already written
 * for a player to read. Nothing here reaches past that into private state.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not read a person's mind,
 * memories, appraisals or setup priors; it does not read metric values or
 * support estimates; it does not count votes that have not been taken. Those
 * are not omissions to be filled in later by whoever needs a screen to look
 * busier. A room that shows the player a number nobody told them is a lie the
 * simulation gets blamed for.
 */

/**
 * How widely a fact has travelled. A total order, smallest audience last.
 *
 * A ladder rather than a set of tags, because the question a surface asks is
 * always "is this at least as open as my pipe", and an ordering answers that
 * without a compatibility table nobody keeps current.
 */
export const DISCLOSURE_CHANNELS = [
  /** Anyone alive in this world knows it: the date, the name of the place. */
  "published",
  /** Filed, posted or recorded with an institution and open to the public. */
  "public-record",
  /** An institution's or an office's own working material. */
  "institutional-working",
] as const;

export type DisclosureChannel = (typeof DISCLOSURE_CHANNELS)[number];

const CHANNEL_RANK: Readonly<Record<DisclosureChannel, number>> = {
  published: 0,
  "public-record": 1,
  "institutional-working": 2,
};

/**
 * The widest channel each kind of surface can receive.
 *
 * `public-broadcast` clears only `published` because this world contains no
 * press: nothing selects a public record and airs it, so a television that
 * showed one would be inventing the broadcaster as well as the broadcast.
 * That is a description of the simulation and changes the day a press system
 * lands. `personal-household` clears the same channel today for an unrelated
 * reason that will not change: a press system does not put one more sheet of
 * paper on somebody's coffee table.
 */
const ACCESS_CLEARANCE: Readonly<Record<string, DisclosureChannel>> = {
  "public-broadcast": "published",
  "personal-household": "published",
  "public-record": "public-record",
  "institutional-working": "institutional-working",
};

/** True when a surface with this clearance may receive this channel. */
export function accessClears(
  access: string | undefined,
  channel: DisclosureChannel,
): boolean {
  if (access === undefined) return false;
  const clearance = ACCESS_CLEARANCE[access];
  if (clearance === undefined) return false;
  return CHANNEL_RANK[channel] <= CHANNEL_RANK[clearance];
}

export interface SurfaceFact {
  /** The exact text a surface shows. Never assembled at render time. */
  readonly text: string;
  readonly channel: DisclosureChannel;
  /** Where this came from, for a reviewer. Never player copy. */
  readonly provenance: string;
}

export interface DynamicSurfaceProjection {
  /**
   * Facts by content class. A class ABSENT here has no owner in this world,
   * which is a different thing from an owner with nothing — the binder shows
   * the difference and a reviewer needs it.
   */
  readonly facts: ReadonlyMap<SceneSurfaceContentClass, SurfaceFact>;
  /** Classes an owner exists for that had nothing to say right now. */
  readonly empty: ReadonlySet<SceneSurfaceContentClass>;
}

/**
 * The draft on the office's own desk, when there is one open.
 *
 * Passed in rather than looked up, because which document an office is working
 * on is a fact about the workspace the player has open and not something a
 * room can deduce. The caller hands over text it is ALREADY showing the
 * player; nothing here reaches into the document store for more.
 */
export interface WorkingDocumentFacts {
  readonly title: string;
  readonly statusLabel: string;
}

export interface DynamicSurfaceProjectionInput {
  /** The jurisdiction the player's life sits in, when the world knows one. */
  readonly jurisdictionId?: EntityId | null;
  /** The measure the player is actually working on, when there is one. */
  readonly measureId?: EntityId | null;
  /** The working draft open in the office, when there is one. */
  readonly workingDocument?: WorkingDocumentFacts | null;
}

/** A projection for a room nobody is standing in and no world backs. */
export const EMPTY_SURFACE_PROJECTION: DynamicSurfaceProjection = {
  facts: new Map(),
  empty: new Set(),
};

/**
 * Builds the facts this world can put in a room.
 *
 * Ordered work, deterministic output: every value below is read from a
 * canonical record or from `projectMeasureBriefing`, which is the same text
 * the player reads in the legislative workspace. No seeded draw, no clock, no
 * formatting that depends on a locale.
 */
export function projectDynamicSurfaces(
  world: World,
  input: DynamicSurfaceProjectionInput = {},
): DynamicSurfaceProjection {
  const facts = new Map<SceneSurfaceContentClass, SurfaceFact>();
  const empty = new Set<SceneSurfaceContentClass>();

  facts.set("calendar-date", {
    text: world.currentDate,
    channel: "published",
    provenance: "world.currentDate",
  });

  const jurisdictionId = input.jurisdictionId ?? null;
  if (jurisdictionId !== null) {
    const jurisdiction = world.jurisdictions[jurisdictionId];
    if (jurisdiction) {
      facts.set("jurisdiction-name", {
        text: jurisdiction.name,
        channel: "published",
        provenance: `world.jurisdictions['${jurisdictionId}'].name`,
      });
    } else {
      // An owner exists for the class and this world holds no record for the
      // jurisdiction asked about. Saying so is not the same as saying nobody
      // owns place names.
      empty.add("jurisdiction-name");
    }
  }

  // A selected working document owns this surface. WorkingDocumentFacts has
  // no stable identity to compare with a measure's sourceDocumentKey; filing,
  // matching titles or mere co-presence cannot establish that they are linked.
  const workingDocument = input.workingDocument ?? null;
  if (workingDocument !== null) {
    facts.set("document-body", {
      text: `${workingDocument.title} — ${workingDocument.statusLabel}`,
      channel: "institutional-working",
      provenance: "working document open in the office",
    });
  }

  const measureId = input.measureId ?? null;
  if (measureId !== null) {
    projectMeasureFacts(world, measureId, facts, empty);
  }

  return { facts, empty };
}

function projectMeasureFacts(
  world: World,
  measureId: EntityId,
  facts: Map<SceneSurfaceContentClass, SurfaceFact>,
  empty: Set<SceneSurfaceContentClass>,
): void {
  const briefing = projectMeasureBriefing(world, measureId);
  const phase = measurePosition(world, measureId).phase;

  // A bill that has not been filed is not a public record. It is a draft in an
  // office, and the room that may show it is the office it is drafted in.
  const filed = phase !== "drafting";
  const identityChannel: DisclosureChannel = filed
    ? "public-record"
    : "institutional-working";

  facts.set("bill-number", {
    text: briefing.designation,
    channel: identityChannel,
    provenance: filed
      ? "legislative measure record, filed"
      : "legislative measure record, not yet filed",
  });
  facts.set("bill-title", {
    text: briefing.shortTitle,
    channel: identityChannel,
    provenance: filed
      ? "legislative measure record, filed"
      : "legislative measure record, not yet filed",
  });

  // Where the bill stands and who decides next: the same two sentences the
  // workspace shows the player, which is what makes this safe to put on a
  // wall. A board that said more than the player's own briefing does would be
  // telling them something nobody told their character.
  facts.set("agenda", {
    text: filed
      ? `${briefing.designation} — ${briefing.whereItStands} ${briefing.whoDecidesNext}`
      : `${briefing.designation} — ${briefing.whereItStands}`,
    channel: identityChannel,
    provenance: "projectMeasureBriefing: whereItStands, whoDecidesNext",
  });

  // The working text of the draft. Institutional even after filing: the bill
  // summary is the office's own account of it, not the enrolled text.
  if (!facts.has("document-body"))
    facts.set("document-body", {
      text: `${briefing.designation} — ${briefing.shortTitle}. ${briefing.summary}`,
      channel: "institutional-working",
      provenance: "projectMeasureBriefing: designation, shortTitle, summary",
    });

  // A tally exists only once a vote has been TAKEN and recorded. There is no
  // expected count, no whip estimate and no projection from anybody's
  // disposition: a vote that has not happened has no number, and the honest
  // rendering of that is an empty board.
  const latestVote = briefing.votes.at(-1) ?? null;
  if (latestVote) {
    facts.set("vote-tally", {
      text: `${latestVote.question} — ${latestVote.result} ${latestVote.yea}–${latestVote.nay}`,
      channel: "public-record",
      provenance: "projectMeasureBriefing: recorded vote",
    });
  } else {
    empty.add("vote-tally");
  }
}
