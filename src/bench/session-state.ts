// The play server's shared state and the few helpers the route files call, in the one module both handler.ts
// and src/bench/routes/ import (a route file never imports handler.ts). Moved by scripts/screens/split-routes.mjs.
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "../director/ledger";
import { BenchPlayer } from "./player";
import { type Conversation, openConversation } from "../director/conversation";
import { type BenchFilingVisit } from "./filing";
import type { SpeechBuild } from "../director/speech-builder";
import { type LoadingStory } from "./loading";
import { openingFrames, openingArrivalMinute } from "./opening";
import { DevMode } from "./dev-mode";
import { type Game } from "../core2/saves";
import { visitPlace } from "./places";
import { benchScene } from "./scene";
import { choiceName } from "./words";

// This is a reference to engine-owned state, not a parallel state or writer.
/** Everything the play server holds between requests, in one place. */
export interface ServerState {
  core: CoreState | undefined;
  director: Director | undefined;
  player: BenchPlayer | undefined;
  placeId: string;
  building: boolean;
  placeName: string;
  /** Visits to the title since the server started; each moves the scene on. */
  titleVisits: number;
  conversation: Conversation | undefined;
  filingVisit: BenchFilingVisit | undefined;
  /**
   * The place the player went to and the day they went: they are there until
   * they go somewhere else, go home, or the day ends.
   */
  visit: { organizationId: string; date: string } | undefined;
  /** The election nights each player has watched, and the mornings they canvassed. */
  nightsWatched: Set<string>;
  canvassedOn: Set<string>;
  /** The speech the player is building, one part at a time. */
  speechBuild: SpeechBuild | undefined;
  /** What the loading screen plays, from the world being built (loading.ts). */
  loadingPeek: LoadingStory | null;
  /** The loading card's dry lines for the build in progress, with its place said in them. */
  loadingLines: Record<string, string[]> | null;
  /** Where the build is, for the loading screen's polls. */
  buildProgress: { stage: string; done: number; total: number };
  /** The opening, prepared during loading. */
  opening: ReturnType<typeof openingFrames> | null | undefined;
  /** The dev-mode record writer for the current town, which holds the gap marks. */
  marker: DevMode | undefined;
  /** The life as a save (saves.ts): the recipe and every request the player made. */
  life: Game | undefined;
  /** The life's save file, by id (savePath). */
  lifeId: string | undefined;
}

export const state: ServerState = {
  core: undefined,
  director: undefined,
  player: undefined,
  placeId: "",
  building: false,
  placeName: "",
  titleVisits: 0,
  conversation: undefined,
  filingVisit: undefined,
  visit: undefined,
  nightsWatched: new Set<string>(),
  canvassedOn: new Set<string>(),
  speechBuild: undefined,
  loadingPeek: null,
  loadingLines: null,
  buildProgress: { stage: "done", done: 0, total: 0 },
  opening: undefined,
  marker: undefined,
  life: undefined,
  lifeId: undefined,
};

/** The scene a person is in now, as the screen shows it: the player's opening day ends at home that evening, where the news is. */
/**
 * The minute of day the player's clock, the light behind them and a scene's
 * opener all read. The opening day is that evening at home, when the household
 * gets home, so the clock is never at the midnight it starts the day from
 * (owner, Nov 16: "the timing is completely messed up"): the player's own
 * minute, raised to the arrival minute on the opening day.
 */
export function shownMinute(): number | undefined {
  const minute = state.player?.packet?.at.minuteOfDay;
  const current = state.core;
  if (
    !current ||
    !state.player?.personId ||
    state.director?.ledger.opening?.date !== current.date
  )
    return minute;
  const arrival = openingArrivalMinute(current, state.player.personId);
  return Math.max(minute ?? arrival, arrival);
}

export function sceneNow(current: CoreState, id: string) {
  const playing = state.player?.personId === id;
  const openingDay =
    playing &&
    !state.player!.packet &&
    state.director?.ledger.opening?.date === current.date;
  // A place the player went to is where they are for the rest of that day:
  // a talk there, or an hour's wait, leaves them in the same room. The visit
  // ends with the day (the next morning is at home), with another trip, or
  // with going home.
  const at = playing ? state.player!.packet?.at : undefined;
  if (playing && state.visit && at?.date !== state.visit.date)
    state.visit = undefined;
  const scene =
    playing && state.visit && at
      ? visitPlace(current, id, state.visit.organizationId, at.minuteOfDay)
      : benchScene(
          current,
          id,
          playing ? state.player!.packet : undefined,
          openingDay ? openingArrivalMinute(current, id) : undefined,
        );
  // Who has something to say: the director's own answer (a talk that opens with
  // no lines is no talk), read without writing anything. The room leaves the
  // rest unclickable (owner, Nov 1).
  return playing && state.director
    ? {
        ...scene,
        people: scene.people.map((person) => ({
          ...person,
          talkable:
            person.personId === id ||
            openConversation(current, id, person.personId, {
              director: state.director,
              look: true,
            }).lines.length > 0,
        })),
      }
    : scene;
}

// Where the build is, for the loading screen's polls.
/** What the loading screen plays, from the world being built (loading.ts). */
// The opening, prepared during loading.

export const talkView = (value: Conversation | undefined) =>
  value && {
    otherId: value.otherId,
    lines: value.lines.map((line) => ({
      ...line,
      speaker: (() => {
        const person = requireCore().people.get(line.speakerId);
        return person && `${person.givenName} ${person.familyName}`;
      })(),
    })),
    choices: value.choices,
    // The scales' set: the same choices made false (empty dims the scales).
    lies: value.lies,
  };

/**
 * The sit-down when the player asks someone to serve opens at once: the ask
 * is the player's own press, so its scene is staged now and shown, not held
 * for the day's close, and the hour it takes is spent.
 */
export function sitDown(
  personId: PersonId,
  asked: { readonly hours: number; readonly eventId: string },
) {
  const staged = state.director?.stageOwnPress(
    requireCore(),
    personId,
    asked.eventId,
  );
  const spent = state.player?.spend(asked.hours);
  return {
    ...(staged ? { story: staged.momentId } : {}),
    ...(spent ? { packet: spent.packet, names: namesFor(spent.packet) } : {}),
  };
}

/** Names for the people and places a packet's offers point at. */
export function namesFor(value: unknown): Record<string, string> {
  const current = requireCore();
  const out: Record<string, string> = {};
  const offers =
    (value as { offers?: { targetId: string }[] } | undefined)?.offers ?? [];
  for (const { targetId, offerId, actionId } of offers as {
    targetId: string;
    offerId: string;
    actionId: string;
  }[]) {
    const person = current.people.get(targetId);
    const org = current.organizations.get(targetId);
    if (person) out[targetId] = `${person.givenName} ${person.familyName}`;
    else if (org) out[targetId] = org.name;
    // The choice's own name, from OPUS-WORDS' mined bank where it has one.
    const named = choiceName(actionId, out[targetId]);
    if (named) out[offerId] = named.text;
  }
  // The employer whose shift a stop falls on, so the screen can say so.
  const work = (
    value as
      | {
          stop?: {
            work?: { reasons: { owner: { organizationId: string } }[] } | null;
          };
        }
      | undefined
  )?.stop?.work;
  for (const { owner } of work?.reasons ?? []) {
    const org = current.organizations.get(owner.organizationId);
    if (org) out[owner.organizationId] = org.name;
  }
  return out;
}

export function requireCore(): CoreState {
  if (!state.core) throw new Error("Generate a town first.");
  return state.core;
}

/** The dev-mode record writer for the current town, which holds the gap marks. */
export function gapMarker(): DevMode {
  const current = requireCore();
  if (state.marker?.core !== current)
    state.marker = new DevMode(
      current,
      state.director,
      state.player,
      state.placeId,
    );
  return state.marker;
}
export interface BenchRequestOptions {
  /** The bench's dev-only route (build) answers only when set. */
  developer: boolean;
}

export const NEWSPAPER_ART = /^\/art\/newspaper\/([a-z0-9-]+\.jpg)$/;

export interface RouteContext {
  readonly request: { readonly method: string };
  readonly url: URL;
  readonly options: BenchRequestOptions;
  readonly send: (status: number, value: unknown) => void;
  readonly response: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    end: (body: Uint8Array | string) => void;
  };
}

export interface Route {
  readonly match: (context: Pick<RouteContext, "request" | "url">) => boolean;
  readonly run: (context: RouteContext) => Promise<void>;
}
