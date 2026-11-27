import {
  BenchRequestOptions,
  Route,
  ServerState,
  namesFor,
  requireCore,
  sceneNow,
  state,
} from "./session-state";
import { artRoutes } from "./routes/art";
import { talkRoutes } from "./routes/talk";
import { pageRoutes } from "./routes/page";
import { governmentRoutes } from "./routes/government";
import { meetingRoutes } from "./routes/meeting";
import { townRoutes } from "./routes/town";
import { billsRoutes } from "./routes/bills";
import { electionsRoutes } from "./routes/elections";
import { campaignRoutes } from "./routes/campaign";
import { drawAheadNow, drawAheadOn } from "./people-pack";
import { fillInCount, personOrFillIn } from "../core2/state";
import {
  parseSave,
  registerCommand,
  replaySave,
  saveGame,
  type Game,
  type SaveCover,
  type SaveCommand,
  type SaveV1,
} from "../core2/saves";
import { readFile } from "node:fs/promises";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BenchPlayer } from "./player";
import {
  buildBenchWorld,
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "./world";
import { gameStartDate } from "../core2/game-start";
import { personCard } from "./card";
import { openingArrivalMinute, openingFrames } from "./opening";
import { loadingStory } from "./loading";
import { faceOf, scenePlace } from "./scene";
import { TITLE_ROTATE_SECONDS, titleRotation } from "./title";

/** When this game was opened, so the title's paintings and New game's people differ each launch. */
const TITLE_LAUNCH = String(Date.now());
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  applyChosenPerson,
  chosenBirthDate,
  stateCapitolPicture,
  readChosenPerson,
} from "./creator";
import { newGameFaces } from "./appearance";
import { pollingScene } from "./polling";
import type { CoreState, PersonId } from "../core2/types";
import { benchProgress } from "./progress";
import { loadingStepLines } from "../english/loading-step-words";
import { spoken, stateInSentence } from "../director/words";
/** What the server holds before any life, for a replay to start from. */
const EMPTY_STATE: ServerState = { ...state };
export const serialize = (value: unknown) =>
  JSON.stringify(value, (_key, item) => {
    if (item instanceof Map) return Object.fromEntries(item);
    if (item instanceof Set) return [...item];
    if (typeof item === "bigint") return item.toString();
    return item;
  });

/** The world the developer view reads (dev-api.ts), the same engine state. */
export function benchWorld() {
  return {
    core: state.core,
    director: state.director,
    player: state.player,
    placeId: state.placeId,
    nightsWatched: state.nightsWatched,
    canvassedOn: state.canvassedOn,
  };
}

/**
 * A new world is a new life: the election nights the last life watched and the mornings it
 * canvassed are that life's, keyed by person and race, and a world built again from the same
 * seed has the same people and races. Kept, they hid the new life's own election night.
 */
function forgetLastLife(): void {
  state.nightsWatched = new Set<string>();
  state.canvassedOn = new Set<string>();
}

/** What the handler sends back: a status, headers and a body. */
export interface BenchReply {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}
// The play page never calls these; they are the bench's developer view.
const DEVELOPER_ROUTES = new Set(["/api/build"]);
const ROUTES: readonly Route[] = [
  ...artRoutes,
  ...talkRoutes,
  ...pageRoutes,
  ...governmentRoutes,
  ...meetingRoutes,
  ...townRoutes,
  ...billsRoutes,
  ...electionsRoutes,
  ...campaignRoutes,
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
        state.loadingLines = null;
        // Every game opens on the one start date (owner, Oct 14, 2026).
        const world = await buildBenchWorldInStages(
          url.searchParams.get("seed") ?? "",
          gameStartDate(),
          {
            twoLevel: true,
            warmUpDays: OPENING_WARMUP_DAYS,
            // The loading card's dry lines name the place being built.
            onPlace: (place) => {
              state.loadingLines = loadingStepLines({
                place: spoken(place),
                ...(place.withinName
                  ? { state: stateInSentence(place.withinName) }
                  : {}),
              });
            },
            // Who the player is, chosen before the world's first weeks run.
            ...(chosen
              ? {
                  chooseIdentity: (core: CoreState, playerId: string) =>
                    applyChosenPerson(core, playerId, chosen),
                }
              : {}),
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
        forgetLastLife();
        state.placeId = world.placeId;
        state.placeName = world.place.displayName;
        const entrant = { personId: world.playerId! };
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
        // Shown now, it is opened: the director's waiting list does not stop
        // the clock for it again tomorrow.
        if (staged?.outcome === "scene-waiting")
          world.director.openWaiting(
            entrant.personId as PersonId,
            staged.momentId,
            {
              date: makeIsoDate(world.core.date),
              minuteOfDay: openingArrivalMinute(world.core, entrant.personId),
            },
          );
        send(200, {
          personId: entrant.personId,
          placeName: world.place.displayName,
          // The state's capitol, behind the world's story while it plays.
          capitol: stateCapitolPicture(world.place.stateJurisdictionKey),
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
      request.method === "GET" && url.pathname === "/api/title",
    run: async ({ send }) => {
      // One visit to the title: its scene; the life to continue (the one in
      // play, else the most recent save); and every saved life.
      // This launch's stamp starts the rotation on other paintings each time the game is opened.
      const visit = state.titleVisits++;
      const today = new Date().toISOString().slice(0, 10);
      const scenes = titleRotation([today, TITLE_LAUNCH].join("#"), visit);
      const playing = lifeCover();
      const saves = savedLives().map(({ id, save }) => ({
        ...(id === state.lifeId && playing ? playing : save.cover),
        saveId: id,
        // In play now: Continue opens it without loading.
        playing: id === state.lifeId && Boolean(playing),
      }));
      send(200, {
        ...scenes[0]!,
        scenes,
        rotateSeconds: TITLE_ROTATE_SECONDS,
        // New game's busts, before any world exists.
        newGame: newGameFaces([TITLE_LAUNCH, visit].join("#")),
        life: playing
          ? {
              ...playing,
              saveId: state.lifeId,
              playing: true,
              packet: state.player!.packet,
            }
          : (saves.find((life) => life.personId) ?? null),
        saves: saves.filter((life) => life.personId),
      });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "POST" && url.pathname === "/api/load",
    run: async ({ url, options, send }) => {
      // A saved life loaded: its requests replayed into this server, so the
      // same world, day and household come back (saves.ts).
      const id = url.searchParams.get("save") ?? "";
      const found = savedLives().find((life) => life.id === id);
      if (!found) throw new Error("No such saved life.");
      // The life in play is written first: what it did since its last day is kept.
      saveLifeNow();
      await replayLife(found.save, options, id);
      const life = lifeCover();
      if (!life) throw new Error("The saved life did not load.");
      send(200, { ...life, saveId: id, packet: state.player!.packet });
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/newlife/progress",
    run: async ({ send }) => {
      send(200, {
        ...state.buildProgress,
        story: state.loadingPeek !== null,
        // The dry line pool of each step, with the start place said in it.
        lines: state.loadingLines ?? {},
      });
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
        forgetLastLife();
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
/** Requests that write files or load a save, not the world: never recorded. */
const UNRECORDED = new Set(["/api/grade", "/api/gap", "/api/load"]);

/**
 * The folder the saves are kept in, one file per life: OCD_SAVE_DIR, which
 * every way the game is launched sets (the desktop app to its own data
 * folder, the bench server to the home folder), else a folder in the
 * system's temporary folder for tests and scripts.
 */
export function saveFolder(): string {
  return process.env.OCD_SAVE_DIR ?? join(tmpdir(), "ocd-saves");
}

/** The file a life's save is written to, by the life's id. */
export function savePath(lifeId: string): string {
  return join(saveFolder(), `${lifeId}.json`);
}

/** The id of the life a replay is rebuilding: no save is written until it is done. */
let replaying: string | undefined;

/** The player's life as the title shows it (Continue and Saved games), from the records now. */
function lifeCover(): SaveCover | undefined {
  const core = state.core;
  const personId = core ? state.player?.personId : undefined;
  const person = personId ? core!.people.get(personId) : undefined;
  if (!core || !personId) return undefined;
  return {
    personId,
    name: `${person?.givenName ?? ""} ${person?.familyName ?? ""}`,
    age: ageOnDate(
      makeIsoDate(person?.birthDate ?? core.date),
      makeIsoDate(core.date),
    ),
    // The player's one face, as every screen in play draws it (older head
    // and gray hair past 65), never the creator's look drawn a second way.
    face: faceOf(core, personId, scenePlace(core, personId).place),
    placeName: state.placeName,
    date: core.date,
    minuteOfDay:
      state.player!.packet?.at.minuteOfDay ??
      state.opening?.home?.minuteOfDay ??
      0,
  };
}

/** Writes the life's save (the recipe, its requests and its cover, no snapshot) through saves.ts. */
export function saveLifeNow(): SaveV1 | undefined {
  if (!state.life || !state.core || !state.lifeId || replaying)
    return undefined;
  const cover = lifeCover();
  const save = saveGame(state.life, {
    snapshot: false,
    ...(cover ? { cover } : {}),
  });
  mkdirSync(saveFolder(), { recursive: true });
  writeFileSync(savePath(state.lifeId), JSON.stringify(save));
  return save;
}

/** Every save in the folder that this version can read, the most recently written first. */
export function savedLives(): { id: string; save: SaveV1 }[] {
  let names: string[];
  try {
    names = readdirSync(saveFolder()).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  const lives: { id: string; save: SaveV1; written: number }[] = [];
  for (const name of names) {
    const file = join(saveFolder(), name);
    try {
      lives.push({
        id: name.slice(0, -".json".length),
        save: parseSave(readFileSync(file, "utf8")),
        written: statSync(file).mtimeMs,
      });
    } catch {
      // Not a save this version reads (owner, Nov 15: saves "don't need to be transferable between versions").
    }
  }
  return lives
    .sort((a, b) => b.written - a.written)
    .map(({ id, save }) => ({ id, save }));
}

/** The server as it starts, before any life: as a restart leaves it, and where a replay begins. */
export function emptyBench(): void {
  Object.assign(state, {
    ...EMPTY_STATE,
    nightsWatched: new Set<string>(),
    canvassedOn: new Set<string>(),
    life: undefined,
    lifeId: undefined,
  });
}

/**
 * Replays a saved life into this server: the bench starts empty and runs
 * each recorded request again, so the same world is rebuilt (the bench world
 * is the same from the same seed) and the save is recorded afresh. Given the
 * life's id, the life keeps it and its file is written once, at the end.
 */
export async function replayLife(
  save: SaveV1,
  options: BenchRequestOptions = { developer: true },
  lifeId?: string,
): Promise<Pick<Game, "skipped" | "upgradedFrom">> {
  emptyBench();
  replaying = lifeId ?? "replay";
  try {
    return await replayCommands(save, options);
  } finally {
    replaying = undefined;
    if (lifeId && state.life) {
      state.lifeId = lifeId;
      saveLifeNow();
    }
  }
}

async function replayCommands(
  save: SaveV1,
  options: BenchRequestOptions,
): Promise<Pick<Game, "skipped" | "upgradedFrom">> {
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
    if (url.pathname === "/api/newlife" && state.core !== was) {
      // A new life is a new save file; a replayed one keeps its own.
      state.lifeId = replaying ? undefined : `life-${Date.now()}`;
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
    } else if (state.life?.core === state.core)
      state.life.commands.push(command);
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
