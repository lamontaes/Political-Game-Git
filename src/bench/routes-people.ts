import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { personOrFillIn } from "../core2/state";
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
import { bankView } from "./bank";
import { knownCard, personCard } from "./card";
import {
  ageAtStart,
  birthYears,
  creatorRandomPlace,
  creatorStates,
  creatorTowns,
  drawBirthday,
  drawName,
} from "./creator";
import { seatAct, seatView } from "./legislature";
import { governmentMap } from "./map";
import {
  meetingAdjourn,
  meetingItem,
  meetingSceneView,
  meetingSpeak,
} from "./office";
import { requireCore, state, type Route } from "./server-state";
import { TITLE_ROTATE_SECONDS, titleRotation } from "./title";

/** The people routes, tried in this order. */
export const peopleRoutes: readonly Route[] = [
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
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/portrait",
    run: async ({ url, response }) => {
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
              portrait: Boolean(
                state.core!.people.get(personId)?.looks?.recipe,
              ),
              // The face the creator saved, for Continue's headshot.
              face: state.core!.people.get(personId)?.looks?.recipe
                ? portraitFace(
                    readRecipe(
                      state.core!.people.get(personId)!.looks!.recipe!,
                    ),
                    `/api/portrait?id=${encodeURIComponent(personId)}`,
                  )
                : null,
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
      request.method === "GET" && url.pathname === "/api/bank",
    run: async ({ url, send }) => {
      send(200, bankView(requireCore(), url.searchParams.get("id") ?? ""));
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
      request.method === "GET" && url.pathname === "/api/card",
    run: async ({ url, send }) => {
      send(200, personCard(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    },
  },
];
