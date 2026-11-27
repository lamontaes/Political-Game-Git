// The elections screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.
import { electionResults } from "../results";
import {
  electionNight,
  resultMomentOf,
  electionDay,
  canvassedLine,
  stayedHomeLine,
} from "../election-night";
import { campaignDay } from "../campaign";
import { pollingScene } from "../polling";
import {
  Route,
  RouteContext,
  ServerState,
  requireCore,
  state,
} from "../session-state";

export const electionsRoutes: readonly Route[] = [
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
];
