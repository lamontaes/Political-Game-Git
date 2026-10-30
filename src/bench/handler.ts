import { figureAtPath, figurePng } from "./people-pack";
import { frontPng } from "./mannequin-plates";
import { writeLineGrade } from "./grade-line";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { personOrFillIn } from "../core2/state";
import { parameter } from "../core2/parameters";
import { SITUATION_LIBRARY } from "../director/scheduling";
import { relatedGuideTerms, searchGuideTerms } from "./guide-terms";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { BenchPlayer } from "./player";
import { buildBenchWorld, buildBenchWorldInStages } from "./world";
import { gameStartDate } from "../core2/game-start";
import { knownCard, personCard } from "./card";
import { OPENING_EVENING_MINUTE, openingFrames } from "./opening";
import { calendarItems, heardItems, newsItems } from "./calendar";
import {
  campaignAct,
  campaignDay,
  campaignView,
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
import {
  canvassedLine,
  electionDay,
  electionNight,
  stayedHomeLine,
} from "./election-night";
import { wordOwnResult } from "./archive-words";
import { billPaper, seatAct, seatView } from "./legislature";
import {
  deskDecide,
  deskView,
  meetingAdjourn,
  meetingItem,
  meetingSpeak,
  meetingSceneView,
  colleagueDeal,
  nameHeadPick,
  budgetLinePick,
  officeView,
} from "./office";
import { bankView } from "./bank";
import { budgetView, setPriority } from "./budget";
import {
  chooseAtCounter,
  officePlace,
  openBenchFilingVisit,
  type BenchFilingVisit,
} from "./filing";
import { backdropFile, backdropPath, benchScene } from "./scene";
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
  portraitFace,
  portraitPng,
  readRecipe,
  setColor,
} from "./appearance";
import { pollingScene } from "./polling";
import {
  openConversation,
  say,
  sayNothing,
  type Conversation,
} from "../director/conversation";
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
let core: CoreState | undefined;
let director: Director | undefined;
let player: BenchPlayer | undefined;
let placeId = "";
let building = false;
let placeName = "";
/** Visits to the title since the server started; each moves the scene on. */
let titleVisits = 0;
let conversation: Conversation | undefined;
let filingVisit: BenchFilingVisit | undefined;
/** The election nights each player has watched, and the mornings they canvassed. */
const nightsWatched = new Set<string>();
const canvassedOn = new Set<string>();
/** The speech the player is building, one part at a time. */
let speechBuild: SpeechBuild | undefined;
// Where the build is, for the loading screen's polls.
let buildProgress: { stage: string; done: number; total: number } = {
  stage: "done",
  done: 0,
  total: 0,
};
// The opening, prepared during loading.

let opening: ReturnType<typeof openingFrames> | null | undefined;
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
  if (!core) throw new Error("Generate a town first.");
  return core;
}

let marker: DevMode | undefined;
/** The dev-mode record writer for the current town, which holds the gap marks. */
function gapMarker(): DevMode {
  const current = requireCore();
  if (marker?.core !== current)
    marker = new DevMode(current, director, player, placeId);
  return marker;
}

/** The world the developer view reads (dev-api.ts), the same engine state. */
export function benchWorld() {
  return { core, director, player, placeId };
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

/**
 * One request to the play server's routes (`/api/*` and `/art/*`), host
 * neutral: the dev listener (server.ts) and the desktop shell's app protocol
 * both call it, so there is one set of routes.
 */
export async function benchRequest(
  method: string,
  url: URL,
  options: BenchRequestOptions,
): Promise<BenchReply> {
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
    await (async () => {
      if (request.method === "POST" && url.pathname === "/api/newlife") {
        if (building) throw new Error("Opening generation is already running.");
        building = true;
        try {
          // The whole town, two-level (OPUS-CORE): full people for the
          // player's circle and officials, counts for everyone else.
          buildProgress = { stage: "people", done: 0, total: 0 };
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
              ...(chosen ? { playerBirthDate: chosenBirthDate(chosen) } : {}),
              ...(url.searchParams.get("settings")
                ? { settings: JSON.parse(url.searchParams.get("settings")!) }
                : {}),
              ...(url.searchParams.get("placeKey")
                ? { placeKey: url.searchParams.get("placeKey")! }
                : {}),
            },
            (stage) => {
              buildProgress = { stage, done: 0, total: 0 };
            },
          );
          core = world.core;
          director = world.director;
          player = new BenchPlayer(world.core, world.director);
          conversation = undefined;
          placeId = world.placeId;
          placeName = world.place.displayName;
          const entrant = { personId: world.playerId! };
          // The person chosen in the creator becomes the player.
          if (chosen) applyChosenPerson(world.core, entrant.personId, chosen);
          player.select(entrant.personId);
          // The opening is prepared during loading; its whole figures are files.
          opening = world.director.ledger.opening
            ? openingFrames(
                world.core,
                entrant.personId,
                world.director.ledger.opening,
              )
            : null;
          buildProgress = { stage: "done", done: 0, total: 0 };
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
            date: core.date,
            packet: player.packet,
            names: {},
            ...(staged ? { sceneMomentId: staged.momentId } : {}),
          });
        } finally {
          building = false;
        }
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/art/people/")) {
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
      }
      if (
        request.method === "GET" &&
        url.pathname.startsWith("/art/people-rooms/fronts/")
      ) {
        // The furniture a plate paints in front of a mannequin, as a mask.
        response.writeHead(200, {
          "Content-Type": "image/png",
          "Cache-Control": "max-age=3600",
        });
        response.end(
          frontPng(url.pathname.slice("/art/people-rooms/fronts/".length)),
        );
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname.startsWith("/art/backdrops/occluders/")
      ) {
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
      }
      if (
        request.method === "GET" &&
        url.pathname.startsWith("/art/backdrops/")
      ) {
        const content = await readFile(
          backdropPath(url.pathname.slice("/art/backdrops/".length)),
        );
        response.writeHead(200, {
          "Content-Type": "image/jpeg",
          "Cache-Control": "max-age=3600",
        });
        response.end(content);
        return;
      }
      const newspaper = /^\/art\/newspaper\/([a-z0-9-]+\.jpg)$/.exec(
        url.pathname,
      );
      if (request.method === "GET" && newspaper) {
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
      }
      if (request.method === "GET" && url.pathname === "/api/scene") {
        const current = requireCore();
        const id = url.searchParams.get("id") ?? "";
        // Someone still in the counts is filled in the moment they're looked at.
        if (!personOrFillIn(current, id))
          throw new Error("Resident does not exist in core records.");
        const playing = player?.personId === id;
        // The opening day ends at home that evening, where the news is.
        const openingDay =
          playing &&
          !player!.packet &&
          director?.ledger.opening?.date === current.date;
        send(
          200,
          benchScene(
            current,
            id,
            playing ? player!.packet : undefined,
            openingDay ? OPENING_EVENING_MINUTE : undefined,
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/talk/open") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        const otherId = url.searchParams.get("otherId") ?? "";
        if (!personOrFillIn(requireCore(), otherId)?.alive)
          throw new Error("Talk to a living resident.");
        // A talk a scene opens is about the scene's moment.
        const occasionId = url.searchParams.get("momentId") ?? undefined;
        conversation = openConversation(
          requireCore(),
          player.personId,
          otherId,
          director ? { director, ...(occasionId ? { occasionId } : {}) } : {},
        );
        send(200, talkView(conversation));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/talk/say") {
        if (!conversation) throw new Error("No conversation is open.");
        conversation = say(
          requireCore(),
          conversation,
          url.searchParams.get("key") ?? "",
        );
        send(200, talkView(conversation));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/talk/silent") {
        if (!conversation) throw new Error("No conversation is open.");
        conversation = sayNothing(requireCore(), conversation);
        send(200, talkView(conversation));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/gap") {
        // Mark the talk's newest line as a gap (play-mark-gap): one record
        // naming the scene and the line; no game time passes.
        if (!conversation) throw new Error("No conversation is open.");
        const view = talkView(conversation)!;
        const at = Number(
          url.searchParams.get("line") ?? view.lines.length - 1,
        );
        const line = view.lines[at];
        if (!line) throw new Error("No such line.");
        const sceneId =
          conversation.occasion?.id ??
          `talk:${conversation.playerId}:${conversation.otherId}:${requireCore().date}`;
        send(200, gapMarker().markGap(sceneId, `${sceneId}#${at}`, line.text));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/gaps") {
        send(200, gapMarker().gaps());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/talk/leave") {
        conversation = undefined;
        send(200, {});
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/journal") {
        if (!director) throw new Error("Generate a town first.");
        send(
          200,
          composeJournal(
            requireCore(),
            director,
            url.searchParams.get("id") ?? "",
            // The player's own journal reads to their clock, which stands at
            // the start of a day the core has yet to run (a birthday morning).
            player?.packet && player.personId === url.searchParams.get("id")
              ? { through: player.packet.at.date }
              : {},
          ),
        );
        return;
      }
      if (url.pathname.startsWith("/api/creator/")) {
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
          send(200, creatorTowns(q.get("state") ?? "", q.get("q") ?? ""));
        else if (route === "place") send(200, creatorRandomPlace(seed, draw));
        else if (route === "appearance") {
          const recipe = q.get("recipe")
            ? request.method === "POST"
              ? q.get("value")
                ? setColor(
                    readRecipe(q.get("recipe")!),
                    q.get("row") ?? "",
                    q.get("value")!,
                  )
                : moveAppearance(
                    readRecipe(q.get("recipe")!),
                    gender,
                    q.get("row") ?? "",
                    Number(q.get("by") ?? 1),
                  )
              : readRecipe(q.get("recipe")!)
            : drawnAppearance(gender, seed, draw);
          const fitted = lookForGender(recipe, gender);
          send(200, { recipe: fitted, rows: appearanceRows(fitted, gender) });
        } else send(404, { error: "Unknown bench route." });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/portrait") {
        // The engine's portrait: a recipe from the creator, or a person's own.
        const id = url.searchParams.get("id");
        const kept = id
          ? requireCore().people.get(id)?.looks?.recipe
          : url.searchParams.get("recipe");
        if (!kept) throw new Error("No portrait.");
        response.writeHead(200, {
          "Content-Type": "image/png",
          "Cache-Control": "max-age=3600",
        });
        // Everyday clothes, or with dress=work the work clothes (the creator
        // shows the two side by side).
        response.end(
          portraitPng(
            readRecipe(kept),
            url.searchParams.get("dress") === "work" ? "work" : "everyday",
          ),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/title") {
        // One visit to the title: its scene, and the life in progress to
        // continue (the server's current life), or none.
        const personId = core ? player?.personId : undefined;
        const scenes = titleRotation(
          new Date().toISOString().slice(0, 10),
          titleVisits++,
        );
        send(200, {
          ...scenes[0]!,
          scenes,
          rotateSeconds: TITLE_ROTATE_SECONDS,
          life: personId
            ? {
                personId,
                name: `${core!.people.get(personId)?.givenName ?? ""} ${core!.people.get(personId)?.familyName ?? ""}`,
                age: ageOnDate(
                  makeIsoDate(
                    core!.people.get(personId)?.birthDate ?? core!.date,
                  ),
                  makeIsoDate(core!.date),
                ),
                portrait: Boolean(core!.people.get(personId)?.looks?.recipe),
                // The face the creator saved, for Continue's headshot.
                face: core!.people.get(personId)?.looks?.recipe
                  ? portraitFace(
                      readRecipe(core!.people.get(personId)!.looks!.recipe!),
                      `/api/portrait?id=${encodeURIComponent(personId)}`,
                    )
                  : null,
                placeName,
                date: core!.date,
                minuteOfDay:
                  player!.packet?.at.minuteOfDay ??
                  opening?.home?.minuteOfDay ??
                  0,
                packet: player!.packet,
              }
            : null,
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/version") {
        // Source runs have no bundler define; the package's release number is the record.
        const { version } = JSON.parse(
          await readFile(
            new URL("../../package.json", import.meta.url),
            "utf8",
          ),
        );
        send(200, { version });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/map") {
        // The state's map with the player's districts and who holds each,
        // for Parties (owner, Oct 28, point 20: "bring it back").
        send(200, governmentMap(requireCore()));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/patch-notes") {
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
      }
      if (request.method === "GET" && url.pathname === "/api/bank") {
        send(200, bankView(requireCore(), url.searchParams.get("id") ?? ""));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/budget") {
        send(200, budgetView(requireCore(), url.searchParams.get("id") ?? ""));
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/budget/priority"
      ) {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          setPriority(
            requireCore(),
            player.personId,
            url.searchParams.get("governmentId") ?? "",
            url.searchParams.get("line") ?? "",
            Number(url.searchParams.get("change")) || 0,
          ),
        );
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/advanced/officeholders"
      ) {
        send(200, officeholders(requireCore()));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/goto") {
        send(
          200,
          townPlaces(
            requireCore(),
            url.searchParams.get("id") ?? player?.personId ?? "",
            player?.packet,
          ),
        );
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/goto/counter-picture"
      ) {
        // The picture of the office that takes a contest's filings.
        send(200, {
          url: backdropFile(
            officePlace(url.searchParams.get("filedWith") ?? ""),
            player?.packet?.at.minuteOfDay ?? 12 * 60,
          ).url,
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/goto/visit") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          visitPlace(
            requireCore(),
            player.personId,
            url.searchParams.get("org") ?? "",
            player.packet?.at.minuteOfDay ?? 12 * 60,
          ),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/changes") {
        send(200, lawChanges(requireCore(), url.searchParams.get("id") ?? ""));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/guide") {
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
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/newlife/progress"
      ) {
        send(200, buildProgress);
        return;
      }
      // The player's interrupt setting (owner, Oct 14, 2026): which kinds of
      // scene may stop the day. A director record its scheduling reads.
      if (url.pathname === "/api/scene-filter") {
        if (!director || !player?.personId)
          throw new Error("Start a life first.");
        if (request.method === "POST") {
          const kinds = url.searchParams.get("kinds");
          director.setSceneFilter(
            player.personId,
            kinds === null || kinds === "all"
              ? null
              : kinds.split(",").filter(Boolean),
            requireCore().date,
          );
        }
        const filter = director.ledger.sceneFilters.get(player.personId);
        send(200, {
          kinds: SITUATION_LIBRARY.types.map((row) => row.key),
          allowed: filter?.allowedKinds ?? null,
          ...(filter ? { recordId: filter.id } : {}),
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/controls") {
        // A position's name: a policy or law on the bill catalog, or a local
        // seat's budget line.
        send(200, {
          ...controls,
          policyNames: { ...policyNames(), ...budgetLineNames() },
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/progress") {
        send(
          200,
          benchProgress(
            requireCore(),
            placeId,
            url.searchParams.get("id") ?? undefined,
          ),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/seat") {
        send(200, seatView(requireCore(), url.searchParams.get("id") ?? ""));
        return;
      }
      // A bill as one paper document, read from its own records.
      if (request.method === "GET" && url.pathname === "/api/bill") {
        send(
          200,
          billPaper(requireCore(), url.searchParams.get("billId") ?? ""),
        );
        return;
      }
      // The officeholder's day (OFFICE-LOCAL): the meeting scene, the desk and the stops.
      if (request.method === "GET" && url.pathname === "/api/meeting") {
        send(
          200,
          player?.personId
            ? meetingSceneView(
                requireCore(),
                player.personId,
                player.packet?.at.minuteOfDay ?? 18 * 60,
              )
            : null,
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/meeting/item") {
        if (!player?.personId) throw new Error("Choose a resident first.");
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
            player.personId,
            player.packet?.at.minuteOfDay ?? 18 * 60,
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/meeting/speak") {
        if (!player?.personId) throw new Error("Choose a resident first.");
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
            player.personId,
            player.packet?.at.minuteOfDay ?? 18 * 60,
          ),
        );
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/meeting/adjourn"
      ) {
        meetingAdjourn(requireCore(), url.searchParams.get("meetingId") ?? "");
        send(200, null);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/desk") {
        send(200, player?.personId ? deskView(requireCore()) : []);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/desk") {
        deskDecide(
          requireCore(),
          url.searchParams.get("billId") ?? "",
          url.searchParams.get("how") ?? "",
        );
        send(200, deskView(requireCore()));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/office") {
        send(200, officeView(requireCore(), url.searchParams.get("id") ?? ""));
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/office/name-head-pick"
      ) {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          nameHeadPick(
            requireCore(),
            player.personId,
            url.searchParams.get("post") ?? "",
            url.searchParams.get("nomineeId") ?? "",
          ),
        );
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/office/budget-line"
      ) {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          budgetLinePick(
            requireCore(),
            player.personId,
            url.searchParams.get("line") ?? "",
            Number(url.searchParams.get("changeMinor")),
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/office/deal") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          colleagueDeal(
            requireCore(),
            player.personId,
            url.searchParams.get("memberId") ?? "",
            url.searchParams.get("deal") ?? "",
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/seat/act") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        const q = (key: string) => url.searchParams.get(key) ?? undefined;
        send(
          200,
          seatAct(requireCore(), player.personId, {
            kind: q("kind") ?? "",
            officeId: q("officeId"),
            series: q("series"),
            question: q("question"),
            line: q("line"),
            value: q("value") === undefined ? undefined : Number(q("value")),
          }),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/results") {
        send(
          200,
          electionResults(requireCore(), url.searchParams.get("id") ?? ""),
        );
        return;
      }
      // Election night: the newest night's race, its returns place by place
      // and the call, once per race until the player has watched it.
      if (request.method === "GET" && url.pathname === "/api/election-night") {
        const id = url.searchParams.get("id") ?? "";
        const night = id ? electionNight(requireCore(), id) : null;
        send(
          200,
          night && !nightsWatched.has(`${id}|${night.contestId}`)
            ? night
            : null,
        );
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/election-night/watched"
      ) {
        nightsWatched.add(
          `${url.searchParams.get("id") ?? ""}|${url.searchParams.get("contestId") ?? ""}`,
        );
        send(200, { ok: true });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/economy") {
        send(200, economyView(requireCore(), placeId));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/world-panels") {
        send(200, worldPanels(requireCore(), placeId));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/story") {
        if (!player?.personId || !director)
          throw new Error("Choose a resident first.");
        send(
          200,
          storyScene(
            requireCore(),
            director,
            player.personId,
            url.searchParams.get("momentId") ?? "",
            // The opening day's scene is that evening at home (as /api/scene).
            player.packet?.at.minuteOfDay ??
              (director.ledger.opening?.date === requireCore().date
                ? OPENING_EVENING_MINUTE
                : 12 * 60),
            // ?held=1 on the play page: the grading view, held lines marked.
            { held: url.searchParams.get("held") === "1" },
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/grade") {
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
      }
      if (request.method === "POST" && url.pathname === "/api/story/reply") {
        if (!player?.personId || !director)
          throw new Error("Choose a resident first.");
        send(
          200,
          storyReply(
            requireCore(),
            director,
            player.personId,
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
      }
      if (request.method === "GET" && url.pathname === "/api/campaign") {
        send(
          200,
          campaignView(requireCore(), url.searchParams.get("id") ?? ""),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/campaign/act") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        const number = (key: string) =>
          Number(url.searchParams.get(key)) || undefined;
        send(
          200,
          campaignAct(requireCore(), player.personId, {
            filingId: url.searchParams.get("filingId") ?? "",
            kind: url.searchParams.get("kind") ?? "",
            amountMinor: number("amountMinor"),
            sampleSize: number("sampleSize"),
          }),
        );
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/campaign/speech/begin"
      ) {
        if (!player?.personId) throw new Error("Choose a resident first.");
        speechBuild = speechBegin(requireCore(), player.personId);
        send(200, speechView(speechBuild));
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/campaign/speech/pick"
      ) {
        if (!speechBuild) throw new Error("No speech is being built.");
        speechBuild = speechPick(
          requireCore(),
          speechBuild,
          url.searchParams.get("key") ?? "",
        );
        send(200, speechView(speechBuild));
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/campaign/speech/give"
      ) {
        if (!player?.personId) throw new Error("Choose a resident first.");
        if (!speechBuild) throw new Error("No speech is being built.");
        const given = speechGive(requireCore(), player.personId, speechBuild, {
          filingId: url.searchParams.get("filingId") ?? "",
          venue: url.searchParams.get("venue") ?? "",
        });
        speechBuild = undefined;
        send(200, given);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/campaign/day") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        const day = campaignDay(requireCore(), player.personId, {
          filingId: url.searchParams.get("filingId") ?? "",
          kind: url.searchParams.get("kind") ?? "",
          outletId: url.searchParams.get("outletId") ?? undefined,
        });
        // The outing's hours come off the same clock the packet reports.
        const spent = player.spend(day.hours);
        send(200, {
          ...day,
          ...(spent
            ? { packet: spent.packet, names: namesFor(spent.packet) }
            : {}),
        });
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/campaign/debate"
      ) {
        if (!player?.personId) throw new Error("Choose a resident first.");
        const answers = JSON.parse(url.searchParams.get("answers") ?? "[]") as {
          question: string;
          position: number | null;
        }[];
        send(
          200,
          debateAnswer(
            requireCore(),
            player.personId,
            url.searchParams.get("debateId") ?? "",
            answers,
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/filing/open") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        filingVisit = openBenchFilingVisit(
          requireCore(),
          player.personId,
          url.searchParams.get("filedWith") ?? "",
          player.packet?.at.minuteOfDay ?? 12 * 60,
        );
        send(200, filingVisit);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/filing/choose") {
        if (!filingVisit) throw new Error("No filing visit is open.");
        const before = filingVisit.result;
        filingVisit = chooseAtCounter(
          requireCore(),
          filingVisit,
          url.searchParams.get("key") ?? "",
          {
            platform: url.searchParams.getAll("stance"),
            party: url.searchParams.get("party") || null,
          },
        );
        // Filing takes the afternoon at the counter: taking out the
        // petition, the clerk's questions, the wait. The hours come off the
        // same clock the packet reports.
        const filed = filingVisit.result as { status?: string } | undefined;
        const spent =
          filed && filed !== before && filed.status !== "refused"
            ? player?.spend(
                parameter("filingVisitHours", requireCore().data.parameters),
              )
            : undefined;
        send(200, {
          ...filingVisit,
          ...(spent
            ? { packet: spent.packet, names: namesFor(spent.packet) }
            : {}),
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/filing/leave") {
        filingVisit = undefined;
        send(200, {});
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/calendar") {
        send(200, {
          date: requireCore().date,
          items: calendarItems(requireCore(), url.searchParams.get("id") ?? ""),
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/news") {
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
          ].map((row) => {
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
      }
      if (request.method === "GET" && url.pathname === "/api/opening") {
        const id = url.searchParams.get("id") ?? "";
        send(
          200,
          opening && player?.personId === id
            ? opening
            : director?.ledger.opening
              ? openingFrames(requireCore(), id, director.ledger.opening)
              : null,
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/known") {
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
      }
      if (request.method === "GET" && url.pathname === "/api/card") {
        send(200, personCard(requireCore(), url.searchParams.get("id") ?? ""));
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/government/state"
      ) {
        send(200, {
          states: politicsStates(),
          legislators: stateLegislators(
            requireCore(),
            url.searchParams.get("state") ?? "",
            url.searchParams.get("level") === "federal" ? "federal" : "state",
          ),
        });
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/government/local-races"
      ) {
        send(200, localRaces(requireCore()));
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/government/bodies"
      ) {
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
      }
      if (request.method === "GET" && url.pathname === "/api/government") {
        send(
          200,
          governmentView(requireCore(), url.searchParams.get("id") ?? ""),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/party/join") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          joinPartyAs(
            requireCore(),
            player.personId,
            url.searchParams.get("partyId") ?? "",
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/file") {
        if (!player?.personId) throw new Error("Choose a resident first.");
        send(
          200,
          fileForOffice(
            requireCore(),
            player.personId,
            url.searchParams.get("contestId") ?? "",
          ),
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/advance") {
        if (!player) throw new Error("Generate a town first.");
        const result = player.advance(
          url.searchParams.get("mode") ?? "day",
          url.searchParams.get("date") ?? undefined,
        );
        send(200, {
          ...result,
          names: namesFor(result.packet),
          progress: benchProgress(requireCore(), placeId, player?.personId),
          pollingPlace: player.pollingPlace
            ? pollingScene(requireCore(), player.pollingPlace)
            : null,
          candidateMorning: player.candidateMorning ?? null,
        });
        return;
      }
      // Election morning: what the day holds, the canvass for a candidate,
      // and the choice to vote.
      if (request.method === "GET" && url.pathname === "/api/election-day") {
        const visit = player?.pollingPlace;
        const date = visit?.record.electionDate ?? player?.candidateMorning;
        send(
          200,
          date && player?.personId
            ? {
                ...electionDay(
                  requireCore(),
                  player.personId,
                  visit ?? null,
                  canvassedOn.has(`${player.personId}|${date}`),
                  date,
                ),
                // The card shows election morning, not the midnight the
                // clock stopped at to ask.
                at: { date, minuteOfDay: player.dayStartMinute() },
              }
            : null,
        );
        return;
      }
      // A candidate's morning with no ballot here: done once they go on.
      if (
        request.method === "POST" &&
        url.pathname === "/api/election-day/done"
      ) {
        if (player) player.candidateMorning = undefined;
        send(200, { ok: true });
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/election-day/canvass"
      ) {
        const visit = player?.pollingPlace;
        const date = visit?.record.electionDate ?? player?.candidateMorning;
        if (!date || !player?.personId)
          throw new Error("There is no election today.");
        const day = electionDay(
          requireCore(),
          player.personId,
          visit ?? null,
          false,
          date,
        );
        if (!day.canvass) throw new Error("You aren't on the ballot today.");
        const result = campaignDay(requireCore(), player.personId, {
          filingId: day.canvass.filingId,
          kind: "canvass",
        });
        canvassedOn.add(`${player.personId}|${date}`);
        send(200, {
          line: canvassedLine(
            requireCore(),
            player.personId,
            date,
            day.canvass.filingId,
            result,
          ),
          scene: result.scene ?? null,
        });
        return;
      }
      // Election day at the polls: the ballot, marked race by race, or left.
      if (request.method === "GET" && url.pathname === "/api/polling-place") {
        send(
          200,
          player?.pollingPlace
            ? pollingScene(requireCore(), player.pollingPlace)
            : null,
        );
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/polling-place/mark"
      ) {
        if (!player) throw new Error("Generate a town first.");
        const record = player.markBallot(
          url.searchParams.get("contestId") ?? "",
          url.searchParams.get("candidateId") || null,
        );
        send(200, {
          record,
          pollingPlace: player.pollingPlace
            ? pollingScene(requireCore(), player.pollingPlace)
            : null,
        });
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/polling-place/leave"
      ) {
        if (!player) throw new Error("Generate a town first.");
        const date = player.pollingPlace?.record.electionDate;
        const record = player.leavePolls();
        send(200, {
          record,
          pollingPlace: null,
          // Staying home without marking anything: no ballot is cast.
          line:
            date && player.personId && !Object.keys(record.marked).length
              ? stayedHomeLine(
                  requireCore(),
                  player.personId,
                  date,
                  record.contestIds,
                )
              : null,
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/resume") {
        if (!player) throw new Error("Generate a town first.");
        const pauseId = url.searchParams.get("pauseId") ?? "";
        const result = player.resume({ kind: "stop", pauseId });
        send(200, {
          ...result,
          names: namesFor(result.packet),
          progress: benchProgress(requireCore(), placeId, player?.personId),
          pollingPlace: player.pollingPlace
            ? pollingScene(requireCore(), player.pollingPlace)
            : null,
          candidateMorning: player.candidateMorning ?? null,
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/play") {
        if (!player) throw new Error("Generate a town first.");
        const id = url.searchParams.get("id") ?? "";
        personOrFillIn(requireCore(), id);
        player.select(id);
        if (conversation?.playerId !== player.personId)
          conversation = undefined;
        send(200, {
          personId: player.personId,
          packet: player.packet,
          selfChosen: player.selfChosen.slice(-50),
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/build") {
        if (building) throw new Error("Opening generation is already running.");
        const seed = url.searchParams.get("seed") ?? "";
        const date = gameStartDate();
        // Stopgap SG-PLAY-bench-town-size: a smaller town plays at a usable
        // speed until the core's two-level population and speed work land.
        const size = Number(url.searchParams.get("size") ?? "") || undefined;
        building = true;
        try {
          // Two-level, as "New life" builds it (MEMORY-FLAT): a month of the
          // full population ran the bench out of memory. Tests that need every
          // resident as a full person ask for it with full=1.
          const world = buildBenchWorld(seed, date, {
            minimumPeople: size,
            twoLevel: url.searchParams.get("full") !== "1",
          });
          opening = undefined;
          const { place, residents } = world;
          const next = world.core,
            nextDirector = world.director;
          core = next;
          director = nextDirector;
          player = new BenchPlayer(next, nextDirector);
          conversation = undefined;
          placeId = place.context.jurisdiction.id;
          placeName = place.displayName;
          send(200, {
            seed: core.seed,
            date: core.date,
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
            gaps: [...core.gaps],
          });
        } finally {
          building = false;
        }
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/seed") {
        send(200, {
          seed: randomUUID(),
          date: gameStartDate(),
        });
        return;
      }
      send(404, { error: "Unknown bench route." });
    })();
  } catch (error) {
    send(400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return reply;
}
