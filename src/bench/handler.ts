import { lawDid } from "./law-did";
import {
  drawAheadNow,
  drawAheadOn,
  figureAtPath,
  figurePng,
} from "./people-pack";
import { bustPath } from "./bust";
import { frontPng } from "./mannequin-plates";
import { writeLineGrade } from "./grade-line";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { fillInCount, personOrFillIn } from "../core2/state";
import {
  registerCommand,
  replaySave,
  saveGame,
  type Game,
  type SaveCommand,
  type SaveV1,
} from "../core2/saves";
import { parameter } from "../core2/parameters";
import { SITUATION_LIBRARY } from "../director/scheduling";
import { relatedGuideTerms, searchGuideTerms } from "./guide-terms";
import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BenchPlayer } from "./player";
import { buildBenchWorld, buildBenchWorldInStages } from "./world";
import { gameStartDate } from "../core2/game-start";
import { knownCard, personCard } from "./card";
import { OPENING_EVENING_MINUTE, openingFrames } from "./opening";
import { calendarItems, heardItems, newsItems } from "./calendar";
import { nationStories } from "./nation-news";
import {
  answerAsk,
  campaignAct,
  donationAsksView,
  campaignDay,
  campaignView,
  playerRecord,
  debateAnswer,
  speechBegin,
  speechGive,
  speechPick,
  speechView,
} from "./campaign";
import type { SpeechBuild } from "../director/speech-builder";
import { storyReply, storyScene } from "./story";
import { economyView, worldPanels } from "./economy";
import { electionResults, ownRace } from "./results";
import { loadingStory, type LoadingStory } from "./loading";
import {
  canvassedLine,
  electionDay,
  electionNight,
  resultMomentOf,
  stayedHomeLine,
} from "./election-night";
import { followsAnyOutlet, homePapers, wordOwnResult } from "./archive-words";
import { openingsView } from "./openings";
import { billPaper, seatAct, seatView } from "./legislature";
import {
  billPageView,
  billStage,
  callAmendmentVote,
  callOverrideVote,
  chooseOverrideVote,
  chooseOwnVote,
  followedBills,
  keepStaffRedraft,
  staffRedraft,
  moveOwnAmendment,
} from "./bill-stage";
import {
  deskDecide,
  floorDecide,
  floorView,
  ordersDecide,
  ordersView,
  deskView,
  meetingAdjourn,
  meetingItem,
  meetingSpeak,
  meetingSceneView,
  colleagueDeal,
  hireAide,
  nameHeadPick,
  nominationDecide,
  nominationsView,
  budgetLinePick,
  officeView,
} from "./office";
import { bankView } from "./bank";
import { budgetView, setPriority } from "./budget";
import { metricsView } from "./metrics";
import {
  chooseAtCounter,
  counterOpening,
  officePlace,
  openBenchFilingVisit,
  type BenchFilingVisit,
} from "./filing";
import {
  backdropFile,
  backdropPath,
  benchScene,
  faceOf,
  scenePlace,
} from "./scene";
import { occluderPath } from "./occluders";
import { DevMode } from "./dev-mode";
import { TITLE_ROTATE_SECONDS, titleRotation } from "./title";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  ageAtStart,
  applyChosenPerson,
  birthYears,
  chosenBirthDate,
  creatorStates,
  creatorTowns,
  creatorRandomPlace,
  drawBirthday,
  drawName,
  readChosenPerson,
} from "./creator";
import {
  appearanceRows,
  drawnAppearance,
  lookForGender,
  moveAppearance,
  lookFaces,
  newGameFaces,
  readRecipe,
} from "./appearance";
import { pollingScene } from "./polling";
import { officeCases, decideCase } from "./office-cases";
import {
  meetOverTalk,
  openConversation,
  say,
  sayNothing,
  type Conversation,
} from "../director/conversation";
import { chapterPicture } from "./journal-pictures";
import { composeJournal } from "../director/journal";
import {
  fileForOffice,
  governmentView,
  joinPartyAs,
  localRaces,
  politicsStates,
  stateLegislators,
} from "./government";
import { governmentBodies } from "./government-bodies";
import type { Director } from "../director/ledger";
import type { CoreState } from "../core2/types";
import { benchProgress } from "./progress";
import { townPlaces, visitPlace } from "./places";
import { officeholders } from "./officeholders";
import { lawChanges } from "./changes";
import { patchNoteReleases } from "./patch-notes";
import { governmentMap } from "./map";
import { budgetLineNames, choiceName, policyNames } from "./words";
import controls from "./data/controls.json" with { type: "json" };

// This is a reference to engine-owned state, not a parallel state or writer.
/** Everything the play server holds between requests, in one place. */
interface ServerState {
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
  /** Where the build is, for the loading screen's polls. */
  buildProgress: { stage: string; done: number; total: number };
  /** The opening, prepared during loading. */
  opening: ReturnType<typeof openingFrames> | null | undefined;
  /** The dev-mode record writer for the current town, which holds the gap marks. */
  marker: DevMode | undefined;
  /** The life as a save (saves.ts): the recipe and every request the player made. */
  life: Game | undefined;
}
const state: ServerState = {
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
  buildProgress: { stage: "done", done: 0, total: 0 },
  opening: undefined,
  marker: undefined,
  life: undefined,
};
/** What the server holds before any life, for a replay to start from. */
const EMPTY_STATE: ServerState = { ...state };
/** The scene a person is in now, as the screen shows it: the player's opening day ends at home that evening, where the news is. */
function sceneNow(current: CoreState, id: string) {
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
              look: true,
            }).lines.length > 0,
        })),
      }
    : scene;
}
// Where the build is, for the loading screen's polls.
/** What the loading screen plays, from the world being built (loading.ts). */
// The opening, prepared during loading.

const talkView = (value: Conversation | undefined) =>
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
function namesFor(value: unknown): Record<string, string> {
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
export const serialize = (value: unknown) =>
  JSON.stringify(value, (_key, item) => {
    if (item instanceof Map) return Object.fromEntries(item);
    if (item instanceof Set) return [...item];
    if (typeof item === "bigint") return item.toString();
    return item;
  });

function requireCore(): CoreState {
  if (!state.core) throw new Error("Generate a town first.");
  return state.core;
}

/** The dev-mode record writer for the current town, which holds the gap marks. */
function gapMarker(): DevMode {
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

/** The world the developer view reads (dev-api.ts), the same engine state. */
export function benchWorld() {
  return {
    core: state.core,
    director: state.director,
    player: state.player,
    placeId: state.placeId,
  };
}

/** What the handler sends back: a status, headers and a body. */
export interface BenchReply {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}
export interface BenchRequestOptions {
  /** The bench's dev-only route (build) answers only when set. */
  developer: boolean;
}
// The play page never calls these; they are the bench's developer view.
const DEVELOPER_ROUTES = new Set(["/api/build"]);

const NEWSPAPER_ART = /^\/art\/newspaper\/([a-z0-9-]+\.jpg)$/;

interface RouteContext {
  readonly request: { readonly method: string };
  readonly url: URL;
  readonly options: BenchRequestOptions;
  readonly send: (status: number, value: unknown) => void;
  readonly response: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    end: (body: Uint8Array | string) => void;
  };
}
interface Route {
  readonly match: (context: Pick<RouteContext, "request" | "url">) => boolean;
  readonly run: (context: RouteContext) => Promise<void>;
}

/** The play server's routes, in the order they are tried: the first whose match holds answers. */
const ROUTES: readonly Route[] = [
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/newlife",
    run: async ({ url, send }) => {
      if (state.building)
        throw new Error("Opening generation is already running.");
      state.building = true;
      try {
        // The whole town, two-level (OPUS-CORE): full people for the
        // player's circle and officials, counts for everyone else.
        state.buildProgress = { stage: "people", done: 0, total: 0 };
        state.loadingPeek = null;
        // The person chosen in the creator, read before the build: the
        // player is the resident born nearest the chosen birthday.
        const chosen = url.searchParams.get("person")
          ? readChosenPerson(url.searchParams.get("person")!)
          : undefined;
        // Every game opens on the one start date (owner, Oct 14, 2026).
        const world = await buildBenchWorldInStages(
          url.searchParams.get("seed") ?? "",
          gameStartDate(),
          {
            twoLevel: true,
            onWorld: (built, id) => {
              if (id) state.loadingPeek = loadingStory(built, id);
            },
            ...(chosen
              ? {
                  playerBirthDate: chosenBirthDate(chosen),
                  playerGender: chosen.gender,
                }
              : {}),
            ...(url.searchParams.get("settings")
              ? { settings: JSON.parse(url.searchParams.get("settings")!) }
              : {}),
            ...(url.searchParams.get("placeKey")
              ? { placeKey: url.searchParams.get("placeKey")! }
              : {}),
          },
          (stage) => {
            state.buildProgress = { stage, done: 0, total: 0 };
          },
        );
        state.core = world.core;
        state.director = world.director;
        state.player = new BenchPlayer(world.core, world.director);
        state.conversation = undefined;
        state.visit = undefined;
        state.placeId = world.placeId;
        state.placeName = world.place.displayName;
        const entrant = { personId: world.playerId! };
        // The person chosen in the creator becomes the player.
        if (chosen) applyChosenPerson(world.core, entrant.personId, chosen);
        state.player.select(entrant.personId);
        // Between the drawing steps the server answers the loading
        // screen, which plays the world's story meanwhile (loading.ts).
        const breathe = () => new Promise((resolve) => setImmediate(resolve));
        await breathe();
        // The opening is prepared during loading; its whole figures are files.
        state.opening = world.director.ledger.opening
          ? openingFrames(
              world.core,
              entrant.personId,
              world.director.ledger.opening,
            )
          : null;
        // The first screen's people and the faces the first menus show
        // (the player's card: household and closest ties) are drawn during
        // loading too, so they are there the moment the screen asks.
        await breathe();
        sceneNow(world.core, entrant.personId);
        await breathe();
        personCard(world.core, entrant.personId);
        await breathe();
        drawAheadNow();
        state.buildProgress = { stage: "done", done: 0, total: 0 };
        // A scene the director already staged for today (the address the
        // household watches that evening) plays first.
        const staged = world.director.ledger.people
          .get(entrant.personId)
          ?.schedule.find(
            (row) =>
              row.date === world.core.date &&
              row.outcome.startsWith("scene") &&
              row.bindings.length > 0,
          );
        send(200, {
          personId: entrant.personId,
          placeName: world.place.displayName,
          date: state.core.date,
          packet: state.player.packet,
          names: {},
          ...(staged ? { sceneMomentId: staged.momentId } : {}),
        });
      } finally {
        state.building = false;
      }
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname.startsWith("/art/people/"),
    run: async ({ url, response }) => {
      // A person: the pack's figure (people-pack.ts), a kit in the colors
      // the query names, a look as painted.
      const figure = figureAtPath(url.pathname);
      if (!figure) throw new Error("Unknown figure.");
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      });
      response.end(
        figurePng(figure, Object.fromEntries(url.searchParams.entries())),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname.startsWith("/art/busts/"),
    run: async ({ url, response }) => {
      // A piece of a bust (bust.ts): the same file for everyone who wears it,
      // so the screen fetches each piece once.
      const content = await readFile(bustPath(url.pathname));
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      });
      response.end(content);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname.startsWith("/art/people-rooms/fronts/"),
    run: async ({ url, response }) => {
      // The furniture a plate paints in front of a mannequin, as a mask.
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "max-age=3600",
      });
      response.end(
        frontPng(url.pathname.slice("/art/people-rooms/fronts/".length)),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname.startsWith("/art/backdrops/occluders/"),
    run: async ({ url, response }) => {
      // What stands in front of a spot: a mask the screen lays the picture through.
      const content = await readFile(
        occluderPath(url.pathname.slice("/art/backdrops/occluders/".length)),
      );
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname.startsWith("/art/backdrops/"),
    run: async ({ url, response }) => {
      const content = await readFile(
        backdropPath(url.pathname.slice("/art/backdrops/".length)),
      );
      response.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && NEWSPAPER_ART.test(url.pathname),
    run: async ({ response, url }) => {
      const newspaper = NEWSPAPER_ART.exec(url.pathname)!;
      // The newspaper art: engraved mastheads and front-page photos, cut
      // from the originals in art/newspaper-mockups (lineage in its README).
      const content = await readFile(
        new URL(
          newspaper[1]!,
          new URL("../../art/newspaper-mockups/derived/", import.meta.url),
        ),
      );
      response.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/scene",
    run: async ({ url, send }) => {
      const current = requireCore();
      const id = url.searchParams.get("id") ?? "";
      // Someone still in the counts is filled in the moment they're looked at.
      if (!personOrFillIn(current, id))
        throw new Error("Resident does not exist in core records.");
      send(200, sceneNow(current, id));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/open",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const otherId = url.searchParams.get("otherId") ?? "";
      if (!personOrFillIn(requireCore(), otherId)?.alive)
        throw new Error("Talk to a living resident.");
      // A talk a scene opens is about the scene's moment.
      const occasionId = url.searchParams.get("momentId") ?? undefined;
      // The minute the talk is had at: the opening day is that evening at
      // home, whatever the clock's own start of the day says (the opening's
      // talks spend their minutes from the clock's morning); else the clock.
      const clockMinute = state.player.packet?.at.minuteOfDay;
      const minuteOfDay =
        state.director?.ledger.opening?.date === requireCore().date
          ? Math.max(
              clockMinute ?? OPENING_EVENING_MINUTE,
              OPENING_EVENING_MINUTE,
            )
          : clockMinute;
      state.conversation = openConversation(
        requireCore(),
        state.player.personId,
        otherId,
        state.director
          ? {
              director: state.director,
              ...(occasionId ? { occasionId } : {}),
              ...(minuteOfDay !== undefined ? { minuteOfDay } : {}),
              // The place the player came to, so a goodbye knows it is said
              // at the speaker's work.
              ...(state.visit
                ? { visitOrganizationId: state.visit.organizationId }
                : {}),
            }
          : {},
      );
      // A talk with no line is no talk (owner, Nov 1), on every road: a scene,
      // the room, a workplace visit. Nothing opens, and the screen hands the
      // room back.
      if (!state.conversation.lines.length) {
        state.conversation = undefined;
        send(200, null);
        return;
      }
      // The player talked with them: the two have met (the encounters
      // engine's meeting, through the director's one entry for it).
      meetOverTalk(requireCore(), state.conversation);
      send(200, talkView(state.conversation));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/say",
    run: async ({ url, send }) => {
      if (!state.conversation) throw new Error("No conversation is open.");
      state.conversation = say(
        requireCore(),
        state.conversation,
        url.searchParams.get("key") ?? "",
      );
      send(200, talkView(state.conversation));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/silent",
    run: async ({ send }) => {
      if (!state.conversation) throw new Error("No conversation is open.");
      state.conversation = sayNothing(requireCore(), state.conversation);
      send(200, talkView(state.conversation));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/gap",
    run: async ({ url, send }) => {
      // Mark the talk's newest line as a gap (play-mark-gap): one record
      // naming the scene and the line; no game time passes.
      if (!state.conversation) throw new Error("No conversation is open.");
      const view = talkView(state.conversation)!;
      const at = Number(url.searchParams.get("line") ?? view.lines.length - 1);
      const line = view.lines[at];
      if (!line) throw new Error("No such line.");
      const sceneId =
        state.conversation.occasion?.id ??
        `talk:${state.conversation.playerId}:${state.conversation.otherId}:${requireCore().date}`;
      send(200, gapMarker().markGap(sceneId, `${sceneId}#${at}`, line.text));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/gaps",
    run: async ({ send }) => {
      send(200, gapMarker().gaps());
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/talk/leave",
    run: async ({ send }) => {
      // A talk spends its own length on the player's clock when it ends: the
      // lines said and heard, each a few minutes.
      const lines = state.conversation
        ? (talkView(state.conversation)?.lines.length ?? 0)
        : 0;
      state.conversation = undefined;
      const parameters = requireCore().data.parameters;
      // The opening evening comes before the player's first morning, and the
      // clock has not started: a talk then is part of that evening and holds
      // it. Spent, its minutes would run from tomorrow morning, and the next
      // Day would land a day late.
      const spent =
        lines > 0 && state.player?.personId && state.player.packet
          ? state.player.spend(
              (lines * parameter("talkMinutesPerLine", parameters)) /
                parameter("minutesPerHour", parameters),
            )
          : undefined;
      send(
        200,
        spent ? { packet: spent.packet, names: namesFor(spent.packet) } : {},
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/wait",
    run: async ({ url, send }) => {
      // Stay or wait where the player is: the hours asked for, at most a day,
      // spent on the existing clock.
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const parameters = requireCore().data.parameters;
      const asked = Number(url.searchParams.get("hours") ?? "");
      if (!Number.isFinite(asked) || asked <= 0)
        throw new Error("Wait for a number of hours.");
      const spent = state.player.spend(
        Math.min(asked, parameter("hoursPerDay", parameters)),
      );
      send(
        200,
        spent ? { packet: spent.packet, names: namesFor(spent.packet) } : {},
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/journal",
    run: async ({ url, send }) => {
      if (!state.director) throw new Error("Generate a town first.");
      const who = url.searchParams.get("id") ?? "";
      const chapters = composeJournal(
        requireCore(),
        state.director,
        who,
        // The player's own journal reads to their clock, which stands at
        // the start of a day the core has yet to run (a birthday morning).
        state.player?.packet && state.player.personId === who
          ? { through: state.player.packet.at.date }
          : {},
      );
      // A chapter carries the picture of the place its lines were written from;
      // with no place on record it carries none.
      send(
        200,
        chapters.map((chapter) => {
          const picture = chapterPicture(requireCore(), who, chapter);
          return picture ? { ...chapter, picture } : chapter;
        }),
      );
      return;
    },
  },
  {
    match: ({ url }) => url.pathname.startsWith("/api/creator/"),
    run: async ({ request, url, send }) => {
      // The New game creator (creator.ts, appearance.ts): draws and lists
      // that read no world, so they answer before one is built.
      const q = url.searchParams;
      const draw = Number(q.get("draw") ?? 0);
      const seed = q.get("seed") ?? "";
      const gender = q.get("gender") ?? "";
      const route = url.pathname.slice("/api/creator/".length);
      if (route === "name") send(200, drawName(seed, draw, gender));
      else if (route === "birthday") {
        const b = drawBirthday(seed, draw);
        send(200, { ...b, age: ageAtStart(b.year, b.month, b.day) });
      } else if (route === "years")
        send(200, {
          start: gameStartDate(),
          years: birthYears(Number(q.get("month")), Number(q.get("day"))),
        });
      else if (route === "states") send(200, creatorStates());
      else if (route === "towns")
        send(200, creatorTowns(q.get("state") ?? "", q.get("q") ?? "", seed));
      else if (route === "place") send(200, creatorRandomPlace(seed, draw));
      else if (route === "appearance") {
        const recipe = q.get("recipe")
          ? request.method === "POST"
            ? moveAppearance(
                readRecipe(q.get("recipe")!),
                gender,
                q.get("row") ?? "",
                Number(q.get("by") ?? 1),
              )
            : readRecipe(q.get("recipe")!)
          : drawnAppearance(gender, seed, draw);
        const fitted = lookForGender(recipe, gender);
        // The look, its rows and the busts every screen will draw for it:
        // in its everyday top and in its formal clothes (the creator's tabs).
        send(200, {
          recipe: fitted,
          rows: appearanceRows(fitted, gender),
          faces: lookFaces(fitted),
        });
      } else send(404, { error: "Unknown bench route." });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/title",
    run: async ({ send }) => {
      // One visit to the title: its scene, and the life in progress to
      // continue (the server's current life), or none.
      const personId = state.core ? state.player?.personId : undefined;
      const scenes = titleRotation(
        new Date().toISOString().slice(0, 10),
        state.titleVisits++,
      );
      send(200, {
        ...scenes[0]!,
        scenes,
        rotateSeconds: TITLE_ROTATE_SECONDS,
        // New game's busts, before any world exists.
        newGame: newGameFaces(),
        life: personId
          ? {
              personId,
              name: `${state.core!.people.get(personId)?.givenName ?? ""} ${state.core!.people.get(personId)?.familyName ?? ""}`,
              age: ageOnDate(
                makeIsoDate(
                  state.core!.people.get(personId)?.birthDate ??
                    state.core!.date,
                ),
                makeIsoDate(state.core!.date),
              ),
              // Continue's and Saved games' face: the player's one face, as
              // every screen in play draws it (older head and gray hair past
              // 65), never the creator's look drawn a second way.
              face: faceOf(
                state.core!,
                personId,
                scenePlace(state.core!, personId).place,
              ),
              placeName: state.placeName,
              date: state.core!.date,
              minuteOfDay:
                state.player!.packet?.at.minuteOfDay ??
                state.opening?.home?.minuteOfDay ??
                0,
              packet: state.player!.packet,
            }
          : null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/version",
    run: async ({ send }) => {
      // Source runs have no bundler define; the package's release number is the record.
      const { version } = JSON.parse(
        await readFile(new URL("../../package.json", import.meta.url), "utf8"),
      );
      send(200, { version });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/map",
    run: async ({ send }) => {
      // The state's map with the player's districts and who holds each,
      // for Parties (owner, Oct 28, point 20: "bring it back").
      send(200, governmentMap(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/patch-notes",
    run: async ({ send }) => {
      // The title's Patch notes: the release machinery's own file, one
      // released section at a time (owner, Oct 28: "get them in").
      send(200, {
        releases: patchNoteReleases(
          await readFile(
            new URL("../../PATCH_NOTES.md", import.meta.url),
            "utf8",
          ),
        ),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bank",
    run: async ({ url, send }) => {
      send(200, bankView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/metrics",
    run: async ({ send }) => {
      send(200, metricsView(requireCore(), state.placeId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/budget",
    run: async ({ url, send }) => {
      send(200, budgetView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/budget/priority",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        setPriority(
          requireCore(),
          state.player.personId,
          url.searchParams.get("governmentId") ?? "",
          url.searchParams.get("line") ?? "",
          Number(url.searchParams.get("change")) || 0,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname === "/api/advanced/officeholders",
    run: async ({ send }) => {
      send(200, officeholders(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname === "/api/advanced/officeholder-face",
    run: async ({ url, send }) => {
      const core = requireCore();
      const id = url.searchParams.get("id") ?? "";
      send(200, {
        face: core.people.has(id)
          ? faceOf(core, id, scenePlace(core, id).place)
          : null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/goto",
    run: async ({ url, send }) => {
      send(
        200,
        townPlaces(
          requireCore(),
          url.searchParams.get("id") ?? state.player?.personId ?? "",
          state.player?.packet,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/goto/counter-picture",
    run: async ({ url, send }) => {
      // The picture of the office that takes a contest's filings.
      send(200, {
        url: backdropFile(
          officePlace(url.searchParams.get("filedWith") ?? ""),
          state.player?.packet?.at.minuteOfDay ?? 12 * 60,
        ).url,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/goto/home",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      // Whether the player is out at a place, and where the day has them
      // otherwise (its picture and who is there), for Travel's way home.
      const id = state.player.personId;
      const there = benchScene(requireCore(), id, state.player.packet);
      send(200, {
        away: Boolean(state.visit),
        picture: there.backdrop.url,
        who: there.people
          .filter((person) => person.personId !== id)
          .map((person) => person.name),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/goto/home",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      // Going home from a place is a trip like the one that took them there;
      // from home it is nothing.
      // stopgapId: SG-PLAY-trip-time-average
      const parameters = requireCore().data.parameters;
      const spent = state.visit
        ? state.player.spend(
            parameter("tripMinutes", parameters) /
              parameter("minutesPerHour", parameters),
          )
        : undefined;
      state.visit = undefined;
      send(200, {
        scene: sceneNow(requireCore(), state.player.personId),
        ...(spent
          ? { packet: spent.packet, names: namesFor(spent.packet) }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/goto/visit",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      // stopgapId: SG-PLAY-trip-time-average
      // The trip comes first: the average trip time, then the room is seen as
      // it stands at the arrival minute, then the errand's hour is spent; the
      // people at the next place are those there at that later hour.
      const parameters = requireCore().data.parameters;
      const trip = state.player.spend(
        parameter("tripMinutes", parameters) /
          parameter("minutesPerHour", parameters),
      );
      const visit = visitPlace(
        requireCore(),
        state.player.personId,
        url.searchParams.get("org") ?? "",
        state.player.packet?.at.minuteOfDay ?? 12 * 60,
      );
      const spent =
        state.player.spend(parameter("visitHours", parameters)) ?? trip;
      const arrived = state.player.packet?.at;
      state.visit = arrived
        ? { organizationId: visit.organizationId, date: arrived.date }
        : undefined;
      send(200, {
        ...visit,
        ...(spent
          ? {
              packet: spent.packet,
              names: { ...visit.names, ...namesFor(spent.packet) },
            }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/changes",
    run: async ({ url, send }) => {
      send(200, lawChanges(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/law/did",
    run: async ({ url, send }) => {
      // What a law passed in play did: whom it reached, by record (law-did.ts).
      send(200, lawDid(requireCore(), url.searchParams.get("series") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/guide",
    run: async ({ url, send }) => {
      // The Guide: researched terms, searched by term first, then definition.
      send(
        200,
        searchGuideTerms(url.searchParams.get("q") ?? "").map(
          ({ entry, matched }) => ({
            key: entry.semanticKey,
            term: entry.term,
            short: entry.shortDefinition,
            explanation: entry.explanation,
            contextNote: entry.contextNote ?? null,
            related: relatedGuideTerms(entry).map((row) => row.term),
            matched,
          }),
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/newlife/progress",
    run: async ({ send }) => {
      send(200, { ...state.buildProgress, story: state.loadingPeek !== null });
      return;
    },
  },
  // The loading screen's story, once the world exists (loading.ts).
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/newlife/story",
    run: async ({ send }) => {
      send(200, state.loadingPeek);
      return;
    },
  },
  // The player's interrupt setting (owner, Oct 14, 2026): which kinds of
  // scene may stop the day. A director record its scheduling reads.
  {
    match: ({ url }) => url.pathname === "/api/scene-filter",
    run: async ({ request, url, send }) => {
      if (!state.director || !state.player?.personId)
        throw new Error("Start a life first.");
      if (request.method === "POST") {
        const kinds = url.searchParams.get("kinds");
        state.director.setSceneFilter(
          state.player.personId,
          kinds === null || kinds === "all"
            ? null
            : kinds.split(",").filter(Boolean),
          requireCore().date,
        );
      }
      const filter = state.director.ledger.sceneFilters.get(
        state.player.personId,
      );
      send(200, {
        kinds: SITUATION_LIBRARY.types.map((row) => row.key),
        // Each kind's group (its tag's endpoint), for the Options screen.
        groups: Object.fromEntries(
          SITUATION_LIBRARY.types.map((row) => [
            row.key,
            (row as unknown as { tag?: { endpoint?: string } }).tag?.endpoint,
          ]),
        ),
        allowed: filter?.allowedKinds ?? null,
        ...(filter ? { recordId: filter.id } : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/controls",
    run: async ({ send }) => {
      // A position's name: a policy or law on the bill catalog, or a local
      // seat's budget line.
      send(200, {
        ...controls,
        policyNames: { ...policyNames(), ...budgetLineNames() },
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/progress",
    run: async ({ url, send }) => {
      send(
        200,
        benchProgress(
          requireCore(),
          state.placeId,
          url.searchParams.get("id") ?? undefined,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/seat",
    run: async ({ url, send }) => {
      send(200, seatView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  // A bill as one paper document, read from its own records.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill",
    run: async ({ url, send }) => {
      send(200, billPaper(requireCore(), url.searchParams.get("billId") ?? ""));
      return;
    },
  },
  // Where a bill is: its committee record, what members told you, the floor and override by name.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill/stage",
    run: async ({ url, send }) => {
      send(
        200,
        billStage(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // What the bill's page is built from: name, stage and day, sponsor, sections, tallies and reach.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill/page",
    run: async ({ url, send }) => {
      send(
        200,
        billPageView(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // Bills before the state's chambers and Congress, followed from home.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bills/following",
    run: async ({ send }) => {
      send(200, followedBills(requireCore(), state.player?.personId));
      return;
    },
  },
  // The staff's redraft of one section, and the sponsor keeping it.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/bill/redraft",
    run: async ({ url, send }) => {
      send(
        200,
        staffRedraft(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          Number(url.searchParams.get("index")),
          state.player?.personId,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/redraft",
    run: async ({ url, send }) => {
      send(
        200,
        keepStaffRedraft(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          Number(url.searchParams.get("index")),
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // An amendment on a bill's section, and the body's vote on it.
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/amend",
    run: async ({ url, send }) => {
      send(
        200,
        moveOwnAmendment(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          Number(url.searchParams.get("index")),
          url.searchParams.get("direction") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/amendment-vote",
    run: async ({ url, send }) => {
      send(
        200,
        callAmendmentVote(
          requireCore(),
          url.searchParams.get("amendmentId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // The override of a veto: the player's own vote, and the body taking the message up.
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/override",
    run: async ({ url, send }) => {
      send(
        200,
        chooseOverrideVote(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          url.searchParams.get("vote") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/override-call",
    run: async ({ url, send }) => {
      send(
        200,
        callOverrideVote(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // The player's own vote on a bill before its floor day (the member's own choice).
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/bill/vote",
    run: async ({ url, send }) => {
      send(
        200,
        chooseOwnVote(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          url.searchParams.get("vote") ?? "",
          state.player?.personId,
        ),
      );
      return;
    },
  },
  // The officeholder's day (OFFICE-LOCAL): the meeting scene, the desk and the stops.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/meeting",
    run: async ({ send }) => {
      send(
        200,
        state.player?.personId
          ? meetingSceneView(
              requireCore(),
              state.player.personId,
              state.player.packet?.at.minuteOfDay ?? 18 * 60,
            )
          : null,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/item",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      meetingItem(
        requireCore(),
        url.searchParams.get("meetingId") ?? "",
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("vote") ?? "",
      );
      send(
        200,
        meetingSceneView(
          requireCore(),
          state.player.personId,
          state.player.packet?.at.minuteOfDay ?? 18 * 60,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/speak",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      meetingSpeak(
        requireCore(),
        url.searchParams.get("meetingId") ?? "",
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("position") ?? "",
      );
      send(
        200,
        meetingSceneView(
          requireCore(),
          state.player.personId,
          state.player.packet?.at.minuteOfDay ?? 18 * 60,
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/meeting/adjourn",
    run: async ({ url, send }) => {
      meetingAdjourn(requireCore(), url.searchParams.get("meetingId") ?? "");
      send(200, null);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/desk",
    run: async ({ send }) => {
      send(200, state.player?.personId ? deskView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/desk",
    run: async ({ url, send }) => {
      deskDecide(
        requireCore(),
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("how") ?? "",
      );
      send(200, deskView(requireCore()));
      return;
    },
  },
  // A floor vote in Congress that holds the player's clock: the bills, and the player's own vote.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/floor",
    run: async ({ send }) => {
      send(200, state.player?.personId ? floorView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/floor",
    run: async ({ url, send }) => {
      floorDecide(
        requireCore(),
        url.searchParams.get("billId") ?? "",
        url.searchParams.get("how") ?? "",
      );
      send(200, floorView(requireCore()));
      return;
    },
  },
  // Orders the governor's staff brings for signature, and the player's decision on each.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/orders",
    run: async ({ send }) => {
      send(200, state.player?.personId ? ordersView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/orders",
    run: async ({ url, send }) => {
      ordersDecide(
        requireCore(),
        url.searchParams.get("entryId") ?? "",
        url.searchParams.get("how") ?? "",
        url.searchParams.get("nomineeId") ?? undefined,
      );
      send(200, ordersView(requireCore()));
      return;
    },
  },
  // The president's open cabinet posts, and the player's nomination for one.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/nominations",
    run: async ({ send }) => {
      send(200, state.player?.personId ? nominationsView(requireCore()) : []);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/nominations",
    run: async ({ url, send }) => {
      nominationDecide(
        requireCore(),
        url.searchParams.get("post") ?? "",
        url.searchParams.get("nomineeId") ?? undefined,
        url.searchParams.get("how") === "leave",
      );
      send(200, nominationsView(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/office",
    run: async ({ url, send }) => {
      send(200, officeView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/office/name-head-pick",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        nameHeadPick(
          requireCore(),
          state.player.personId,
          url.searchParams.get("post") ?? "",
          url.searchParams.get("nomineeId") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/hire-aide",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        hireAide(
          requireCore(),
          state.player.personId,
          url.searchParams.get("personId") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/budget-line",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        budgetLinePick(
          requireCore(),
          state.player.personId,
          url.searchParams.get("line") ?? "",
          Number(url.searchParams.get("changeMinor")),
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/deal",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        colleagueDeal(
          requireCore(),
          state.player.personId,
          url.searchParams.get("memberId") ?? "",
          url.searchParams.get("deal") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/seat/act",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const q = (key: string) => url.searchParams.get(key) ?? undefined;
      send(
        200,
        seatAct(requireCore(), state.player.personId, {
          kind: q("kind") ?? "",
          officeId: q("officeId"),
          series: q("series"),
          question: q("question"),
          line: q("line"),
          value: q("value") === undefined ? undefined : Number(q("value")),
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/results",
    run: async ({ url, send }) => {
      send(
        200,
        electionResults(requireCore(), url.searchParams.get("id") ?? ""),
      );
      return;
    },
  },
  // Election night: the newest night's race, its returns place by place
  // and the call, once per race until the player has watched it.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/election-night",
    run: async ({ url, send }) => {
      const id = url.searchParams.get("id") ?? "";
      const night = id ? electionNight(requireCore(), id) : null;
      // The director's scene of the player's own result, staged that night
      // once the returns close (resultMomentOf).
      const result =
        night && state.director
          ? resultMomentOf(state.director, id, night.recordId)
          : null;
      send(
        200,
        night && !state.nightsWatched.has(`${id}|${night.contestId}`)
          ? { ...night, resultMomentId: result }
          : null,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/election-night/watched",
    run: async ({ url, send }) => {
      state.nightsWatched.add(
        `${url.searchParams.get("id") ?? ""}|${url.searchParams.get("contestId") ?? ""}`,
      );
      send(200, { ok: true });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/economy",
    run: async ({ send }) => {
      send(200, economyView(requireCore(), state.placeId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/world-panels",
    run: async ({ send }) => {
      send(200, worldPanels(requireCore(), state.placeId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/story",
    run: async ({ url, send }) => {
      if (!state.player?.personId || !state.director)
        throw new Error("Choose a resident first.");
      send(
        200,
        storyScene(
          requireCore(),
          state.director,
          state.player.personId,
          url.searchParams.get("momentId") ?? "",
          // The opening day's scene is that evening at home (as /api/scene).
          state.player.packet?.at.minuteOfDay ??
            (state.director.ledger.opening?.date === requireCore().date
              ? OPENING_EVENING_MINUTE
              : 12 * 60),
          // ?held=1 on the play page: the grading view, held lines marked.
          { held: url.searchParams.get("held") === "1" },
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/grade",
    run: async ({ url, send }) => {
      const grade = url.searchParams.get("grade");
      if (grade !== "good" && grade !== "bad")
        throw new Error("A grade is good or bad.");
      send(200, {
        i: writeLineGrade({
          parts: (url.searchParams.get("parts") ?? "")
            .split(",")
            .filter(Boolean),
          grade,
          note: url.searchParams.get("note") ?? undefined,
          text: url.searchParams.get("text") ?? undefined,
          momentId: url.searchParams.get("momentId") ?? undefined,
        }),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/story/reply",
    run: async ({ url, send }) => {
      if (!state.player?.personId || !state.director)
        throw new Error("Choose a resident first.");
      send(
        200,
        storyReply(
          requireCore(),
          state.director,
          state.player.personId,
          url.searchParams.get("momentId") ?? "",
          (url.searchParams.get("path") ?? "")
            .split(".")
            .filter(Boolean)
            .map(Number),
          {
            held: url.searchParams.get("held") === "1",
            ...(url.searchParams.get("typeKey")
              ? { typeKey: url.searchParams.get("typeKey")! }
              : {}),
          },
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/campaign",
    run: async ({ url, send }) => {
      send(200, campaignView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  // The player's record in office, as voters read it: what the Campaigns screen plans a re-run from.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/campaign/record",
    run: async ({ url, send }) => {
      send(200, playerRecord(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/campaign/asks",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(200, donationAsksView(requireCore(), state.player.personId));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/asks/answer",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        answerAsk(requireCore(), state.player.personId, {
          askId: url.searchParams.get("askId") ?? "",
          answer: url.searchParams.get("answer") ?? "",
          amountMinor: Number(url.searchParams.get("amountMinor")) || undefined,
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/act",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const number = (key: string) =>
        Number(url.searchParams.get(key)) || undefined;
      send(
        200,
        campaignAct(requireCore(), state.player.personId, {
          filingId: url.searchParams.get("filingId") ?? "",
          kind: url.searchParams.get("kind") ?? "",
          amountMinor: number("amountMinor"),
          sampleSize: number("sampleSize"),
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" &&
      url.pathname === "/api/campaign/speech/begin",
    run: async ({ send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      state.speechBuild = speechBegin(requireCore(), state.player.personId);
      send(200, speechView(state.speechBuild));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/speech/pick",
    run: async ({ url, send }) => {
      if (!state.speechBuild) throw new Error("No speech is being built.");
      state.speechBuild = speechPick(
        requireCore(),
        state.speechBuild,
        url.searchParams.get("key") ?? "",
      );
      send(200, speechView(state.speechBuild));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/speech/give",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      if (!state.speechBuild) throw new Error("No speech is being built.");
      const given = speechGive(
        requireCore(),
        state.player.personId,
        state.speechBuild,
        {
          filingId: url.searchParams.get("filingId") ?? "",
          venue: url.searchParams.get("venue") ?? "",
        },
      );
      state.speechBuild = undefined;
      send(200, given);
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/day",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const day = campaignDay(requireCore(), state.player.personId, {
        filingId: url.searchParams.get("filingId") ?? "",
        kind: url.searchParams.get("kind") ?? "",
        outletId: url.searchParams.get("outletId") ?? undefined,
      });
      // The outing's hours come off the same clock the packet reports.
      const spent = state.player.spend(day.hours);
      send(200, {
        ...day,
        ...(spent
          ? { packet: spent.packet, names: namesFor(spent.packet) }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/campaign/debate",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const answers = JSON.parse(url.searchParams.get("answers") ?? "[]") as {
        question: string;
        position: number | null;
      }[];
      send(
        200,
        debateAnswer(
          requireCore(),
          state.player.personId,
          url.searchParams.get("debateId") ?? "",
          answers,
        ),
      );
      return;
    },
  },
  // When the office that takes these filings is next open (its clerk's own
  // hours); `opens` is absent while it is open now.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/filing/hours",
    run: async ({ url, send }) => {
      const current = requireCore();
      const opens = counterOpening(
        current,
        url.searchParams.get("filedWith") ?? "",
        state.player?.packet?.at ?? {
          date: current.date,
          minuteOfDay:
            state.director?.ledger.opening?.date === current.date
              ? OPENING_EVENING_MINUTE
              : 12 * 60,
        },
      );
      send(200, opens ? { opens } : {});
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/filing/open",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const filedWith = url.searchParams.get("filedWith") ?? "";
      const current = requireCore();
      // The office keeps its clerk's hours: going to a closed one plays the
      // visit at its next opening, the clock moving there (owner, Nov 1:
      // "it should have started the next day").
      const now = state.player.packet?.at ?? {
        date: current.date,
        minuteOfDay:
          state.director?.ledger.opening?.date === current.date
            ? OPENING_EVENING_MINUTE
            : 12 * 60,
      };
      const opens = counterOpening(current, filedWith, now);
      if (opens) {
        const reachedOpening = () => {
          const at = state.player?.packet?.at;
          return (
            !!at &&
            (at.date > opens.date ||
              (at.date === opens.date && at.minuteOfDay >= opens.minuteOfDay))
          );
        };
        // A fresh clock first lives to the morning's start; the wait goes on
        // from there until it stands at the opening.
        let waited: ReturnType<typeof state.player.waitUntil> | undefined;
        for (let tries = 0; tries < 3 && !reachedOpening(); tries += 1) {
          waited = state.player.waitUntil({
            date: makeIsoDate(opens.date),
            minuteOfDay: opens.minuteOfDay,
          });
          if (!waited || state.player.packet?.kind !== "complete") break;
        }
        // Something came up on the way: it is lived first, the counter
        // waits for the next try.
        const reached = state.player.packet?.at;
        if (
          !waited ||
          state.player.packet?.kind !== "complete" ||
          !reached ||
          !reachedOpening()
        ) {
          send(200, { waiting: true, packet: state.player.packet });
          return;
        }
      }
      state.filingVisit = openBenchFilingVisit(
        current,
        state.player.personId,
        filedWith,
        state.player.packet?.at.minuteOfDay ?? 12 * 60,
      );
      send(
        200,
        opens
          ? { ...state.filingVisit, waited: state.player.packet }
          : state.filingVisit,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/filing/choose",
    run: async ({ url, send }) => {
      if (!state.filingVisit) throw new Error("No filing visit is open.");
      const before = state.filingVisit.result;
      state.filingVisit = chooseAtCounter(
        requireCore(),
        state.filingVisit,
        url.searchParams.get("key") ?? "",
        {
          platform: url.searchParams.getAll("stance"),
          party: url.searchParams.get("party") || null,
        },
      );
      // Filing takes the afternoon at the counter: taking out the
      // petition, the clerk's questions, the wait. The hours come off the
      // same clock the packet reports.
      const filed = state.filingVisit.result as { status?: string } | undefined;
      const spent =
        filed && filed !== before && filed.status !== "refused"
          ? state.player?.spend(
              parameter("filingVisitHours", requireCore().data.parameters),
            )
          : undefined;
      send(200, {
        ...state.filingVisit,
        ...(spent
          ? { packet: spent.packet, names: namesFor(spent.packet) }
          : {}),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/filing/leave",
    run: async ({ send }) => {
      state.filingVisit = undefined;
      send(200, {});
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/calendar",
    run: async ({ url, send }) => {
      send(200, {
        date: requireCore().date,
        items: calendarItems(requireCore(), url.searchParams.get("id") ?? ""),
      });
      return;
    },
  },
  {
    // The player's own papers, which News shows from the first day.
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/news/home",
    run: async ({ url, send }) => {
      send(200, homePapers(requireCore(), url.searchParams.get("id") ?? ""));
    },
  },
  {
    // Whether the player follows any paper or station, for News's empty page.
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/news/follows",
    run: async ({ url, send }) => {
      send(200, {
        any: followsAnyOutlet(requireCore(), url.searchParams.get("id") ?? ""),
      });
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/news",
    run: async ({ url, send }) => {
      const id = url.searchParams.get("id");
      // What you heard first, then your town's public record; not every
      // news event in the world.
      const heard: { id: string; date: string }[] = id
        ? heardItems(requireCore(), id)
        : [];
      // Your own race's result, among what you heard by its date.
      const race = id ? ownRace(requireCore(), id) : null;
      const own = race && wordOwnResult(requireCore(), race, id!);
      if (own) {
        const at = heard.findIndex((row) => row.date < own.date);
        heard.splice(at < 0 ? heard.length : at, 0, own);
      }
      const seen = new Set(heard.map((row) => row.id));
      // A public record names who it is about: each fact that is a person
      // or a state.
      const core = requireCore();
      const reader = id ? core.people.get(id) : undefined;
      const stateNames = new Map([
        ...corePlaceStateIdentities().map(
          (row) => [row.jurisdictionKey, row.name] as const,
        ),
        ["US", "the United States"] as const,
      ]);
      send(
        200,
        [
          ...heard,
          ...newsItems(core).filter(
            (row) => row.visibility === "public" && !seen.has(row.id),
          ),
          // Laws other states passed lately, under the Nation heading.
          ...nationStories(core, controls.news.nation, id ?? undefined),
        ].map((row) => {
          // The player's own paper: an outlet of the place they live in, which
          // News opens on (homePapers in archive-words.ts).
          const outlet = (row as { outlet?: { id: string } }).outlet;
          if (outlet && reader)
            row = {
              ...row,
              outlet: {
                ...outlet,
                home:
                  core.organizations.get(outlet.id as never)?.placeId ===
                  reader.placeId,
              },
            } as typeof row;
          const facts = (row as { facts?: Record<string, unknown> }).facts;
          const names: Record<string, string> = {};
          for (const value of Object.values(facts ?? {})) {
            if (typeof value !== "string") continue;
            const person = core.people.get(value);
            if (person)
              names[person.id] = `${person.givenName} ${person.familyName}`;
            // A state's jurisdiction by its name, not its key.
            const state = stateNames.get(value);
            if (state) names[value] = state;
          }
          return Object.keys(names).length ? { ...row, names } : row;
        }),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/opening",
    run: async ({ url, send }) => {
      const id = url.searchParams.get("id") ?? "";
      send(
        200,
        state.opening && state.player?.personId === id
          ? state.opening
          : state.director?.ledger.opening
            ? openingFrames(requireCore(), id, state.director.ledger.opening)
            : null,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/known",
    run: async ({ url, send }) => {
      send(
        200,
        knownCard(
          requireCore(),
          url.searchParams.get("id") ?? "",
          personOrFillIn(requireCore(), url.searchParams.get("other") ?? "")
            ?.id ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/openings",
    run: async ({ url, send }) => {
      send(200, openingsView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/card",
    run: async ({ url, send }) => {
      send(200, personCard(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/government/state",
    run: async ({ url, send }) => {
      send(200, {
        states: politicsStates(),
        legislators: stateLegislators(
          requireCore(),
          url.searchParams.get("state") ?? "",
          url.searchParams.get("level") === "federal" ? "federal" : "state",
        ),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname === "/api/government/local-races",
    run: async ({ send }) => {
      send(200, localRaces(requireCore()));
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/government/bodies",
    run: async ({ url, send }) => {
      const level = url.searchParams.get("level");
      send(
        200,
        governmentBodies(
          requireCore(),
          url.searchParams.get("id") ?? "",
          level === "state" || level === "federal" ? level : "local",
          url.searchParams.get("state") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/government",
    run: async ({ url, send }) => {
      send(
        200,
        governmentView(requireCore(), url.searchParams.get("id") ?? ""),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/party/join",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        joinPartyAs(
          requireCore(),
          state.player.personId,
          url.searchParams.get("partyId") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/file",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        fileForOffice(
          requireCore(),
          state.player.personId,
          url.searchParams.get("contestId") ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/advance",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const result = state.player.advance(
        url.searchParams.get("mode") ?? "day",
        url.searchParams.get("date") ?? undefined,
      );
      send(200, {
        ...result,
        names: namesFor(result.packet),
        progress: benchProgress(
          requireCore(),
          state.placeId,
          state.player?.personId,
        ),
        pollingPlace: state.player.pollingPlace
          ? pollingScene(requireCore(), state.player.pollingPlace)
          : null,
        candidateMorning: state.player.candidateMorning ?? null,
      });
      return;
    },
  },
  // Election morning: what the day holds, the canvass for a candidate,
  // and the choice to vote.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/election-day",
    run: async ({ send }) => {
      const visit = state.player?.pollingPlace;
      const date = visit?.record.electionDate ?? state.player?.candidateMorning;
      send(
        200,
        date && state.player?.personId
          ? {
              ...electionDay(
                requireCore(),
                state.player.personId,
                visit ?? null,
                state.canvassedOn.has(`${state.player.personId}|${date}`),
                date,
              ),
              // The card shows election morning, not the midnight the
              // clock stopped at to ask.
              at: { date, minuteOfDay: state.player.dayStartMinute() },
            }
          : null,
      );
      return;
    },
  },
  // A candidate's morning with no ballot here: done once they go on.
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/election-day/done",
    run: async ({ send }) => {
      if (state.player) state.player.candidateMorning = undefined;
      send(200, { ok: true });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/election-day/canvass",
    run: async ({ send }) => {
      const visit = state.player?.pollingPlace;
      const date = visit?.record.electionDate ?? state.player?.candidateMorning;
      if (!date || !state.player?.personId)
        throw new Error("There is no election today.");
      const day = electionDay(
        requireCore(),
        state.player.personId,
        visit ?? null,
        false,
        date,
      );
      if (!day.canvass) throw new Error("You aren't on the ballot today.");
      const result = campaignDay(requireCore(), state.player.personId, {
        filingId: day.canvass.filingId,
        kind: "canvass",
      });
      state.canvassedOn.add(`${state.player.personId}|${date}`);
      send(200, {
        line: canvassedLine(
          requireCore(),
          state.player.personId,
          date,
          day.canvass.filingId,
          result,
        ),
        scene: result.scene ?? null,
      });
      return;
    },
  },
  // Election day at the polls: the ballot, marked race by race, or left.
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/office/cases",
    run: async ({ url, send }) => {
      send(
        200,
        officeCases(
          requireCore(),
          url.searchParams.get("id") ?? state.player?.personId ?? "",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/office/case",
    run: async ({ url, send }) => {
      if (!state.player?.personId) throw new Error("Choose a resident first.");
      const decision = url.searchParams.get("decision");
      send(
        200,
        decideCase(
          requireCore(),
          state.player.personId,
          url.searchParams.get("caseId") ?? "",
          decision === "help" ? "help" : "decline",
        ),
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/polling-place",
    run: async ({ send }) => {
      send(
        200,
        state.player?.pollingPlace
          ? pollingScene(requireCore(), state.player.pollingPlace)
          : null,
      );
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/polling-place/mark",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const record = state.player.markBallot(
        url.searchParams.get("contestId") ?? "",
        url.searchParams.get("candidateId") || null,
      );
      send(200, {
        record,
        pollingPlace: state.player.pollingPlace
          ? pollingScene(requireCore(), state.player.pollingPlace)
          : null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/polling-place/leave",
    run: async ({ send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const date = state.player.pollingPlace?.record.electionDate;
      const record = state.player.leavePolls();
      send(200, {
        record,
        pollingPlace: null,
        // Staying home without marking anything: no ballot is cast.
        line:
          date && state.player.personId && !Object.keys(record.marked).length
            ? stayedHomeLine(
                requireCore(),
                state.player.personId,
                date,
                record.contestIds,
              )
            : null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/resume",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const pauseId = url.searchParams.get("pauseId") ?? "";
      const result = state.player.resume({ kind: "stop", pauseId });
      send(200, {
        ...result,
        names: namesFor(result.packet),
        progress: benchProgress(
          requireCore(),
          state.placeId,
          state.player?.personId,
        ),
        pollingPlace: state.player.pollingPlace
          ? pollingScene(requireCore(), state.player.pollingPlace)
          : null,
        candidateMorning: state.player.candidateMorning ?? null,
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/play",
    run: async ({ url, send }) => {
      if (!state.player) throw new Error("Generate a town first.");
      const id = url.searchParams.get("id") ?? "";
      personOrFillIn(requireCore(), id);
      state.player.select(id);
      state.visit = undefined;
      if (state.conversation?.playerId !== state.player.personId)
        state.conversation = undefined;
      send(200, {
        personId: state.player.personId,
        packet: state.player.packet,
        selfChosen: state.player.selfChosen.slice(-50),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/build",
    run: async ({ url, send }) => {
      if (state.building)
        throw new Error("Opening generation is already running.");
      const seed = url.searchParams.get("seed") ?? "";
      const date = gameStartDate();
      // The developer page's size field builds a smaller town on request.
      const size = Number(url.searchParams.get("size") ?? "") || undefined;
      state.building = true;
      try {
        // Two-level, as "New life" builds it (MEMORY-FLAT): a month of the
        // full population ran the bench out of memory. Tests that need every
        // resident as a full person ask for it with full=1.
        const world = buildBenchWorld(seed, date, {
          minimumPeople: size,
          twoLevel: url.searchParams.get("full") !== "1",
        });
        state.opening = undefined;
        const { place, residents } = world;
        const next = world.core,
          nextDirector = world.director;
        state.core = next;
        state.director = nextDirector;
        state.player = new BenchPlayer(next, nextDirector);
        state.conversation = undefined;
        state.visit = undefined;
        state.placeId = place.context.jurisdiction.id;
        state.placeName = place.displayName;
        send(200, {
          seed: state.core.seed,
          date: state.core.date,
          placeId: place.context.jurisdiction.id,
          placeKey: place.key,
          placeName: place.displayName,
          jurisdictionKey: place.stateJurisdictionKey,
          residents,
          residentReferencesChecked: residents.length,
          peopleInCore: next.people.size,
          modules: [...next.modules.keys()],
          progress: benchProgress(next, place.context.jurisdiction.id),
          sourceHeads: JSON.parse(
            await readFile(
              new URL("integration-heads.json", import.meta.url),
              "utf8",
            ),
          ),
          gaps: [...state.core.gaps],
        });
      } finally {
        state.building = false;
      }
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/seed",
    run: async ({ send }) => {
      send(200, {
        seed: randomUUID(),
        date: gameStartDate(),
      });
      return;
    },
  },
];

/**
 * One request to the play server's routes (`/api/*` and `/art/*`), host
 * neutral: the dev listener (server.ts) and the desktop shell's app protocol
 * both call it, so there is one set of routes.
 */
/** A request the save records: the method and the path with its query, which carries every input. */
const BENCH_REQUEST = "bench.request";
// A recorded request replays through the bench itself (`replayLife`), not
// through the core: the kind is registered so saves.ts knows it.
registerCommand<{ method: string; url: string }>(BENCH_REQUEST, () => {
  throw new Error("A bench request replays through the bench (replayLife).");
});
/** Requests that write files, not the world: never recorded. */
const UNRECORDED = new Set(["/api/grade", "/api/gap"]);

/** Where the life's save is written: OCD_SAVE_PATH, else the system's temporary folder (part 3 picks the folder). */
export function lifeSavePath(): string {
  return process.env.OCD_SAVE_PATH ?? join(tmpdir(), "ocd-bench-life.json");
}

/** Writes the life's save (the recipe and its requests, no snapshot) through saves.ts. */
export function saveLifeNow(): SaveV1 | undefined {
  if (!state.life || !state.core) return undefined;
  const save = saveGame(state.life, { snapshot: false });
  writeFileSync(lifeSavePath(), JSON.stringify(save));
  return save;
}

/**
 * Replays a saved life into this server: the bench starts empty and runs
 * each recorded request again, so the same world is rebuilt (the bench world
 * is the same from the same seed) and the save is recorded afresh.
 */
export async function replayLife(
  save: SaveV1,
  options: BenchRequestOptions = { developer: true },
): Promise<Pick<Game, "skipped" | "upgradedFrom">> {
  Object.assign(state, {
    ...EMPTY_STATE,
    nightsWatched: new Set<string>(),
    canvassedOn: new Set<string>(),
    life: undefined,
  });
  return replaySave(save, async (command) => {
    const { method, url } = command.payload as { method: string; url: string };
    const reply = await benchRequest(
      method,
      new URL(url, "http://bench"),
      options,
    );
    if (reply.status >= 400)
      throw new Error(`${method} ${url} answered ${reply.status}`);
  });
}

export async function benchRequest(
  method: string,
  url: URL,
  options: BenchRequestOptions,
): Promise<BenchReply> {
  // What the request may change: the date it ran on and who is full yet.
  const was = state.core;
  const date = state.core?.date;
  const filled = state.core ? fillInCount(state.core) : 0;
  const reply = await answerRequest(method, url, options);
  // Every request the player makes that can change the world is recorded:
  // every POST under /api/ but the two that write files, and a read that
  // filled someone in (a person card of someone in the counts).
  const posted =
    method === "POST" &&
    url.pathname.startsWith("/api/") &&
    !UNRECORDED.has(url.pathname);
  const filledIn =
    method === "GET" &&
    state.core !== undefined &&
    state.core === was &&
    fillInCount(state.core) > filled;
  if ((posted || filledIn) && state.core) {
    const command: SaveCommand = {
      date: (date ?? state.core.date) as SaveCommand["date"],
      kind: BENCH_REQUEST,
      payload: { method, url: `${url.pathname}${url.search}` },
    };
    if (url.pathname === "/api/newlife" && state.core !== was)
      state.life = {
        core: state.core,
        recipe: {
          place: {
            seed: url.searchParams.get("seed") ?? "",
            key: url.searchParams.get("placeKey") ?? state.placeId,
          },
          twoLevel: true,
        },
        commands: [command],
        skipped: [],
      };
    else if (state.life?.core === state.core) state.life.commands.push(command);
    // Written after every request that moved the date (and a new life).
    if (state.core.date !== date || state.core !== was) saveLifeNow();
  }
  return reply;
}

async function answerRequest(
  method: string,
  url: URL,
  options: BenchRequestOptions,
): Promise<BenchReply> {
  // A game is being played: figures handed out are drawn ahead from now on.
  drawAheadOn();
  let reply: BenchReply = { status: 500, headers: {}, body: "" };
  const request = { method };
  const response = {
    writeHead: (status: number, headers: Record<string, string>) => {
      reply = { status, headers, body: "" };
    },
    end: (body: Uint8Array | string) => {
      reply = { ...reply, body };
    },
  };
  const send = (status: number, value: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(serialize(value));
  };
  try {
    if (!options.developer && DEVELOPER_ROUTES.has(url.pathname)) {
      send(404, { error: "Unknown bench route." });
      return reply;
    }
    const route = ROUTES.find((candidate) => candidate.match({ request, url }));
    if (route) await route.run({ request, url, options, send, response });
    else send(404, { error: "Unknown bench route." });
  } catch (error) {
    send(400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return reply;
}
