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
import {
  canvassedLine,
  electionDay,
  electionNight,
  resultMomentOf,
  stayedHomeLine,
} from "./election-night";
import { pollingScene } from "./polling";
import { namesFor, requireCore, state, type Route } from "./server-state";

/** The campaign routes, tried in this order. */
export const campaignRoutes: readonly Route[] = [
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
      request.method === "GET" && url.pathname === "/api/campaign",
    run: async ({ url, send }) => {
      send(200, campaignView(requireCore(), url.searchParams.get("id") ?? ""));
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
