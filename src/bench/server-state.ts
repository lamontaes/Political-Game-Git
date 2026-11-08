import type { CoreState } from "../core2/types";
import { openConversation, type Conversation } from "../director/conversation";
import type { Director } from "../director/ledger";
import type { SpeechBuild } from "../director/speech-builder";
import { DevMode } from "./dev-mode";
import { type BenchFilingVisit } from "./filing";
import { type LoadingStory } from "./loading";
import type { openingFrames } from "./opening";
import { OPENING_EVENING_MINUTE } from "./opening";
import type { BenchPlayer } from "./player";
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
  /** The election nights each player has watched, and the mornings they canvassed. */
  nightsWatched: Set<string>;
  canvassedOn: Set<string>;
  /** The speech the player is building, one part at a time. */
  speechBuild: SpeechBuild | undefined;
  /** What the loading screen plays, from the world being built (loading.ts). */
  loadingPeek: LoadingStory | null;
  /** Where the build is, for the loading screen's polls. */
  buildProgress: { stage: string; done: number; total: number };
  /** The opening, prepared during loading. */
  opening: ReturnType<typeof openingFrames> | null | undefined;
  /** The dev-mode record writer for the current town, which holds the gap marks. */
  marker: DevMode | undefined;
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
  nightsWatched: new Set<string>(),
  canvassedOn: new Set<string>(),
  speechBuild: undefined,
  loadingPeek: null,
  buildProgress: { stage: "done", done: 0, total: 0 },
  opening: undefined,
  marker: undefined,
};
/** The scene a person is in now, as the screen shows it: the player's opening day ends at home that evening, where the news is. */
export function sceneNow(current: CoreState, id: string) {
  const playing = state.player?.personId === id;
  const openingDay =
    playing &&
    !state.player!.packet &&
    state.director?.ledger.opening?.date === current.date;
  const scene = benchScene(
    current,
    id,
    playing ? state.player!.packet : undefined,
    openingDay ? OPENING_EVENING_MINUTE : undefined,
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

export interface BenchRequestOptions {
  /** The bench's dev-only route (build) answers only when set. */
  developer: boolean;
}
