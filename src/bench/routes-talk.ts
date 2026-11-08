import { personOrFillIn } from "../core2/state";
import { openConversation, say, sayNothing } from "../director/conversation";
import { composeJournal } from "../director/journal";
import { SITUATION_LIBRARY } from "../director/scheduling";
import { OPENING_EVENING_MINUTE, openingFrames } from "./opening";
import {
  gapMarker,
  requireCore,
  sceneNow,
  state,
  talkView,
  type Route,
} from "./server-state";
import { storyReply, storyScene } from "./story";

/** The talk routes, tried in this order. */
export const talkRoutes: readonly Route[] = [
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
      state.conversation = openConversation(
        requireCore(),
        state.player.personId,
        otherId,
        state.director
          ? { director: state.director, ...(occasionId ? { occasionId } : {}) }
          : {},
      );
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
      state.conversation = undefined;
      send(200, {});
      return;
    },
  },
  {
    match: ({ request, url }) =>
      request.method === "GET" && url.pathname === "/api/journal",
    run: async ({ url, send }) => {
      if (!state.director) throw new Error("Generate a town first.");
      send(
        200,
        composeJournal(
          requireCore(),
          state.director,
          url.searchParams.get("id") ?? "",
          // The player's own journal reads to their clock, which stands at
          // the start of a day the core has yet to run (a birthday morning).
          state.player?.packet &&
            state.player.personId === url.searchParams.get("id")
            ? { through: state.player.packet.at.date }
            : {},
        ),
      );
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
        allowed: filter?.allowedKinds ?? null,
        ...(filter ? { recordId: filter.id } : {}),
      });
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
];
